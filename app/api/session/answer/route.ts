import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { processCorrectAnswer, processWrongAnswer } from '@/src/lib/srs'
import { normalizeAnswer } from '@/src/lib/answerCheck'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      sessionId, cardId, taskType, userAnswer,
      isCorrect: clientIsCorrect, expectedAnswer,
      attemptsCount, wasWrongBeforeCorrect, usedHint, userOverride,
      aiUsed: clientAiUsed,
    } = body

    if (!sessionId || !cardId) {
      return NextResponse.json({ error: 'sessionId and cardId are required' }, { status: 400 })
    }

    const payload = await getPayload()

    // Determine the authoritative isCorrect value.
    let isCorrect = !!clientIsCorrect

    if (taskType === 'translate' && expectedAnswer != null) {
      try {
        const card = await payload.findByID({ collection: 'cards', id: cardId, depth: 0 })
        const dbAnswer = card.back || ''
        if (normalizeAnswer(expectedAnswer) !== normalizeAnswer(dbAnswer)) {
          isCorrect = normalizeAnswer(userAnswer || '') === normalizeAnswer(dbAnswer)
        }
      } catch {
        // Card not found or error - fall through with client value
      }
    }

    // Get review state for this card
    const reviewStates = await payload.find({
      collection: 'review-states',
      where: {
        owner: { equals: user.id },
        card: { equals: cardId },
      },
      limit: 1,
      depth: 0,
    })

    if (reviewStates.docs.length === 0) {
      return NextResponse.json({ error: 'Review state not found' }, { status: 404 })
    }

    const rs = reviewStates.docs[0]

    // Update review state based on answer
    let updateData: Record<string, unknown>
    if (isCorrect) {
      updateData = processCorrectAnswer({
        level: rs.level,
        totalCorrect: rs.totalCorrect ?? 0,
        totalWrong: rs.totalWrong ?? 0,
        todayCorrectCount: rs.todayCorrectCount ?? 0,
        todayWrongCount: rs.todayWrongCount ?? 0,
        lastLevelUpAt: rs.lastLevelUpAt,
        lastReviewedAt: rs.lastReviewedAt,
      })

      // If hint was used, prevent level-up (revert level change)
      if (usedHint && (updateData.level as number) > rs.level) {
        updateData.level = rs.level
        updateData.lastLevelUpAt = rs.lastLevelUpAt || undefined
      }
    } else {
      updateData = processWrongAnswer({
        level: rs.level,
        totalWrong: rs.totalWrong ?? 0,
        todayCorrectCount: rs.todayCorrectCount ?? 0,
        todayWrongCount: rs.todayWrongCount ?? 0,
        lastReviewedAt: rs.lastReviewedAt,
      })
    }

    await payload.update({
      collection: 'review-states',
      id: rs.id,
      data: updateData,
    })

    // Update session item
    const sessionItems = await payload.find({
      collection: 'session-items',
      where: {
        session: { equals: sessionId },
        card: { equals: cardId },
      },
      limit: 1,
      depth: 0,
    })

    if (sessionItems.docs.length > 0) {
      const itemUpdate: Record<string, unknown> = {
        userAnswer: userAnswer || '',
        isCorrect,
        aiUsed: taskType === 'sentence' ? !!clientAiUsed : false,
        taskType: taskType || sessionItems.docs[0].taskType,
      }

      // Save new fields if provided (gracefully handle missing columns)
      if (attemptsCount !== undefined) itemUpdate.attemptsCount = attemptsCount
      if (wasWrongBeforeCorrect !== undefined) itemUpdate.wasWrongBeforeCorrect = wasWrongBeforeCorrect
      if (usedHint !== undefined) itemUpdate.usedHint = usedHint
      if (userOverride !== undefined) itemUpdate.userOverride = userOverride

      try {
        await payload.update({
          collection: 'session-items',
          id: sessionItems.docs[0].id,
          data: itemUpdate,
        })
      } catch (err) {
        // If new columns don't exist yet, fall back to basic update
        console.error('SessionItem update with new fields failed, falling back:', err)
        await payload.update({
          collection: 'session-items',
          id: sessionItems.docs[0].id,
          data: {
            userAnswer: userAnswer || '',
            isCorrect,
            aiUsed: taskType === 'sentence' ? !!clientAiUsed : false,
            taskType: taskType || sessionItems.docs[0].taskType,
          },
        })
      }
    }

    // Update session completedCount and accuracy
    const session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
    const newCompleted = (session.completedCount ?? 0) + 1

    const allItems = await payload.find({
      collection: 'session-items',
      where: { session: { equals: sessionId } },
      limit: 100,
      depth: 0,
    })
    const answeredItems = allItems.docs.filter(i => i.userAnswer !== null && i.userAnswer !== undefined && i.userAnswer !== '')
    const correctItems = answeredItems.filter(i => i.isCorrect)
    const accuracy = answeredItems.length > 0 ? Math.round((correctItems.length / answeredItems.length) * 100) : 0

    const sessionUpdate: Record<string, unknown> = {
      completedCount: newCompleted,
      accuracy,
    }

    if (newCompleted >= session.targetCount) {
      sessionUpdate.endedAt = new Date().toISOString()
    }

    await payload.update({
      collection: 'sessions',
      id: sessionId,
      data: sessionUpdate,
    })

    return NextResponse.json({
      ok: true,
      completed: newCompleted,
      targetCount: session.targetCount,
      accuracy,
      sessionDone: newCompleted >= session.targetCount,
    })
  } catch (error: unknown) {
    console.error('Session answer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
