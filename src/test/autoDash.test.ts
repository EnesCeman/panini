import { describe, expect, it } from 'vitest'
import { applyAutoDash } from '@/lib/autoDash'

describe('applyAutoDash', () => {
  const codes = new Set(['POR', 'ENG', 'BRA', 'GER', 'NED'])

  it('adds dash when input upper-cases to a known team code', () => {
    expect(applyAutoDash('por', codes)).toBe('POR-')
  })

  it('uppercases letters as a side effect', () => {
    expect(applyAutoDash('eng', codes)).toBe('ENG-')
  })

  it('does nothing if dash is already present', () => {
    expect(applyAutoDash('POR-', codes)).toBe('POR-')
    expect(applyAutoDash('POR-5', codes)).toBe('POR-5')
  })

  it('does nothing for partial codes', () => {
    expect(applyAutoDash('PO', codes)).toBe('PO')
  })

  it('does nothing for unknown codes', () => {
    expect(applyAutoDash('XYZ', codes)).toBe('XYZ')
  })

  it('preserves longer input that starts with a code (no auto-dash mid-typing)', () => {
    expect(applyAutoDash('PORT', codes)).toBe('PORT')
  })

  it('handles empty input', () => {
    expect(applyAutoDash('', codes)).toBe('')
  })

  it('collapses consecutive dashes (user typed "-" after the auto-inserted one)', () => {
    expect(applyAutoDash('POR--', codes)).toBe('POR-')
    expect(applyAutoDash('POR---5', codes)).toBe('POR-5')
  })
})
