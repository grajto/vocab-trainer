import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import { buildCheckSentenceResponse, parseCheckSentenceResponse } from '@/src/lib/ai/checkSentenceSchema'
import { createOpenAIClient, logOpenAIEnv } from '@/src/lib/ai/openaiClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL = 'gpt-5-nano'
const PRIMARY_MAX_OUTPUT_TOKENS = 300
const RETRY_MAX_OUTPUT_TOKENS = 300
const PREVIEW_LENGTH = 200

/** Collapse whitespace and lowercase for phrase containment check */
function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getFallbackCorrected(sentence: string, targetPhrase?: string) {
  return sentence.trim() || targetPhrase?.trim() || '[brak zdania]'
}

const SYSTEM_PROMPT = `Zwróć WYŁĄCZNIE minifikowany JSON o strukturze:
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}
Zasady:
- errors maks 5 elementów
- comment maks 200 znaków
- corrected zawsze niepuste
- jeśli ok=true, corrected musi być identyczne jak input
- brak dodatkowych kluczy, brak markdown
Typy błędów: grammar | usage | meaning | spam | other.`

const RETRY_PROMPT = `JSON only:
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}
errors<=5, comment<=200, corrected!=empty, ok=true => corrected=input.`

function extractResponseMeta(response: unknown) {
  const typed = response as {
    output_text?: string
    output?: Array<{ type?: string; content?: Array<{ type?: string }> }>
    incomplete_details?: { reason?: string }
  }
  const finishReason = typed.incomplete_details?.reason || null
  const output = typed.output ?? []
  const hasToolCalls = output.some(item => item.type === 'tool_call' || item.type === 'function_call')
  const outputTypes = output.map(item => item.type ?? 'unknown')
  const outputContentTypes = output.map(item => (item.content ?? []).map(content => content.type ?? 'unknown'))
  const outputTextLength = typed.output_text?.length ?? 0
  return { finishReason, hasToolCalls, outputTypes, outputContentTypes, outputTextLength, outputLength: output.length }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '[brak zdania]',
        errors: [{ type: 'other', from: '', to: '', explain: 'Unauthorized' }],
        comment: 'Unauthorized',
      }), { status: 401 })
    }

    const body = await req.json()
    const { phrase, requiredPhrase, sentence, promptPl } = body
    // Support both field names for backwards compat
    const targetPhrase = phrase || requiredPhrase

    if (!targetPhrase) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(sentence || '', targetPhrase),
        errors: [{ type: 'usage', from: '', to: '', explain: 'Brak wymaganej frazy do sprawdzenia.' }],
        comment: 'Brak wymaganej frazy do sprawdzenia.',
      }))
    }

    if (!sentence || !sentence.trim()) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(sentence || '', targetPhrase),
        errors: [{ type: 'grammar', from: '', to: '', explain: 'Zdanie nie może być puste.' }],
        comment: 'Zdanie nie może być puste.',
      }))
    }

    const trimmed = sentence.trim()

    // Pre-AI validation: length
    if (trimmed.length < 8) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(trimmed, targetPhrase),
        errors: [{ type: 'grammar', from: trimmed, to: trimmed, explain: 'Zdanie jest za krótkie (min. 8 znaków).' }],
        comment: 'Zdanie jest za krótkie (min. 8 znaków).',
      }))
    }
    if (trimmed.length > 240) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(trimmed, targetPhrase),
        errors: [{ type: 'other', from: trimmed, to: trimmed, explain: 'Zdanie jest za długie (max 240 znaków).' }],
        comment: 'Zdanie jest za długie (max 240 znaków).',
      }))
    }

    // Pre-AI validation: phrase containment (case-insensitive, collapsed whitespace)
    if (!norm(trimmed).includes(norm(targetPhrase))) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(trimmed, targetPhrase),
        errors: [{ type: 'usage', from: trimmed, to: trimmed, explain: `Zdanie nie zawiera wymaganego zwrotu: "${targetPhrase}".` }],
        comment: `Zdanie nie zawiera wymaganego zwrotu: "${targetPhrase}".`,
      }))
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI] Missing OPENAI_API_KEY')
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(trimmed, targetPhrase),
        errors: [{ type: 'other', from: '', to: '', explain: 'Missing OPENAI_API_KEY' }],
        comment: 'Missing OPENAI_API_KEY',
      }), { status: 500 })
    }

    try {
      const { client: openai, apiKey, baseURL } = createOpenAIClient()
      logOpenAIEnv({ client: openai, apiKey, baseURL })

      const meaningContext = promptPl
        ? `PL znaczenie: "${promptPl}".`
        : ''

      console.info('[AI] calling OpenAI', { model: MODEL })
      const userContent = `requiredEn: ${targetPhrase}\n${meaningContext}\nsentence: ${trimmed}`

      const runRequest = async (prompt: string, maxTokens: number) => {
        console.info('[AI] request config', {
          apiType: 'responses',
          max_output_tokens: maxTokens,
          max_tokens: null,
        })
        const response = await openai.responses.create({
          model: MODEL,
          max_output_tokens: maxTokens,
          tool_choice: 'none',
          input: [
            { role: 'system', content: prompt },
            { role: 'user', content: userContent },
          ],
        })
        const text = (response.output_text ?? '').trim()
        let fallbackText = ''
        if (!text) {
          const output = response.output ?? []
          fallbackText = output
            .flatMap(item => item.content ?? [])
            .filter(content => content.type === 'output_text')
            .map(content => ('text' in content ? String(content.text ?? '') : ''))
            .join('')
            .trim()
        }
        const finalText = text || fallbackText
        const {
          finishReason,
          hasToolCalls,
          outputTypes,
          outputContentTypes,
          outputTextLength,
          outputLength,
        } = extractResponseMeta(response)
        console.info('[AI] response meta', {
          finish_reason: finishReason,
          output_text_length: outputTextLength,
          text_length: finalText.length,
          output_length: outputLength,
          output_types: outputTypes,
          output_content_types: outputContentTypes,
          has_tool_calls: hasToolCalls,
          has_text: finalText.length > 0,
        })
        const responseHeaders = (response as unknown as { response?: { headers?: Record<string, string> } }).response?.headers
        if (responseHeaders) {
          console.info('[AI] response headers', {
            requestId: responseHeaders['x-request-id'] || responseHeaders['request-id'] || null,
          })
        }
        return { text: finalText, finishReason, hasToolCalls }
      }

      const attempts = [
        { prompt: SYSTEM_PROMPT, maxTokens: PRIMARY_MAX_OUTPUT_TOKENS },
        { prompt: RETRY_PROMPT, maxTokens: RETRY_MAX_OUTPUT_TOKENS },
      ]

      let lastError: string | null = null
      for (let attempt = 0; attempt < attempts.length; attempt++) {
        const { prompt, maxTokens } = attempts[attempt]
        const { text, finishReason, hasToolCalls } = await runRequest(prompt, maxTokens)
        const preview = text.slice(0, PREVIEW_LENGTH)

        if (finishReason === 'length' || !text) {
          lastError = finishReason === 'length' ? 'finish_reason=length' : 'empty_text'
          console.warn('[AI] response truncated or empty, retrying', { attempt, finish_reason: finishReason, preview })
          continue
        }

        if (hasToolCalls) {
          lastError = 'tool_calls_present'
          console.warn('[AI] tool calls detected, retrying', { attempt })
          continue
        }

        try {
          const parsed = parseCheckSentenceResponse(text, trimmed)
          return NextResponse.json(parsed)
        } catch (parseError) {
          lastError = (parseError as Error).message
          console.warn('[AI] JSON parse/validation failed, retrying', { attempt, error: lastError, preview })
          continue
        }
      }

      if (lastError?.includes('length') || lastError?.includes('empty_text')) {
        return NextResponse.json({
          error: 'AI_TRUNCATED',
          detail: lastError || 'Response truncated or empty after retries.',
        }, { status: 502 })
      }

      return NextResponse.json({
        error: 'AI_INVALID_JSON',
        detail: lastError || 'Invalid AI response after retries.',
      }, { status: 502 })
    } catch (err: unknown) {
      console.error('OpenAI call failed:', err)
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: getFallbackCorrected(trimmed, targetPhrase),
        errors: [{ type: 'other', from: '', to: '', explain: 'AI nie zwróciło poprawnej odpowiedzi. Spróbuj ponownie.' }],
        comment: 'AI nie zwróciło poprawnej odpowiedzi. Spróbuj ponownie.',
      }), { status: 502 })
    }
  } catch (error: unknown) {
    console.error('Check sentence error:', error)
    return NextResponse.json(buildCheckSentenceResponse({
      ok: false,
      corrected: '[brak zdania]',
      errors: [{ type: 'other', from: '', to: '', explain: 'Internal server error' }],
      comment: 'Internal server error',
    }), { status: 500 })
  }
}
