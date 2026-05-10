import { TEAMS } from '@/data/teams'

const TEAM_CODES = new Set(TEAMS.map((t) => t.code))

export type ParsedCodes = { valid: string[]; invalid: string[] }

// Parse a free-form list. Handles 'IRN-2', 'IRN 2', 'IRN2', and the
// compact 'IRN 2,18,20' form (one prefix → multiple numbers).
// Valid = known team code + 1..20. Invalid = anything else that
// matched the prefix-then-number shape.
export function parseCodes(input: string): ParsedCodes {
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  const upper = input.toUpperCase()
  const blocks = upper.matchAll(/([A-Z]{3})((?:[\s,;\-]*\d{1,2})+)/g)
  for (const block of blocks) {
    const teamCode = block[1]
    const numbers = Array.from(block[2].matchAll(/\d+/g)).map((m) =>
      parseInt(m[0], 10),
    )
    const knownTeam = TEAM_CODES.has(teamCode)
    for (const num of numbers) {
      const code = `${teamCode}-${num}`
      if (!knownTeam || num < 1 || num > 20) {
        invalid.push(code)
        continue
      }
      if (!seen.has(code)) {
        seen.add(code)
        valid.push(code)
      }
    }
  }
  return { valid, invalid }
}
