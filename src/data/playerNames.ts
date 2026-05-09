// Player names printed in the physical Panini WC 2026 album, used as a
// fallback when no user-entered name exists in Firestore. Keyed by
// sticker code (TEAM-NUM). Stickers 1 (badge) and 13 (team photo) are
// intentionally omitted — those have fixed labels.
//
// Data is filled in incrementally by reading album spread photos. An
// empty file is fine; missing entries simply fall through to the
// sticker code (e.g. "POR-3").

export const ALBUM_PLAYER_NAMES: Record<string, string> = {
  // populated from album spreads
}
