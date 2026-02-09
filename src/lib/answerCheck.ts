/**
 * Normalize an answer string for comparison:
 * - trim whitespace
 * - collapse multiple spaces
 * - lowercase
 * - strip trailing punctuation (.,!?)
 */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.,!?]+$/, '')
}

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Check if user answer matches the expected answer or any accepted alternatives.
 */
export function checkAnswer(
  userAnswer: string,
  expectedAnswer: string,
  acceptedAnswers?: string[],
): boolean {
  const normalized = normalizeAnswer(userAnswer)
  if (normalized === normalizeAnswer(expectedAnswer)) return true
  if (acceptedAnswers) {
    return acceptedAnswers.some(a => normalizeAnswer(a) === normalized)
  }
  return false
}

/**
 * Check answer with typo tolerance.
 * Returns: 'correct' | 'typo' | 'wrong'
 */
export function checkAnswerWithTypo(
  userAnswer: string,
  expectedAnswer: string,
  acceptedAnswers?: string[],
): 'correct' | 'typo' | 'wrong' {
  if (checkAnswer(userAnswer, expectedAnswer, acceptedAnswers)) return 'correct'

  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedExpected = normalizeAnswer(expectedAnswer)

  // Check levenshtein distance of 1 against expected
  if (levenshtein(normalizedUser, normalizedExpected) === 1) return 'typo'

  // Also check against accepted answers
  if (acceptedAnswers) {
    for (const alt of acceptedAnswers) {
      if (levenshtein(normalizedUser, normalizeAnswer(alt)) === 1) return 'typo'
    }
  }

  return 'wrong'
}

/**
 * Generate a hint for a given answer.
 * Returns a masked version: first letter shown, rest hidden.
 * e.g., "green" → "g _ _ _ _"
 */
export function generateHint(answer: string): string {
  const trimmed = answer.trim()
  if (trimmed.length <= 1) return trimmed

  // For multi-word answers, show first letter of each word
  const words = trimmed.split(/\s+/)
  return words.map(word => {
    if (word.length <= 1) return word
    return word[0] + ' ' + Array(word.length - 1).fill('_').join(' ')
  }).join('  ')
}
