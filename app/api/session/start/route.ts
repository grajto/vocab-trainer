import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { requireAppToken } from '@/src/lib/requireAppToken'
import { selectCardsForSession } from '@/src/lib/srs'
import { parseNumericId } from '@/src/lib/parseNumericId'
import { getStudySettings } from '@/src/lib/userSettings'
import { getNeonPool } from '@/src/lib/db'

export const preferredRegion = ['fra1']

export async function POST(req: NextRequest) {
  try {
    if (!requireAppToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { deckId, folderId, mode, targetCount = 10, levels, direction, shuffle = true, requireCorrect = false, testId, enabledModes, randomAnswerOrder = true, allowAll = false } = body

    const allowedModes = ['translate', 'sentence', 'abcd', 'mixed', 'test', 'describe'] as const
    type Mode = (typeof allowedModes)[number]
    const isMode = (value: unknown): value is Mode =>
      allowedModes.includes(value as Mode)

    if ((!deckId && !folderId && !allowAll) || !isMode(mode)) {
      return NextResponse.json({ error: 'deckId or folderId and mode are required' }, { status: 400 })
    }

    const numericDeckId = deckId ? parseNumericId(deckId) : null
    const numericFolderId = folderId ? parseNumericId(folderId) : null
    if (deckId && numericDeckId === null) {
      return NextResponse.json({ error: 'deckId must be a valid number' }, { status: 400 })
    }
    if (folderId && numericFolderId === null) {
      return NextResponse.json({ error: 'folderId must be a valid number' }, { status: 400 })
    }

    const count = Math.min(Math.max(Number(targetCount), 5), 35)
    const payload = await getPayload()
    const settings = getStudySettings(user as unknown as Record<string, unknown>)

    // Validate user ID early to avoid partial state issues
    const numericUserId = parseNumericId(user.id)
    if (numericUserId === null) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    let linkedTestId: string | number | null = testId || null

    // Get deck to check direction setting
    let deckDirection = 'front-to-back'
    if (numericDeckId) {
      try {
        const deck = await payload.findByID({ collection: 'decks', id: numericDeckId, depth: 0 })
        deckDirection = (deck as any).direction || 'front-to-back'
      } catch {
        // Fall through with default
      }
    }
    const selectedDirection = direction || (deckDirection === 'back-to-front' ? 'en-pl' : deckDirection === 'both' ? 'both' : settings.defaultDirection)

    let deckIds: number[] = []
    if (numericDeckId) deckIds = [numericDeckId]
    if (numericFolderId) {
      const folderDecks = await payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id }, folder: { equals: numericFolderId } },
        limit: 200,
        depth: 0,
      })
      deckIds = folderDecks.docs.map((d: any) => Number(d.id))
    }
    if (allowAll) {
      const ownedDecks = await payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        limit: 500,
        depth: 0,
      })
      deckIds = ownedDecks.docs.map((d: any) => Number(d.id))
    }
    if (deckIds.length === 0) {
      return NextResponse.json({ error: 'No decks found for selected resource' }, { status: 400 })
    }

    // Get all cards in deck
    const allCards = await payload.find({
      collection: 'cards',
      where: { deck: { in: deckIds }, owner: { equals: user.id } },
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

    const selectedLevels = Array.isArray(levels) && levels.length > 0
      ? levels.map((l: number) => Number(l)).filter((l: number) => [1, 2, 3, 4].includes(l))
      : [1, 2, 3, 4]

    cardsWithState = cardsWithState.filter(c => selectedLevels.includes(c.level))
    if (!selectedLevels.includes(1)) {
      cardsWithoutState = []
    }

    if (cardsWithState.length === 0 && cardsWithoutState.length === 0) {
      return NextResponse.json({ error: 'No cards match the selected level filter' }, { status: 400 })
    }

    const selectedCards = selectCardsForSession(cardsWithState, cardsWithoutState, count, 20, introToday)

    // Validate we have enough cards (min: 5 required by Sessions schema)
    if (selectedCards.length < 5) {
      return NextResponse.json({ 
        error: 'Not enough cards available. At least 5 cards are required to start a session.',
        availableCards: selectedCards.length 
      }, { status: 400 })
    }

    // Precompute numeric card IDs
    const cardIdMap = new Map<string, number>()
    for (const card of selectedCards) {
      const parsedId = parseNumericId(card.cardId)
      if (parsedId === null) {
        return NextResponse.json({ error: `Invalid cardId: ${card.cardId}` }, { status: 400 })
      }
      cardIdMap.set(String(card.cardId), parsedId)
    }

    // Create review states for new cards (batch insert optimization)
    const cardsNeedingReviewState = selectedCards.filter(c => !c.reviewStateId)
    
    if (cardsNeedingReviewState.length > 0) {
      try {
        const pool = getNeonPool()
        const now = new Date().toISOString()
        
        // Build parameterized query for batch insert
        const values = cardsNeedingReviewState.map((_, idx) => {
          const base = idx * 9
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`
        }).join(', ')
        
        // Flatten all parameters
        const params: (number | string)[] = []
        for (const card of cardsNeedingReviewState) {
          const cardIdValue = cardIdMap.get(String(card.cardId))!
          params.push(
            numericUserId,
            cardIdValue,
            1, // level
            now, // due_at
            now, // introduced_at
            0, // total_correct
            0, // total_wrong
            0, // today_correct_count
            0  // today_wrong_count
          )
        }
        
        // Batch insert with RETURNING clause
        const result = await pool.query(`
          INSERT INTO review_states 
          (owner_id, card_id, level, due_at, introduced_at, total_correct, total_wrong, today_correct_count, today_wrong_count)
          VALUES ${values}
          RETURNING id, card_id
        `, params)
        
        // Map returned IDs back to cards
        const cardIdToResultMap = new Map<number, number>()
        for (const row of result.rows) {
          cardIdToResultMap.set(Number(row.card_id), Number(row.id))
        }
        
        for (const card of cardsNeedingReviewState) {
          const cardIdValue = cardIdMap.get(String(card.cardId))!
          const reviewStateId = cardIdToResultMap.get(cardIdValue)
          if (reviewStateId) {
            card.reviewStateId = reviewStateId
            card.level = 1
          }
        }
      } catch (err: unknown) {
        console.error('Batch insert failed, falling back to sequential creation:', err)
        // Fallback to sequential creation for backward compatibility
        for (const card of cardsNeedingReviewState) {
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
      }
    }


    if (mode === 'test' && !linkedTestId) {
      try {
        const createdTest = await payload.create({
          collection: 'tests',
          data: {
            owner: user.id,
            sourceType: numericDeckId ? 'set' : 'folder',
            sourceDeck: numericDeckId || null,
            sourceFolder: numericFolderId || null,
            enabledModes: (Array.isArray(enabledModes) && enabledModes.length > 0 ? enabledModes : ['abcd', 'translate']).map((m: string) => ({ mode: m })),
            questionCount: count,
            randomQuestionOrder: Boolean(shuffle),
            randomAnswerOrder: Boolean(randomAnswerOrder),
            startedAt: new Date().toISOString(),
            status: 'in_progress',
          },
        })
        linkedTestId = createdTest.id
      } catch (err: unknown) {
        console.error('Session start test create failed, running ephemeral test', err)
        linkedTestId = null
      }
    }

    // Create session
    const session = await payload.create({
      collection: 'sessions',
      data: {
        owner: user.id,
        mode,
        deck: deckIds[0],
        targetCount: selectedCards.length,
        completedCount: 0,
        startedAt: new Date().toISOString(),
        settings: {
          deckIds,
          folderId: numericFolderId ?? null,
          direction: selectedDirection,
          levels: selectedLevels,
          shuffle,
          requireCorrect,
          testId: linkedTestId,
          enabledModes: Array.isArray(enabledModes) ? enabledModes : null,
          randomAnswerOrder: Boolean(randomAnswerOrder),
        },
      },
    })

    // Build tasks
    type TaskType = Exclude<Mode, 'mixed' | 'test'>
    type MixedTaskType = Exclude<TaskType, 'describe'>
    type Task = {
      cardId: number
      taskType: TaskType
      prompt: string
      answer: string
      expectedAnswer?: string
      options?: string[]
      correctIndex?: number
      correctValue?: string
      /** For sentence mode: the PL meaning shown as big prompt */
      promptPl?: string
      /** For sentence mode: the EN word/phrase that must appear in the sentence */
      requiredEn?: string
    }

    const tasks: Task[] = []
    for (const card of selectedCards) {
      let taskType: TaskType
      if (mode === 'test') {
        const types = (Array.isArray(enabledModes) && enabledModes.length > 0
          ? enabledModes.filter((m: string) => ['translate', 'abcd'].includes(m))
          : ['translate', 'abcd']) as Array<'translate' | 'abcd'>
        taskType = types[Math.floor(Math.random() * types.length)] || 'translate'
      } else if (mode === 'mixed') {
        const types: MixedTaskType[] = ['translate', 'abcd', 'sentence']
        const weightedPool: MixedTaskType[] = [
          ...Array(settings.mixTranslate).fill('translate'),
          ...Array(settings.mixAbcd).fill('abcd'),
          ...Array(settings.mixSentence).fill('sentence'),
        ]
        const pool = weightedPool.length > 0 ? weightedPool : types
        taskType = pool[Math.floor(Math.random() * pool.length)]
      } else {
        taskType = mode
      }

      const cardIdValue = cardIdMap.get(String(card.cardId))!
      const isAbcd = taskType === 'abcd'
      const prompt = isAbcd ? card.front : card.back
      const answer = isAbcd ? card.back : card.front

      const task: Task = {
        cardId: cardIdValue,
        taskType,
        prompt,
        answer,
      }

      if (taskType === 'translate') {
        task.expectedAnswer = answer
      }

      if (taskType === 'describe') {
        task.prompt = card.back
        task.answer = card.front
        task.expectedAnswer = card.front
        task.requiredEn = card.front
      }

      // Sentence mode: stage 1 = translate PL->EN, stage 2 = write sentence using EN word
      if (taskType === 'sentence') {
        task.promptPl = card.back       // PL meaning (for reference)
        task.requiredEn = card.front    // EN word (used in sentence stage 2)
        task.prompt = card.back         // Main display: PL word (e.g., "noc")
        task.answer = card.front        // Expected in stage 1: EN translation (e.g., "night")
        task.expectedAnswer = card.front // Stage 1 validation expects EN translation
      }

      if (taskType === 'abcd') {
        const otherCards = allCards.docs.filter(c => String(c.id) !== String(card.cardId))
        const shuffled = otherCards.sort(() => Math.random() - 0.5).slice(0, 3)
        const options = shuffled.map(c => c.back)
        options.push(answer)
        const finalOptions = randomAnswerOrder ? options.sort(() => Math.random() - 0.5) : options
        task.options = finalOptions
        task.correctIndex = finalOptions.indexOf(answer)
        task.correctValue = answer
      }

      tasks.push(task)
    }

    if (shuffle) {
      tasks.sort(() => Math.random() - 0.5)
    }

    await payload.update({
      collection: 'sessions',
      id: session.id,
      data: {
        settings: {
          deckIds,
          folderId: numericFolderId ?? null,
          direction: selectedDirection,
          levels: selectedLevels,
          shuffle,
          requireCorrect,
          testId: linkedTestId,
          enabledModes: Array.isArray(enabledModes) ? enabledModes : null,
          randomAnswerOrder: Boolean(randomAnswerOrder),
          tasks,
          returnDeckId: deckIds[0] || null,
        },
      },
    })

    // Create session items (batch insert optimization)
    if (tasks.length > 0) {
      const numericSessionId = parseNumericId(session.id)
      
      // Try batch insert first (requires numeric session ID)
      if (numericSessionId !== null) {
        try {
          const pool = getNeonPool()
          
          // Build parameterized query for batch insert
          const values = tasks.map((_, idx) => {
            const base = idx * 4
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
          }).join(', ')
          
          // Flatten all parameters (parameterized queries prevent SQL injection)
          const params: (number | string)[] = []
          for (const task of tasks) {
            params.push(
              numericSessionId,
              task.cardId,
              task.taskType,
              task.prompt
            )
          }
          
          // Batch insert
          await pool.query(`
            INSERT INTO session_items 
            (session_id, card_id, task_type, prompt_shown)
            VALUES ${values}
          `, params)
        } catch (err: unknown) {
          console.error('Batch insert for session items failed, falling back to sequential creation:', err)
          // Fallback to sequential creation
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
        }
      } else {
        // Session ID couldn't be parsed as numeric, use sequential creation
        console.warn('Session ID is not numeric, using sequential creation for session items')
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
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      tasks,
      totalCards: selectedCards.length,
      testId: linkedTestId,
      deckId: deckIds[0] || null,
    })
  } catch (error: unknown) {
    console.error('Session start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
