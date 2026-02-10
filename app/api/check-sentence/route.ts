import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import { buildCheckSentenceResponse, parseCheckSentenceResponse } from '@/src/lib/ai/checkSentenceSchema'
import { createOpenAIClient, logOpenAIEnv } from '@/src/lib/ai/openaiClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL = 'gpt-5-nano'
const PRIMARY_MAX_OUTPUT_TOKENS = 900
const RETRY_MAX_OUTPUT_TOKENS = 1200
const PREVIEW_LENGTH = 200

const RESPONSE_JSON_SCHEMA = {
  name: 'check_sentence_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'corrected', 'errors', 'comment'],
    properties: {
      ok: { type: 'boolean' },
      corrected: { type: 'string' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'from', 'to', 'explain'],
          properties: {
            type: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            explain: { type: 'string' },
          },
        },
      },
      comment: { type: 'string' },
    },
  },
  strict: true,
} as const

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

function hasRequiredWord(sentence: string, required: string): boolean {
  return norm(sentence).includes(norm(required))
}

function hasLikelyGibberishToken(sentence: string, required: string): boolean {
  const requiredNorm = norm(required)
  const tokens = (sentence.toLowerCase().match(/[a-z]+/g) ?? []).filter(Boolean)

  for (const token of tokens) {
    if (token === requiredNorm) continue
    if (token.length <= 2) continue

    const uniqueRatio = new Set(token).size / token.length
    const hasLongConsonantRun = /[bcdfghjklmnpqrstvwxyz]{5,}/.test(token)

    if (token.length >= 7 && uniqueRatio < 0.45) return true
    if (hasLongConsonantRun) return true
  }

  return false
}

function isMinorExplain(explain: string): boolean {
  const e = explain.toLowerCase()
  return (
    e.includes('capitalization') ||
    e.includes('uppercase') ||
    e.includes('lowercase') ||
    e.includes('final dot') ||
    e.includes('missing period') ||
    e.includes('punctuation') ||
    e.includes('comma') ||
    e.includes('article') ||
    e.includes('small style') ||
    e.includes('minor style')
  )
}

function isClearlyBadForAutoPass(
  parsed: { errors: Array<{ type: string; explain: string }> },
  sentence: string,
  required: string,
): boolean {
  if (!hasRequiredWord(sentence, required)) return true

  const words = sentence.toLowerCase().match(/[a-z]+/g) ?? []
  if (words.length < 3) return true
  if (hasLikelyGibberishToken(sentence, required)) return true

  const severeTypes = new Set(['usage', 'meaning', 'spam'])
  const spellingErrors = parsed.errors.filter(err => (err.type || '').toLowerCase() === 'spelling')

  if (spellingErrors.length >= 2) return true

  for (const err of parsed.errors) {
    const t = (err.type || '').toLowerCase()
    const ex = (err.explain || '').toLowerCase()

    if (severeTypes.has(t)) return true
    if (ex.includes('does not contain') || ex.includes('missing required')) return true
    if (ex.includes('incomplete input')) return true
    if (ex.includes('unintelligible') || ex.includes('gibberish') || ex.includes('nonsense') || ex.includes('non-word')) return true
  }

  // Allow auto-pass only when errors are minor and mostly style/punctuation/article level.
  return !parsed.errors.every(err => {
    const t = (err.type || '').toLowerCase()
    if (t === 'style' || t === 'punctuation') return true
    if (t === 'grammar' && isMinorExplain(err.explain || '')) return true
    return false
  })
}

const SYSTEM_PROMPT = `You are an English teacher AI.

Evaluate the user's sentence quality in a practical way.
Return ONLY minified JSON:
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}

Rules:
- Use English only (B1-B2).
- Be short, clear, teacher-like.
- comment: 1-2 short sentences, max 300 chars.
- errors: max 5 items.
- If ok=true: corrected MUST equal input sentence exactly.
- If ok=false: corrected MUST be an empty string.
- Ignore missing final dot and capitalization at sentence start.
- Accept understandable grammar; do not fail for small style issues.
- Point out exact mistakes (e.g. spelling: "greeen" -> "green").
- Never write meta-comments like "task expects corrected".
- Error types: grammar, usage, meaning, spelling, punctuation, style, other.
- No markdown. No extra keys.`

const RETRY_PROMPT = `JSON ONLY.
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}
English B1-B2. Ignore capitalization and final punctuation.
If ok=true corrected=input. If ok=false corrected="".
comment<=300, errors<=5, no extra keys.`

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

