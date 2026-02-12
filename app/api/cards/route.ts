import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { parseNumericId } from '@/src/lib/parseNumericId'
import { getDueCards } from '@/src/lib/queries/getDueCards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cards - Fetch cards with pagination and caching
 * Query params:
 * - deckId: Filter by deck ID
 * - folderId: Filter by folder ID
 * - limit: Results per page (default: 50, max: 100)
 * - offset: Pagination offset
 * - dueOnly: Only return due cards (default: false)
 */
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const deckId = searchParams.get('deckId')
  const folderId = searchParams.get('folderId')
  const limit = Math.max(10, Math.min(100, Number(searchParams.get('limit') || 50)))
  const offset = Math.max(0, Number(searchParams.get('offset') || 0))
  const dueOnly = searchParams.get('dueOnly') === 'true'

  try {
    const result = await getDueCards({
      userId: user.id,
      deckIds: deckId ? [Number(deckId)] : undefined,
      folderId: folderId ? Number(folderId) : undefined,
      limit,
      offset,
      includeDueOnly: dueOnly,
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
