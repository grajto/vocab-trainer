import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Collapse whitespace and lowercase for phrase containment check */
function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { phrase, requiredPhrase, sentence, promptPl } = body
    // Support both field names for backwards compat
    const targetPhrase = phrase || requiredPhrase

    if (!targetPhrase) {
      return NextResponse.json({
        ok: false,
        issue_type: 'usage',
        message_pl: 'Brak wymaganej frazy do sprawdzenia.',
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    if (!sentence || !sentence.trim()) {
      return NextResponse.json({
        ok: false,
        issue_type: 'not_a_sentence',
        message_pl: 'Zdanie nie może być puste.',
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    const trimmed = sentence.trim()

    // Pre-AI validation: length
    if (trimmed.length < 8) {
      return NextResponse.json({
        ok: false,
        issue_type: 'not_a_sentence',
        message_pl: 'Zdanie jest za krótkie (min. 8 znaków).',
        ai_used: false,
        ai_latency_ms: 0,
      })
    }
    if (trimmed.length > 240) {
      return NextResponse.json({
        ok: false,
        issue_type: 'other',
        message_pl: 'Zdanie jest za długie (max 240 znaków).',
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    // Pre-AI validation: phrase containment (case-insensitive, collapsed whitespace)
    if (!norm(trimmed).includes(norm(targetPhrase))) {
      return NextResponse.json({
        ok: false,
        issue_type: 'usage',
        message_pl: `Zdanie nie zawiera wymaganego zwrotu: "${targetPhrase}".`,
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI] Missing OPENAI_API_KEY')
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    try {
      const startedAt = Date.now()
      const apiKey = process.env.OPENAI_API_KEY
      const openai = new OpenAI({
        apiKey,
        organization: process.env.OPENAI_ORG,
        project: process.env.OPENAI_PROJECT,
      })
      const keyPrefix = apiKey ? `${apiKey.slice(0, 6)}***` : 'missing'
      console.info('[AI] env', {
        hasKey: !!apiKey,
        keyPrefix,
        keyLength: apiKey?.length ?? 0,
        org: process.env.OPENAI_ORG || null,
        project: process.env.OPENAI_PROJECT || null,
        baseURL: (openai as unknown as { baseURL?: string }).baseURL || 'default',
      })

      const meaningContext = promptPl
        ? `PL znaczenie: "${promptPl}".`
        : ''

      console.info('[AI] calling OpenAI', { model: 'gpt-5-nano' })
      const shortPrompt = `Oceń zdanie ucznia. Sprawdź: poprawność zdania, poprawne użycie "${targetPhrase}", sens znaczeniowy, brak spamu.
Zwróć WYŁĄCZNIE krótki JSON:
{"ok":true/false,"issue_type":"not_a_sentence"|"grammar"|"usage"|"meaning"|"spam"|"other","message_pl":string,"suggested_fix":string|null}
Zasady: message_pl max 200 znaków, suggested_fix max 120 znaków. Jeśli ok=true: issue_type="other", message_pl="OK", suggested_fix=null.`
      const shorterPrompt = `JSON only:
{"ok":true/false,"issue_type":"not_a_sentence"|"grammar"|"usage"|"meaning"|"spam"|"other","message_pl":string,"suggested_fix":string|null}
message_pl<=200 chars, suggested_fix<=120 chars.`
      const messages = [
        {
          role: 'system',
          content: shortPrompt,
        },
        {
          role: 'user',
          content: `requiredEn: ${targetPhrase}\n${meaningContext}\nsentence: ${trimmed}`,
        },
      ] satisfies Array<{ role: 'system' | 'user'; content: string }>

      // Keep logs compact while showing enough context from truncated JSON responses.
      const PREVIEW_LENGTH = 200
      const makeCompletion = (maxTokens: number, useShorter: boolean) =>
        openai.chat.completions.create({
          model: 'gpt-5-nano',
          max_completion_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: useShorter ? [
            { role: 'system', content: shorterPrompt },
            { role: 'user', content: `requiredEn: ${targetPhrase}\n${meaningContext}\nsentence: ${trimmed}` },
          ] : messages,
        })

      let completion = await makeCompletion(300, false)
      let content = completion.choices?.[0]?.message?.content ?? ''
      let finishReason = completion.choices?.[0]?.finish_reason
      console.info('[AI] completion keys', Object.keys(completion || {}))
      const responseHeaders = (completion as unknown as { response?: { headers?: Record<string, string> } }).response?.headers
      if (responseHeaders) {
        console.info('[AI] response headers', {
          requestId: responseHeaders['x-request-id'] || responseHeaders['request-id'] || null,
        })
      }

      if (finishReason === 'length') {
        const preview = content.trim().slice(0, PREVIEW_LENGTH)
        console.warn('[AI] response truncated, retrying', { finish_reason: finishReason, preview })
        completion = await makeCompletion(600, !content.trim())
        content = completion.choices?.[0]?.message?.content ?? ''
        finishReason = completion.choices?.[0]?.finish_reason
      }

      if (!content.trim()) {
        console.error('[AI] empty response', { finish_reason: finishReason })
        throw new Error('Empty AI response')
      }
      let parsed: any
      try {
        parsed = JSON.parse(content.trim())
      } catch (parseError) {
        if (finishReason === 'length') {
          console.error('[AI] response truncated after retry', { finish_reason: finishReason })
          throw new Error('AI response truncated')
        }
        console.error('[AI] JSON parse failed', parseError)
        throw parseError
      }
      const rawIssueType = typeof parsed.issue_type === 'string' ? parsed.issue_type : 'other'
      const issueTypeMap: Record<string, string> = {
        not_a_sentence: 'not_a_sentence',
        grammar: 'grammar',
        usage: 'usage',
        meaning: 'meaning',
        meaning_mismatch: 'meaning',
        missing_phrase: 'usage',
        spam: 'spam',
        other: 'other',
      }
      const normalizedIssueType = issueTypeMap[rawIssueType] ?? 'other'
      const normalizedOk = typeof parsed.ok === 'boolean' ? parsed.ok : false
      const aiLatencyMs = Date.now() - startedAt
      console.info('[AI] result', parsed)
      const message = parsed.message_pl ?? ''
      return NextResponse.json({
        ok: normalizedOk,
        issue_type: normalizedIssueType,
        message_pl: normalizedOk ? (message || 'OK') : message,
        suggested_fix: parsed.suggested_fix ?? null,
        ai_used: true,
        ai_latency_ms: aiLatencyMs,
      })
    } catch (err: unknown) {
      console.error('OpenAI call failed:', err)
      const status = (err as { status?: number }).status
      const code = (err as { code?: string }).code
      const isQuota = status === 429 || code === 'insufficient_quota'
      return NextResponse.json({
        ok: false,
        issue_type: 'other',
        message_pl: isQuota
          ? 'Limit AI został wyczerpany. Sprawdź billing lub spróbuj później.'
          : 'AI nie zwróciło poprawnej odpowiedzi. Spróbuj ponownie.',
        suggested_fix: null,
        ai_used: true,
        ai_latency_ms: 0,
      })
    }
  } catch (error: unknown) {
    console.error('Check sentence error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
