import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { requireAppToken } from '@/src/lib/requireAppToken'
import { processCorrectAnswer, processWrongAnswer } from '@/src/lib/srs'
import { normalizeAnswer } from '@/src/lib/answerCheck'

export async function POST(req: NextRequest) {
  try {
    if (!requireAppToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      sessionId, cardId, taskType, userAnswer,
      isCorrect: clientIsCorrect, expectedAnswer,
      attemptsCount, wasWrongBeforeCorrect, usedHint, userOverride,
      aiUsed: clientAiUsed,
      responseTimeMs,
      streakAfterAnswer,
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
        aiUsed: taskType === 'sentence' || taskType === 'describe' ? !!clientAiUsed : false,
        taskType: taskType || sessionItems.docs[0].taskType,
        responseTimeMs: Number(responseTimeMs || 0),
        streakAfterAnswer: Number(streakAfterAnswer || 0),
        levelAfterAnswer: Number(updateData.level || rs.level || 0),
        answeredAt: new Date().toISOString(),
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
            aiUsed: taskType === 'sentence' || taskType === 'describe' ? !!clientAiUsed : false,
            taskType: taskType || sessionItems.docs[0].taskType,
          },
        })
      }
    }

    // Update session completedCount and accuracy
    const session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
    const rawTestId = (session.settings as Record<string, unknown> | undefined)?.testId
    const linkedTestId = (typeof rawTestId === 'string' || typeof rawTestId === 'number') ? rawTestId : null
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


    if (session.mode === 'test' && linkedTestId) {
      try {
        await payload.create({
          collection: 'test_answers',
          data: {
            owner: user.id,
            test: linkedTestId,
            card: cardId,
            modeUsed: taskType || 'translate',
            promptShown: sessionItems.docs[0]?.promptShown || '',
            userAnswer: userAnswer || '',
            isCorrect,
            timeMs: Number(responseTimeMs || 0),
            answeredAt: new Date().toISOString(),
          },
        })
      } catch (err) {
        console.error('Failed to store test answer:', err)
      }
    }

    const sessionUpdate: Record<string, unknown> = {
      completedCount: newCompleted,
      accuracy,
    }

    if (newCompleted >= session.targetCount) {
      const finishedAt = new Date().toISOString()
      sessionUpdate.endedAt = finishedAt

      if (session.mode === 'test' && linkedTestId) {
        try {
          const allTestAnswers = await payload.find({ collection: 'test_answers', where: { test: { equals: linkedTestId } }, limit: 10000, depth: 0 })
          const total = allTestAnswers.totalDocs
          const correct = allTestAnswers.docs.filter((a) => a.isCorrect).length
          await payload.update({
            collection: 'tests',
            id: linkedTestId,
            data: {
              status: 'finished',
              finishedAt,
              durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()),
              scoreCorrect: correct,
              scoreTotal: total,
              scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
            },
          })
        } catch (err) {
          console.error('Failed to finalize test:', err)
        }
      }
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
