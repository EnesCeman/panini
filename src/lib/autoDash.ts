export function applyAutoDash(input: string, codes: Set<string>): string {
  if (input.length === 0) return ''
  if (input.includes('-')) return input.toUpperCase()
  const upper = input.toUpperCase()
  if (codes.has(upper)) return `${upper}-`
  return upper
}
