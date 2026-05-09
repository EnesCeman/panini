export type GroupColor = {
  bg: string
  bgSoft: string
  text: string
  border: string
  ring: string
}

export const GROUP_COLORS: Record<string, GroupColor> = {
  A: { bg: 'bg-green-500',   bgSoft: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-500',   ring: 'ring-green-500' },
  B: { bg: 'bg-red-500',     bgSoft: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-500',     ring: 'ring-red-500' },
  C: { bg: 'bg-yellow-500',  bgSoft: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-500',  ring: 'ring-yellow-500' },
  D: { bg: 'bg-blue-500',    bgSoft: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-500',    ring: 'ring-blue-500' },
  E: { bg: 'bg-orange-500',  bgSoft: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-500',  ring: 'ring-orange-500' },
  F: { bg: 'bg-teal-500',    bgSoft: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-500',    ring: 'ring-teal-500' },
  G: { bg: 'bg-indigo-500',  bgSoft: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-500',  ring: 'ring-indigo-500' },
  H: { bg: 'bg-cyan-500',    bgSoft: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-500',    ring: 'ring-cyan-500' },
  I: { bg: 'bg-pink-500',    bgSoft: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-500',    ring: 'ring-pink-500' },
  J: { bg: 'bg-rose-500',    bgSoft: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-500',    ring: 'ring-rose-500' },
  K: { bg: 'bg-fuchsia-500', bgSoft: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-500', ring: 'ring-fuchsia-500' },
  L: { bg: 'bg-violet-500',  bgSoft: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-500',  ring: 'ring-violet-500' },
}

export function groupColor(group: string): GroupColor {
  return GROUP_COLORS[group] ?? GROUP_COLORS.A
}
