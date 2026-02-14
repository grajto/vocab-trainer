import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { word, description, meaningPl } = body

    if (!word) {
      return NextResponse.json({
        ok: false,
        issue_type: 'usage',
        message_pl: 'Brak słowa do opisania.',
        ai_used: false,
        ai_latency_ms: 0,
      })
    }

    if (!description || !description.trim()) {
      return NextResponse.json({
        ok: false,
        issue_type: 'not_a_sentence',
        message_pl: 'Opis nie może być pusty.',
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
      const meaningContext = meaningPl ? `PL znaczenie: "${meaningPl}".` : ''

      const messages = [
        {
          role: 'system',
          content: `Tryb described: użytkownik MA OPISAĆ znaczenie słowa (definicja/opis), a nie ułożyć przypadkowe zdanie.

Oceń opis słowa pod kątem:
1) czy sens jest poprawny (nawet jeśli są drobne błędy gramatyczne),
2) czy użytkownik próbuje opisać znaczenie (a nie pisze losowe zdanie bez definicji),
3) bądź TOLERANCYJNY - zaakceptuj każdy opis który ma sens i odnosi się do znaczenia słowa.

Zwróć WYŁĄCZNIE JSON:
{"ok":true/false,"issue_type":"meaning"|"not_definition"|"spam"|"other","message_pl":string,"suggested_fix":string|null}

Zasady:
- toleruj błędy interpunkcji, stylu, gramatyki - skup się na tym czy sens jest poprawny,
- jeśli użytkownik próbuje opisać słowo (nawet prosto) -> ok=true,
- message_pl max 200 znaków, suggested_fix max 120 znaków,
- jeśli ok=true: issue_type="other", suggested_fix=null,
- odrzuć tylko jeśli: brak sensu, całkowicie błędne znaczenie, spam, lub brak próby opisu.`,
        },
        {
          role: 'user',
          content: `word: ${word}\n${meaningContext}\ndescription: ${description.trim()}`,
        },
      ] satisfies Array<{ role: 'system' | 'user'; content: string }>

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_completion_tokens: 400,
        response_format: { type: 'json_object' },
        messages,
      })

      const content = completion.choices?.[0]?.message?.content ?? ''
      if (!content.trim()) {
        throw new Error('Empty AI response')
      }
      const parsed = JSON.parse(content.trim())
      const aiLatencyMs = Date.now() - startedAt

      return NextResponse.json({
        ok: !!parsed.ok,
        issue_type: parsed.issue_type ?? 'other',
        message_pl: parsed.message_pl ?? '',
        suggested_fix: parsed.suggested_fix ?? null,
        ai_used: true,
        ai_latency_ms: aiLatencyMs,
      })
    } catch (err: unknown) {
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
    console.error('Check describe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