function hasContent(item: unknown): item is { content: Array<{ type: string; text?: string }> } {
  return !!item && typeof item === 'object' && 'content' in item && Array.isArray((item as { content?: unknown }).content)
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'other', from: '', to: '', explain: 'Unauthorized' }],
        comment: 'Unauthorized',
      }), { status: 401 })
    }

    const body = await req.json()
    const { phrase, requiredPhrase, sentence, promptPl } = body
    const targetPhrase = phrase || requiredPhrase

    if (!targetPhrase) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'usage', from: '', to: '', explain: 'Missing required word to validate.' }],
        comment: 'Missing required word to validate.',
      }))
    }

    if (!sentence || !sentence.trim()) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'grammar', from: '', to: '', explain: 'Sentence cannot be empty.' }],
        comment: 'Sentence cannot be empty.',
      }))
    }

    const trimmed = sentence.trim()

    if (trimmed.length < 8) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'grammar', from: trimmed, to: trimmed, explain: 'Sentence is too short (minimum 8 characters).' }],
        comment: 'Sentence is too short (minimum 8 characters).',
      }))
    }
    if (trimmed.length > 240) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'other', from: trimmed, to: trimmed, explain: 'Sentence is too long (maximum 240 characters).' }],
        comment: 'Sentence is too long (maximum 240 characters).',
      }))
    }

    if (!hasRequiredWord(trimmed, targetPhrase)) {
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'usage', from: trimmed, to: trimmed, explain: `The sentence must include this required word: "${targetPhrase}".` }],
        comment: `The sentence must include this required word: "${targetPhrase}".`,
      }))
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI] Missing OPENAI_API_KEY')
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'other', from: '', to: '', explain: 'Missing OPENAI_API_KEY' }],
        comment: 'Missing OPENAI_API_KEY',
      }), { status: 500 })
    }

    try {
      const { client: openai, apiKey, baseURL } = createOpenAIClient()
      logOpenAIEnv({ client: openai, apiKey, baseURL })

      console.info('[AI] calling OpenAI', { model: MODEL })
      const userContent = JSON.stringify({
        mode: 'sentence',
        targetWord: targetPhrase,
        promptPl: promptPl || '',
        userAnswer: trimmed,
      })

      const runRequest = async (prompt: string, maxTokens: number) => {
        console.info('[AI] request config', {
          apiType: 'responses',
          max_output_tokens: maxTokens,
          reasoning_effort: 'minimal',
          response_format: 'json_schema',
        })

        const response = await openai.responses.create({
          model: MODEL,
          max_output_tokens: maxTokens,
          tool_choice: 'none',
          reasoning: { effort: 'minimal' },
          text: { format: { type: 'json_schema', ...RESPONSE_JSON_SCHEMA } },
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
            .flatMap(item => (hasContent(item) ? item.content : []))
            .filter(content => content.type === 'output_text')
            .map(content => String(content.text ?? ''))
            .join('')
            .trim()
        }

        const finalText = text || fallbackText
        const { finishReason, hasToolCalls, outputTypes, outputContentTypes, outputTextLength, outputLength } = extractResponseMeta(response)

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

        const wasTruncated = finishReason === 'length' || finishReason === 'max_output_tokens'
        if (wasTruncated || !text) {
          lastError = wasTruncated ? `finish_reason=${finishReason}` : 'empty_text'
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
          if (!parsed.ok) {
            parsed.corrected = ''
            if (!isClearlyBadForAutoPass(parsed, trimmed, targetPhrase)) {
              parsed.ok = true
              parsed.errors = []
              parsed.comment = 'Good sentence. Minor style mistakes were ignored.'
              parsed.corrected = trimmed
            }
          }
          return NextResponse.json(parsed)
        } catch (parseError) {
          lastError = (parseError as Error).message
          console.warn('[AI] JSON parse/validation failed, retrying', { attempt, error: lastError, preview })
          continue
        }
      }

      console.error('[AI] final failure', { lastError })
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'other', from: '', to: '', explain: 'AI could not validate this sentence now. Please try again.' }],
        comment: 'AI could not validate this sentence now. Please try again.',
      }), { status: 502 })
    } catch (err: unknown) {
      console.error('OpenAI call failed:', err)
      return NextResponse.json(buildCheckSentenceResponse({
        ok: false,
        corrected: '',
        errors: [{ type: 'other', from: '', to: '', explain: 'AI could not validate this sentence now. Please try again.' }],
        comment: 'AI could not validate this sentence now. Please try again.',
      }), { status: 502 })
    }
  } catch (error: unknown) {
    console.error('Check sentence error:', error)
    return NextResponse.json(buildCheckSentenceResponse({
      ok: false,
      corrected: '',
      errors: [{ type: 'other', from: '', to: '', explain: 'Internal server error' }],
      comment: 'Internal server error',
    }), { status: 500 })
  }
}
