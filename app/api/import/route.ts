import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (values.length < 2) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parseDeckId = (value: string) => {
      const parsed = Number.parseInt(value, 10)
      return Number.isFinite(parsed) ? parsed : null
    }

    const payload = await getPayload()

    // Support both JSON body with csvText and FormData
    const contentType = req.headers.get('content-type') || ''
    let deckIdRaw: string
    let csvText: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      deckIdRaw = body.deckId
      csvText = body.csvText
    } else {
      const formData = await req.formData()
      deckIdRaw = formData.get('deckId') as string
      const file = formData.get('file') as File | null
      if (file) {
        csvText = await file.text()
      } else {
        csvText = formData.get('csvText') as string
      }
    }

    if (!deckIdRaw || !csvText) {
      return NextResponse.json({ error: 'deckId and csvText/file are required' }, { status: 400 })
    }

    const deckId = parseDeckId(deckIdRaw)
    if (deckId === null) {
      return NextResponse.json({ error: 'deckId must be a number' }, { status: 400 })
    }

    const rows = parseCSV(csvText)
    let createdCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const row of rows) {
      const front = row.front || row['Front'] || ''
      const back = row.back || row['Back'] || ''

      if (!front || !back) {
        errors.push(`Skipped row: missing front or back`)
        skippedCount++
        continue
      }

      // Check for duplicate
      const existing = await payload.find({
        collection: 'cards',
        where: {
          deck: { equals: deckId },
          front: { equals: front },
          back: { equals: back },
          owner: { equals: user.id },
        },
        limit: 1,
        depth: 0,
      })

      if (existing.docs.length > 0) {
        skippedCount++
        continue
      }

      try {
        await payload.create({
          collection: 'cards',
          data: {
            owner: user.id,
            deck: deckId,
            front,
            back,
            notes: row.notes || row['Notes'] || '',
            examples: row.examples || row['Examples'] || '',
            cardType: 'word',
          },
        })
        createdCount++
      } catch (e) {
        errors.push(`Error creating card "${front}": ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }

    return NextResponse.json({ createdCount, skippedCount, errors, totalRows: rows.length })
  } catch (error: unknown) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
