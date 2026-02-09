import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { parseNumericId } from '@/src/lib/parseNumericId'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, folderId, direction } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const payload = await getPayload()

  const data: Record<string, unknown> = {
    owner: user.id,
    name: name.trim(),
    description: description?.trim() || '',
  }

  // Set direction if provided
  const validDirections = ['front-to-back', 'back-to-front', 'both']
  if (direction && validDirections.includes(direction)) {
    data.direction = direction
  }

  // Set folder if provided
  if (folderId) {
    const numericFolderId = parseNumericId(folderId)
    if (numericFolderId !== null) {
      data.folder = numericFolderId
    }
  }

  const deck = await payload.create({
    collection: 'decks',
    data,
  })

  return NextResponse.json(deck)
}
