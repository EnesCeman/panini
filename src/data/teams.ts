import type { } from 'react';

export type Team = { code: string; name: string; group: string; flag: string };

export const TEAMS: Team[] = [
  { code: 'MEX', name: 'Mexico',             group: 'A', flag: '🇲🇽' },
  { code: 'RSA', name: 'South Africa',       group: 'A', flag: '🇿🇦' },
  { code: 'KOR', name: 'Korea Republic',     group: 'A', flag: '🇰🇷' },
  { code: 'CZE', name: 'Czechia',            group: 'A', flag: '🇨🇿' },
  { code: 'CAN', name: 'Canada',             group: 'B', flag: '🇨🇦' },
  { code: 'BIH', name: 'Bosnia-Herzegovina', group: 'B', flag: '🇧🇦' },
  { code: 'QAT', name: 'Qatar',              group: 'B', flag: '🇶🇦' },
  { code: 'SUI', name: 'Switzerland',        group: 'B', flag: '🇨🇭' },
  { code: 'BRA', name: 'Brazil',             group: 'C', flag: '🇧🇷' },
  { code: 'MAR', name: 'Morocco',            group: 'C', flag: '🇲🇦' },
  { code: 'HAI', name: 'Haiti',              group: 'C', flag: '🇭🇹' },
  { code: 'SCO', name: 'Scotland',           group: 'C', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'USA', name: 'USA',                group: 'D', flag: '🇺🇸' },
  { code: 'PAR', name: 'Paraguay',           group: 'D', flag: '🇵🇾' },
  { code: 'AUS', name: 'Australia',          group: 'D', flag: '🇦🇺' },
  { code: 'TUR', name: 'Türkiye',            group: 'D', flag: '🇹🇷' },
  { code: 'GER', name: 'Germany',            group: 'E', flag: '🇩🇪' },
  { code: 'CUW', name: 'Curaçao',            group: 'E', flag: '🇨🇼' },
  { code: 'CIV', name: "Côte d'Ivoire",      group: 'E', flag: '🇨🇮' },
  { code: 'ECU', name: 'Ecuador',            group: 'E', flag: '🇪🇨' },
  { code: 'NED', name: 'Netherlands',        group: 'F', flag: '🇳🇱' },
  { code: 'JPN', name: 'Japan',              group: 'F', flag: '🇯🇵' },
  { code: 'SWE', name: 'Sweden',             group: 'F', flag: '🇸🇪' },
  { code: 'TUN', name: 'Tunisia',            group: 'F', flag: '🇹🇳' },
  { code: 'BEL', name: 'Belgium',            group: 'G', flag: '🇧🇪' },
  { code: 'EGY', name: 'Egypt',              group: 'G', flag: '🇪🇬' },
  { code: 'IRN', name: 'IR Iran',            group: 'G', flag: '🇮🇷' },
  { code: 'NZL', name: 'New Zealand',        group: 'G', flag: '🇳🇿' },
  { code: 'ESP', name: 'Spain',              group: 'H', flag: '🇪🇸' },
  { code: 'CPV', name: 'Cabo Verde',         group: 'H', flag: '🇨🇻' },
  { code: 'KSA', name: 'Saudi Arabia',       group: 'H', flag: '🇸🇦' },
  { code: 'URU', name: 'Uruguay',            group: 'H', flag: '🇺🇾' },
  { code: 'FRA', name: 'France',             group: 'I', flag: '🇫🇷' },
  { code: 'SEN', name: 'Senegal',            group: 'I', flag: '🇸🇳' },
  { code: 'IRQ', name: 'Iraq',               group: 'I', flag: '🇮🇶' },
  { code: 'NOR', name: 'Norway',             group: 'I', flag: '🇳🇴' },
  { code: 'ARG', name: 'Argentina',          group: 'J', flag: '🇦🇷' },
  { code: 'ALG', name: 'Algeria',            group: 'J', flag: '🇩🇿' },
  { code: 'AUT', name: 'Austria',            group: 'J', flag: '🇦🇹' },
  { code: 'JOR', name: 'Jordan',             group: 'J', flag: '🇯🇴' },
  { code: 'POR', name: 'Portugal',           group: 'K', flag: '🇵🇹' },
  { code: 'COD', name: 'Congo DR',           group: 'K', flag: '🇨🇩' },
  { code: 'UZB', name: 'Uzbekistan',         group: 'K', flag: '🇺🇿' },
  { code: 'COL', name: 'Colombia',           group: 'K', flag: '🇨🇴' },
  { code: 'ENG', name: 'England',            group: 'L', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'CRO', name: 'Croatia',            group: 'L', flag: '🇭🇷' },
  { code: 'GHA', name: 'Ghana',              group: 'L', flag: '🇬🇭' },
  { code: 'PAN', name: 'Panama',             group: 'L', flag: '🇵🇦' },
];

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;

export function stickerKind(num: number): 'badge' | 'team_photo' | 'player' {
  if (num === 1) return 'badge';
  if (num === 13) return 'team_photo';
  return 'player';
}

export function allStickerCodes(): string[] {
  return TEAMS.flatMap(t => Array.from({length: 20}, (_, i) => `${t.code}-${i+1}`));
}

export function teamByCode(code: string): Team | undefined {
  return TEAMS.find(t => t.code === code);
}
