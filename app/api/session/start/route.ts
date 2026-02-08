import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { selectCardsForSession } from '@/src/lib/srs'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { deckId, mode, targetCount = 10 } = body

    const allowedModes = ['translate', 'sentence', 'abcd', 'mixed'] as const
    if (!deckId || !mode || !allowedModes.includes(mode)) {
      return NextResponse.json({ error: 'deckId and mode are required' }, { status: 400 })
    }

    const count = Math.min(Math.max(Number(targetCount), 5), 35)
    const payload = await getPayload()

    // Get all cards in deck
    const allCards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: deckId }, owner: { equals: user.id } },
      limit: 1000,
      depth: 0,
    })

    if (allCards.docs.length === 0) {
      return NextResponse.json({ error: 'No cards in this deck' }, { status: 400 })
    }

    // Get review states for these cards
    const cardIds = allCards.docs.map(c => c.id)
    const reviewStates = await payload.find({
      collection: 'review-states',
      where: {
        owner: { equals: user.id },
        card: { in: cardIds },
      },
      limit: 1000,
      depth: 0,
    })

    const stateMap = new Map<string, typeof reviewStates.docs[0]>()
    for (const rs of reviewStates.docs) {
      stateMap.set(String(rs.card), rs)
    }

    // Count how many cards were introduced today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const introToday = reviewStates.docs.filter(rs => {
      if (!rs.introducedAt) return false
      return new Date(rs.introducedAt) >= today
    }).length

    // Separate cards with/without review state
    const cardsWithState = allCards.docs
      .filter(c => stateMap.has(String(c.id)))
      .map(c => {
        const rs = stateMap.get(String(c.id))!
        return {
          cardId: c.id,
          front: c.front,
          back: c.back,
          reviewStateId: rs.id,
          level: rs.level,
          todayWrongCount: rs.todayWrongCount ?? 0,
          lastReviewedAt: rs.lastReviewedAt,
        }
      })

    const cardsWithoutState = allCards.docs
      .filter(c => !stateMap.has(String(c.id)))
      .map(c => ({
        cardId: c.id,
        front: c.front,
        back: c.back,
      }))

    const selectedCards = selectCardsForSession(cardsWithState, cardsWithoutState, count, 20, introToday)

    // Create review states for new cards
    for (const card of selectedCards) {
      if (!card.reviewStateId) {
        const cardIdValue = typeof card.cardId === 'string' ? Number(card.cardId) : card.cardId
        const rs = await payload.create({
          collection: 'review-states',
          data: {
            owner: user.id,
            card: cardIdValue,
            level: 1,
            dueAt: new Date().toISOString(),
            introducedAt: new Date().toISOString(),
            totalCorrect: 0,
            totalWrong: 0,
            todayCorrectCount: 0,
            todayWrongCount: 0,
          },
        })
        card.reviewStateId = rs.id
        card.level = 1
      }
    }

    // Create session
    const session = await payload.create({
      collection: 'sessions',
      data: {
        owner: user.id,
        mode,
        deck: deckId,
        targetCount: selectedCards.length,
        completedCount: 0,
        startedAt: new Date().toISOString(),
      },
    })

    // Build tasks
    type TaskType = 'translate' | 'sentence' | 'abcd'
    const tasks = selectedCards.map(card => {
      let taskType: TaskType = mode as TaskType
      if (mode === 'mixed') {
        const types: TaskType[] = ['translate', 'abcd']
        taskType = types[Math.floor(Math.random() * types.length)]
      }

      const task = {
        cardId: card.cardId,
        taskType,
        prompt: card.front,
        answer: card.back,
      } as {
        cardId: string | number
        taskType: TaskType
        prompt: string
        answer: string
        options?: string[]
      }

      // For ABCD, generate options
      if (taskType === 'abcd') {
        const otherCards = allCards.docs.filter(c => String(c.id) !== String(card.cardId))
        const shuffled = otherCards.sort(() => Math.random() - 0.5).slice(0, 3)
        const options = shuffled.map(c => c.back)
        options.push(card.back)
        // Shuffle options
        task.options = options.sort(() => Math.random() - 0.5)
      }

      return task
    })

    // Create session items
    for (const task of tasks) {
      const taskCardId = Number(task.cardId as string | number)
      await payload.create({
        collection: 'session-items',
        data: {
          session: session.id,
          card: taskCardId,
          taskType: task.taskType,
          promptShown: task.prompt,
        },
      })
    }

    return NextResponse.json({
      sessionId: session.id,
      tasks,
      totalCards: selectedCards.length,
    })
  } catch (error: unknown) {
    console.error('Session start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
