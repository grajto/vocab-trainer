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
