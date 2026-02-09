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
    const { phrase, requiredPhrase, sentence } = body
    // Support both field names for backwards compat
    const targetPhrase = phrase || requiredPhrase

    if (!targetPhrase) {
      return NextResponse.json({
        ok: false,
        issue_type: 'missing_phrase_config',
        message_pl: 'Brak wymaganej frazy do sprawdzenia.',
        aiUsed: false,
      })
    }

    if (!sentence || !sentence.trim()) {
      return NextResponse.json({
        ok: false,
        issue_type: 'empty_sentence',
        message_pl: 'Zdanie nie może być puste.',
        aiUsed: false,
      })
    }

    const trimmed = sentence.trim()

    // Pre-AI validation: length
    if (trimmed.length < 8) {
      return NextResponse.json({
        ok: false,
        issue_type: 'too_short',
        message_pl: 'Zdanie jest za krótkie (min. 8 znaków).',
        aiUsed: false,
      })
    }
    if (trimmed.length > 240) {
      return NextResponse.json({
        ok: false,
        issue_type: 'too_long',
        message_pl: 'Zdanie jest za długie (max 240 znaków).',
        aiUsed: false,
      })
    }

    // Pre-AI validation: phrase containment (case-insensitive, collapsed whitespace)
    if (!norm(trimmed).includes(norm(targetPhrase))) {
      return NextResponse.json({
        ok: false,
        issue_type: 'missing_phrase',
        message_pl: `Zdanie nie zawiera wymaganego zwrotu: "${targetPhrase}".`,
        aiUsed: false,
      })
    }

    // AI validation via OpenAI SDK
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1-nano',
          temperature: 0,
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `You are a strict English language teacher. The student must write a grammatically correct and natural English sentence using the phrase "${targetPhrase}".
Respond ONLY with valid JSON (no markdown, no code fences):
{"ok":true/false,"issue_type":null|"grammar"|"unnatural","message_pl":"short feedback in Polish (1 sentence max)","suggested_fix":null|"corrected sentence"}
If the sentence is correct and natural, set ok=true, issue_type=null, suggested_fix=null.`,
            },
            {
              role: 'user',
              content: trimmed,
            },
          ],
        })

        const content = completion.choices?.[0]?.message?.content
        if (content) {
          // Strip possible markdown code fences
          const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
          try {
            const parsed = JSON.parse(cleaned)
            return NextResponse.json({
              ok: !!parsed.ok,
              issue_type: parsed.issue_type ?? null,
              message_pl: parsed.message_pl ?? '',
              suggested_fix: parsed.suggested_fix ?? null,
              aiUsed: true,
            })
          } catch {
            console.error('AI response not parseable:', content)
          }
        }
      } catch (err) {
        console.error('OpenAI call failed:', err)
      }
    }

    // Stub response when no AI key or AI call failed
    return NextResponse.json({
      ok: true,
      issue_type: null,
      message_pl: 'Zdanie zawiera wymaganą frazę (bez weryfikacji AI).',
      suggested_fix: null,
      aiUsed: false,
    })
  } catch (error: unknown) {
    console.error('Check sentence error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
