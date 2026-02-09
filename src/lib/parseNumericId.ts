export const parseNumericId = (value: string | number): number | null => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value
  return Number.isFinite(parsed) ? parsed : null
}
