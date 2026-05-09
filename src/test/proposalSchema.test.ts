import { describe, expect, it } from 'vitest'
import { validateTrade, validateProposalDraft } from '@/lib/proposalSchema'

describe('validateTrade', () => {
  it('rejects when offered is empty', () => {
    expect(validateTrade({ offered: [], requested: [{ code: 'BRA-1', qty: 1 }] }))
      .toEqual({ ok: false, reason: 'offered_empty' })
  })

  it('rejects when requested is empty', () => {
    expect(validateTrade({ offered: ['POR-5'], requested: [] }))
      .toEqual({ ok: false, reason: 'requested_empty' })
  })

  it('accepts 1:1 trade', () => {
    expect(validateTrade({ offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] }))
      .toEqual({ ok: true })
  })

  it('accepts 1:5 trade (max requested when offered is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 5 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects 1:6 trade (exceeds 5 cap when offered is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 6 }],
      }),
    ).toEqual({ ok: false, reason: 'requested_over_cap' })
  })

  it('accepts N:1 trade with arbitrary offered count', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3', 'GER-7', 'BRA-9'],
        requested: [{ code: 'NED-2', qty: 1 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects 2:2 trade (neither side is 1)', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3'],
        requested: [{ code: 'BRA-1', qty: 2 }],
      }),
    ).toEqual({ ok: false, reason: 'shape_invalid' })
  })

  it('rejects 2:1 with multi-entry requested but qty totals 1', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'ENG-3'],
        requested: [{ code: 'BRA-1', qty: 1 }],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects duplicate offered codes within a trade', () => {
    expect(
      validateTrade({
        offered: ['POR-5', 'POR-5'],
        requested: [{ code: 'BRA-1', qty: 1 }],
      }),
    ).toEqual({ ok: false, reason: 'offered_duplicate' })
  })

  it('rejects qty < 1', () => {
    expect(
      validateTrade({
        offered: ['POR-5'],
        requested: [{ code: 'BRA-1', qty: 0 }],
      }),
    ).toEqual({ ok: false, reason: 'requested_qty_invalid' })
  })
})

describe('validateProposalDraft', () => {
  const validTrade = {
    offered: ['POR-5'],
    requested: [{ code: 'BRA-1', qty: 1 }],
  }

  it('rejects when trades is empty', () => {
    expect(
      validateProposalDraft({
        trades: [],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'no_trades' })
  })

  it('rejects when proposer name empty', () => {
    expect(
      validateProposalDraft({
        trades: [validTrade],
        proposer: { name: '', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'name_empty' })
  })

  it('rejects when proposer contact empty', () => {
    expect(
      validateProposalDraft({
        trades: [validTrade],
        proposer: { name: 'A', contact: '' },
      }),
    ).toEqual({ ok: false, reason: 'contact_empty' })
  })

  it('rejects duplicate offered codes across trades', () => {
    expect(
      validateProposalDraft({
        trades: [
          { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
          { offered: ['POR-5'], requested: [{ code: 'GER-2', qty: 1 }] },
        ],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: false, reason: 'offered_duplicate_across_trades' })
  })

  it('accepts a valid multi-trade draft', () => {
    expect(
      validateProposalDraft({
        trades: [
          { offered: ['POR-5'], requested: [{ code: 'BRA-1', qty: 1 }] },
          { offered: ['ENG-3', 'GER-7'], requested: [{ code: 'NED-2', qty: 1 }] },
        ],
        proposer: { name: 'A', contact: 'b' },
      }),
    ).toEqual({ ok: true })
  })
})
