/**
 * Utility functions for the vocab-trainer app
 */

/**
 * Returns the correct Polish plural form for "card" (słówko)
 * @param count - Number of cards
 * @returns Pluralized form: "słówko" | "słówka" | "słówek"
 */
export function pluralizeCards(count: number): string {
  if (count === 1) return 'słówko'
  if (count >= 2 && count <= 4) return 'słówka'
  return 'słówek'
}

/**
 * Returns the correct Polish plural form for "set" (zestaw)
 * @param count - Number of sets
 * @returns Pluralized form: "zestaw" | "zestawy" | "zestawów"
 */
export function pluralizeSets(count: number): string {
  if (count === 1) return 'zestaw'
  if (count >= 2 && count <= 4) return 'zestawy'
  return 'zestawów'
}

/**
 * Returns the correct Polish plural form for "day" (dzień)
 * @param count - Number of days
 * @returns Pluralized form: "dzień" | "dni"
 */
export function pluralizeDays(count: number): string {
  if (count === 1) return 'dzień'
  return 'dni'
}

/**
 * Returns the correct Polish plural form for "session" (sesja)
 * @param count - Number of sessions
 * @returns Pluralized form: "sesja" | "sesje" | "sesji"
 */
export function pluralizeSessions(count: number): string {
  if (count === 1) return 'sesja'
  if (count >= 2 && count <= 4) return 'sesje'
  return 'sesji'
}
