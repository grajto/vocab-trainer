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

/** Collapse whitespace and lowercase for phrase containment check */
function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

const SYSTEM_PROMPT = `Return ONLY minified JSON:
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}
Rules:
- Use English only (B2 level), short teacher-style feedback.
- comment: 1-2 short sentences, max 200 chars.
- errors: max 5 items.
- For ok=true: corrected must equal input sentence.
- For ok=false: corrected must be an empty string.
- No markdown, no extra keys.
Error types: grammar | usage | meaning | spelling | punctuation | style | other.`

const RETRY_PROMPT = `JSON ONLY. English B2 feedback.
{"ok":boolean,"corrected":string,"errors":[{"type":string,"from":string,"to":string,"explain":string}],"comment":string}
If ok=false then corrected="". If ok=true then corrected=input.
comment<=200, errors<=5, no extra keys.`

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

    if (!norm(trimmed).includes(norm(targetPhrase))) {
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

      const meaningContext = promptPl ? `PL znaczenie: "${promptPl}".` : ''

      console.info('[AI] calling OpenAI', { model: MODEL })
      const userContent = `requiredEn: ${targetPhrase}\n${meaningContext}\nsentence: ${trimmed}`

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
