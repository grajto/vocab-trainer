import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const payload = await getPayload()

  const folder = await payload.findByID({ collection: 'folders', id, depth: 0 })
  if (String(folder.owner) !== String(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name || '').trim()
  if (body.description !== undefined) data.description = String(body.description || '').trim()

  const updated = await payload.update({ collection: 'folders', id, data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const payload = await getPayload()

  const folder = await payload.findByID({ collection: 'folders', id, depth: 0 })
  if (String(folder.owner) !== String(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const decks = await payload.find({ collection: 'decks', where: { owner: { equals: user.id }, folder: { equals: id } }, limit: 500, depth: 0 })
  for (const deck of decks.docs) {
    await payload.update({ collection: 'decks', id: deck.id, data: { folder: null } })
  }

  await payload.delete({ collection: 'folders', id })
  return NextResponse.json({ ok: true })
}
