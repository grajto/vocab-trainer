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
        issue_type: 'missing_phrase',
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
        issue_type: 'missing_phrase',
        message_pl: `Zdanie nie zawiera wymaganego zwrotu: "${targetPhrase}".`,
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        issue_type: 'other',
        message_pl: 'Brak konfiguracji AI (OPENAI_API_KEY).',
        suggested_fix: null,
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    try {
      const startedAt = Date.now()
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const meaningContext = promptPl
        ? ` Polskie znaczenie: "${promptPl}". Zdanie musi pokazywać poprawne użycie słowa/zwrotu.`
        : ''

      console.info('[AI] calling OpenAI')
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: `Jesteś surowym nauczycielem języka angielskiego. Twoim zadaniem jest ocenić zdanie ucznia.
Sprawdź:
1) Czy to jest prawdziwe zdanie po angielsku (nie zlepek słów)?
2) Czy użycie "${targetPhrase}" jest poprawne gramatycznie?
3) Czy zdanie jest naturalne jako przykład użycia?
4) Czy znaczenie pasuje do "${promptPl ?? ''}"?${meaningContext}
Zwróć WYŁĄCZNIE JSON w formacie:
{"ok":true/false,"issue_type":null|"not_a_sentence"|"grammar"|"usage"|"meaning_mismatch"|"missing_phrase"|"other","message_pl":null|string,"suggested_fix":null|string}
Jeśli ok=true, ustaw issue_type=null i NIE dodawaj message_pl ani suggested_fix.`,
          },
          {
            role: 'user',
            content: `requiredEn: ${targetPhrase}\nsentence: ${trimmed}`,
          },
        ],
      })

      const content = completion.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('Empty AI response')
      }
      const cleaned = content.replace(/```json\\s*/g, '').replace(/```\\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)
      const aiLatencyMs = Date.now() - startedAt
      console.info('[AI] result', parsed)
      return NextResponse.json({
        ok: !!parsed.ok,
        issue_type: parsed.issue_type ?? null,
        message_pl: parsed.message_pl ?? '',
        suggested_fix: parsed.suggested_fix ?? null,
        ai_used: true,
        ai_latency_ms: aiLatencyMs,
      })
    } catch (err) {
      console.error('OpenAI call failed:', err)
      return NextResponse.json({
        ok: false,
        issue_type: 'other',
        message_pl: 'AI nie zwróciło poprawnej odpowiedzi. Spróbuj ponownie.',
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
