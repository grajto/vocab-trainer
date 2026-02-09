import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { parseNumericId } from '@/src/lib/parseNumericId'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { deckId, front, back, notes, examples, cardType } = body

  if (!deckId || !front?.trim() || !back?.trim()) {
    return NextResponse.json({ error: 'deckId, front, and back are required' }, { status: 400 })
  }

  const numericDeckId = parseNumericId(deckId)
  if (numericDeckId === null) {
    return NextResponse.json({ error: 'deckId must be a valid number' }, { status: 400 })
  }

  const payload = await getPayload()
  const card = await payload.create({
    collection: 'cards',
    data: {
      owner: user.id,
      deck: numericDeckId,
      front: front.trim(),
      back: back.trim(),
      notes: notes?.trim() || '',
      examples: examples?.trim() || '',
      cardType: cardType || 'word',
    },
  })

  return NextResponse.json(card)
}
