import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

import { findGiveOverlaps } from '@/lib/locks'
import type { Trade } from '@/lib/trades'

function trade(partial: Partial<Trade> & { id: string }): Trade {
  return {
    id: partial.id,
    subject: partial.subject ?? `Trade ${partial.id}`,
    contact: '',
    location: '',
    give: partial.give ?? [],
    get: partial.get ?? [],
    notes: '',
    status: partial.status ?? 'pending',
    locked: partial.locked ?? true,
    createdAt: null,
    updatedAt: null,
  }
}

describe('findGiveOverlaps', () => {
  it('blocks a second lock when count=2 (only 1 spare) is already locked elsewhere', () => {
    const other = trade({ id: 'A', give: ['POR-5'] })
    const stickers = new Map([['POR-5', { count: 2 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], [other], stickers)
    expect(overlaps).toHaveLength(1)
    expect(overlaps[0]?.code).toBe('POR-5')
    expect(overlaps[0]?.otherTrade.id).toBe('A')
  })

  it('allows a second lock when count=3 has spares beyond the first lock', () => {
    const other = trade({ id: 'A', give: ['POR-5'] })
    const stickers = new Map([['POR-5', { count: 3 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], [other], stickers)
    expect(overlaps).toEqual([])
  })

  it('blocks the third lock when count=3 has only 2 spares', () => {
    const others = [
      trade({ id: 'A', give: ['POR-5'] }),
      trade({ id: 'C', give: ['POR-5'] }),
    ]
    const stickers = new Map([['POR-5', { count: 3 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], others, stickers)
    expect(overlaps).toHaveLength(2)
  })

  it('blocks when count=1 (no spares) is already locked elsewhere', () => {
    const other = trade({ id: 'A', give: ['POR-5'] })
    const stickers = new Map([['POR-5', { count: 1 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], [other], stickers)
    expect(overlaps).toHaveLength(1)
  })

  it('ignores unlocked or non-pending other trades', () => {
    const others = [
      trade({ id: 'A', give: ['POR-5'], locked: false }),
      trade({ id: 'C', give: ['POR-5'], status: 'completed' }),
    ]
    const stickers = new Map([['POR-5', { count: 2 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], others, stickers)
    expect(overlaps).toEqual([])
  })

  it('excludes the trade itself from the other-commits scan', () => {
    const self = trade({ id: 'B', give: ['POR-5'] })
    const stickers = new Map([['POR-5', { count: 2 }]])
    const overlaps = findGiveOverlaps('B', ['POR-5'], [self], stickers)
    expect(overlaps).toEqual([])
  })
})
