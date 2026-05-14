import { TEAMS } from '@/data/teams'

const TEAM_CODES = new Set(TEAMS.map((t) => t.code))

export type ParsedCodes = { valid: string[]; invalid: string[] }

// Parse a free-form list. Handles 'IRN-2', 'IRN 2', 'IRN2', and the
// compact 'IRN 2,18,20' form (one prefix → multiple numbers).
// Valid = known team code + 1..20. Invalid = anything else that
// matched the prefix-then-number shape.
// Set keepDuplicates when each repeat represents a separate card
// (e.g. bulk ±1 receiving two of the same sticker).
export function parseCodes(
  input: string,
  options?: { keepDuplicates?: boolean },
): ParsedCodes {
  const keepDuplicates = options?.keepDuplicates ?? false
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
      if (keepDuplicates) {
        valid.push(code)
      } else if (!seen.has(code)) {
        seen.add(code)
        valid.push(code)
      }
    }
  }
  return { valid, invalid }
}
