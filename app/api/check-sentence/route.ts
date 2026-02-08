import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { requiredPhrase, sentence } = body

    if (!sentence || !sentence.trim()) {
      return NextResponse.json({
        ok: false,
        issue_type: 'empty_sentence',
        message_pl: 'Zdanie nie może być puste.',
        aiUsed: false,
      })
    }

    if (!requiredPhrase) {
      return NextResponse.json({
        ok: false,
        issue_type: 'missing_phrase_config',
        message_pl: 'Brak wymaganej frazy do sprawdzenia.',
        aiUsed: false,
      })
    }

    // Hard validation: sentence must contain the required phrase
    const lowerSentence = sentence.toLowerCase()
    const lowerPhrase = requiredPhrase.toLowerCase()

    if (!lowerSentence.includes(lowerPhrase)) {
      return NextResponse.json({
        ok: false,
        issue_type: 'missing_phrase',
        message_pl: `Zdanie musi zawierać frazę: "${requiredPhrase}".`,
        aiUsed: false,
      })
    }

    // If OPENAI_API_KEY exists, try AI validation
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a language teacher. Check if the following sentence is grammatically correct and natural. Respond ONLY with JSON: { "ok": boolean, "issue_type": "grammar"|"unnatural"|null, "message_pl": "short message in Polish max 1 sentence", "suggested_fix": "corrected sentence or null" }',
              },
              {
                role: 'user',
                content: `Required phrase: "${requiredPhrase}"\nSentence: "${sentence}"`,
              },
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content
          if (content) {
            try {
              const parsed = JSON.parse(content)
              return NextResponse.json({ ...parsed, aiUsed: true })
            } catch {
              // AI response not parseable, fall through
            }
          }
        }
      } catch {
        // AI call failed, fall through to stub
      }
    }

    // Stub response when no AI available
    return NextResponse.json({
      ok: true,
      issue_type: null,
      message_pl: 'Zdanie zawiera wymaganą frazę (bez weryfikacji AI).',
      aiUsed: false,
    })
  } catch (error: unknown) {
    console.error('Check sentence error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
