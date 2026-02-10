export type CheckSentenceError = {
  type: string
  from: string
  to: string
  explain: string
}

export type CheckSentenceResponse = {
  ok: boolean
  corrected: string
  errors: CheckSentenceError[]
  comment: string
}

const MAX_ERRORS = 5
const MAX_COMMENT_LENGTH = 200

function looksLikePromptLeak(value: string): boolean {
  const lowered = value.toLowerCase()
  return (
    lowered.includes('requireden:') ||
    lowered.includes('pl znaczenie:') ||
    lowered.includes('sentence:') ||
    lowered.includes('json only')
  )
}

const ensureString = (value: unknown, field: string) => {
  if (typeof value !== 'string') {
    throw new Error(`AI_INVALID_SCHEMA: ${field} is not string`)
  }
  return value
}

export function normalizeCheckSentenceResponse(
  response: CheckSentenceResponse,
  originalSentence: string,
): CheckSentenceResponse {
  const corrected = response.ok ? originalSentence : response.corrected.trim()
  if (!corrected) {
    throw new Error('AI_INVALID_SCHEMA: corrected is empty')
  }
  if (looksLikePromptLeak(corrected)) {
    throw new Error('AI_INVALID_SCHEMA: corrected leaked prompt fields')
  }
  const comment = response.comment.slice(0, MAX_COMMENT_LENGTH)
  return {
    ok: response.ok,
    corrected,
    errors: response.errors.slice(0, MAX_ERRORS),
    comment,
  }
}

export function parseCheckSentenceResponse(
  rawText: string,
  originalSentence: string,
): CheckSentenceResponse {
  const parsed = JSON.parse(rawText)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI_INVALID_SCHEMA: response is not an object')
  }

  const ok = (parsed as { ok?: unknown }).ok
  if (typeof ok !== 'boolean') {
    throw new Error('AI_INVALID_SCHEMA: ok is not boolean')
  }

  const correctedRaw = ensureString((parsed as { corrected?: unknown }).corrected, 'corrected')
  const commentRaw = ensureString((parsed as { comment?: unknown }).comment, 'comment')
  const errorsRaw = (parsed as { errors?: unknown }).errors

  if (!Array.isArray(errorsRaw)) {
    throw new Error('AI_INVALID_SCHEMA: errors is not array')
  }

  const errors: CheckSentenceError[] = errorsRaw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`AI_INVALID_SCHEMA: errors[${index}] is not object`)
    }
    const errorItem = item as Record<string, unknown>
    return {
      type: ensureString(errorItem.type, `errors[${index}].type`),
      from: ensureString(errorItem.from, `errors[${index}].from`),
      to: ensureString(errorItem.to, `errors[${index}].to`),
      explain: ensureString(errorItem.explain, `errors[${index}].explain`),
    }
  })

  return normalizeCheckSentenceResponse(
    {
      ok,
      corrected: correctedRaw,
      errors,
      comment: commentRaw,
    },
    originalSentence,
  )
}

export function buildCheckSentenceResponse(data: {
  ok: boolean
  corrected: string
  errors?: CheckSentenceError[]
  comment: string
  originalSentence?: string
}): CheckSentenceResponse {
  const corrected = data.ok && data.originalSentence
    ? data.originalSentence
    : data.corrected.trim()

  if (!corrected) {
    throw new Error('Invalid response: corrected must be non-empty')
  }

  return {
    ok: data.ok,
    corrected,
    errors: (data.errors ?? []).slice(0, MAX_ERRORS),
    comment: data.comment.slice(0, MAX_COMMENT_LENGTH),
  }
}
