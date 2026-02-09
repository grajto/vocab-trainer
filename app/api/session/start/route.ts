import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { selectCardsForSession } from '@/src/lib/srs'
import { parseNumericId } from '@/src/lib/parseNumericId'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { deckId, mode, targetCount = 10, levelFilter = 'all' } = body

    const allowedModes = ['translate', 'sentence', 'abcd', 'mixed'] as const
    type Mode = (typeof allowedModes)[number]
    const isMode = (value: unknown): value is Mode =>
      allowedModes.includes(value as Mode)

    if (!deckId || !isMode(mode)) {
      return NextResponse.json({ error: 'deckId and mode are required' }, { status: 400 })
    }

    const numericDeckId = parseNumericId(deckId)
    if (numericDeckId === null) {
      return NextResponse.json({ error: 'deckId must be a valid number' }, { status: 400 })
    }

    const count = Math.min(Math.max(Number(targetCount), 5), 35)
    const payload = await getPayload()

    // Get deck to check direction setting
    let deckDirection = 'front-to-back'
    try {
      const deck = await payload.findByID({ collection: 'decks', id: numericDeckId, depth: 0 })
      deckDirection = (deck as any).direction || 'front-to-back'
    } catch {
      // Fall through with default
    }

    // Get all cards in deck
    const allCards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: numericDeckId }, owner: { equals: user.id } },
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
    let cardsWithState = allCards.docs
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
          totalWrong: rs.totalWrong ?? 0,
          lastReviewedAt: rs.lastReviewedAt,
        }
      })

    let cardsWithoutState = allCards.docs
      .filter(c => !stateMap.has(String(c.id)))
      .map(c => ({
        cardId: c.id,
        front: c.front,
        back: c.back,
        totalWrong: 0,
      }))

    // Apply level filter
    if (levelFilter === '1') {
      cardsWithState = cardsWithState.filter(c => c.level === 1)
    } else if (levelFilter === '2-3') {
      cardsWithState = cardsWithState.filter(c => c.level === 2 || c.level === 3)
      cardsWithoutState = [] // Only show existing cards
    } else if (levelFilter === '4') {
      cardsWithState = cardsWithState.filter(c => c.level === 4)
      cardsWithoutState = [] // Only show existing cards
    } else if (levelFilter === 'problematic') {
      // Sort by totalWrong descending, pick top cards
      cardsWithState = cardsWithState
        .filter(c => (c.totalWrong || 0) > 0)
        .sort((a, b) => (b.totalWrong || 0) - (a.totalWrong || 0))
      cardsWithoutState = [] // Only show existing cards
    }

    if (cardsWithState.length === 0 && cardsWithoutState.length === 0) {
      return NextResponse.json({ error: 'No cards match the selected level filter' }, { status: 400 })
    }

    const selectedCards = selectCardsForSession(cardsWithState, cardsWithoutState, count, 20, introToday)

    // Precompute numeric card IDs
    const cardIdMap = new Map<string, number>()
    for (const card of selectedCards) {
      const parsedId = parseNumericId(card.cardId)
      if (parsedId === null) {
        return NextResponse.json({ error: `Invalid cardId: ${card.cardId}` }, { status: 400 })
      }
      cardIdMap.set(String(card.cardId), parsedId)
    }

    // Create review states for new cards
    for (const card of selectedCards) {
      if (!card.reviewStateId) {
        const cardIdValue = cardIdMap.get(String(card.cardId))!
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
        deck: numericDeckId,
        targetCount: selectedCards.length,
        completedCount: 0,
        startedAt: new Date().toISOString(),
      },
    })

    // Determine direction for each task
    function getDirection(): 'normal' | 'reverse' {
      if (deckDirection === 'back-to-front') return 'reverse'
      if (deckDirection === 'both') return Math.random() > 0.5 ? 'reverse' : 'normal'
      return 'normal'
    }

    // Build tasks
    type TaskType = Exclude<Mode, 'mixed'>
    type MixedTaskType = Exclude<TaskType, 'sentence'>
    type Task = {
      cardId: number
      taskType: TaskType
      prompt: string
      answer: string
      expectedAnswer?: string
      options?: string[]
      /** For sentence mode: the PL meaning shown as big prompt */
      promptPl?: string
      /** For sentence mode: the EN word/phrase that must appear in the sentence */
      requiredEn?: string
    }

    const tasks: Task[] = []
    for (const card of selectedCards) {
      let taskType: TaskType
      if (mode === 'mixed') {
        const types: MixedTaskType[] = ['translate', 'abcd']
        taskType = types[Math.floor(Math.random() * types.length)]
      } else {
        taskType = mode
      }

      const cardIdValue = cardIdMap.get(String(card.cardId))!
      const dir = getDirection()
      const prompt = dir === 'reverse' ? card.back : card.front
      const answer = dir === 'reverse' ? card.front : card.back

      const task: Task = {
        cardId: cardIdValue,
        taskType,
        prompt,
        answer,
      }

      if (taskType === 'translate') {
        task.expectedAnswer = answer
      }

      // For sentence mode: always provide PL meaning + EN required word
      // front = EN word, back = PL meaning (regardless of direction setting)
      if (taskType === 'sentence') {
        task.promptPl = card.back
        task.requiredEn = card.front
        // Override prompt to show PL meaning (big prompt)
        task.prompt = card.back
        // answer stays as the EN word for compatibility
        task.answer = card.front
      }

      if (taskType === 'abcd') {
        const otherCards = allCards.docs.filter(c => String(c.id) !== String(card.cardId))
        const shuffled = otherCards.sort(() => Math.random() - 0.5).slice(0, 3)
        const options = shuffled.map(c => dir === 'reverse' ? c.front : c.back)
        options.push(answer)
        task.options = options.sort(() => Math.random() - 0.5)
      }

      tasks.push(task)
    }

    // Create session items
    for (const task of tasks) {
      await payload.create({
        collection: 'session-items',
        data: {
          session: session.id,
          card: task.cardId,
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
