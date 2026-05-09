export function applyAutoDash(input: string, codes: Set<string>): string {
  if (input.length === 0) return ''
  // Collapse any run of dashes — handles 'POR--' from a user typing '-'
  // right after the auto-inserted dash.
  const deduped = input.replace(/-+/g, '-')
  if (deduped.includes('-')) return deduped.toUpperCase()
  const upper = deduped.toUpperCase()
  if (codes.has(upper)) return `${upper}-`
  return upper
}
