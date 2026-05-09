import { ALBUM_PLAYER_NAMES } from '@/data/playerNames'

/**
 * Returns the album-printed player name for a sticker, if known.
 * Returns undefined when the sticker isn't in our extracted dataset
 * (e.g. badge, team photo, or a team we haven't transcribed yet).
 */
export function albumPlayerName(code: string): string | undefined {
  return ALBUM_PLAYER_NAMES[code]
}

/**
 * Resolves the display label for a player sticker following the chain:
 *   1. User-entered name from Firestore
 *   2. Album-printed name (hardcoded)
 *   3. Sticker code as last-resort fallback
 *
 * Caller is responsible for handling badge/team-photo cases.
 */
export function resolvePlayerLabel(code: string, userName: string | null): string {
  if (userName && userName.length > 0) return userName
  return ALBUM_PLAYER_NAMES[code] ?? code
}
