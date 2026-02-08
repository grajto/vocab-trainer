import type { FieldHook } from 'payload'

/**
 * Lazy reset: if the last review was on a different day, reset todayCorrectCount and todayWrongCount.
 * Attached as a beforeChange hook on ReviewStates.
 */
export const resetDailyCounters: FieldHook = ({ value, siblingData }) => {
  const lastReviewed = siblingData?.lastReviewedAt
  if (!lastReviewed) return value

  const lastDate = new Date(lastReviewed)
  const now = new Date()

  const sameDay =
    lastDate.getFullYear() === now.getFullYear() &&
    lastDate.getMonth() === now.getMonth() &&
    lastDate.getDate() === now.getDate()

  // If not the same day, the SRS logic in the API already handles the reset.
  // This hook is a safety net for direct Payload admin edits.
  if (!sameDay && (siblingData?.todayCorrectCount > 0 || siblingData?.todayWrongCount > 0)) {
    siblingData.todayCorrectCount = 0
    siblingData.todayWrongCount = 0
  }

  return value
}
