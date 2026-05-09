import { ClipboardCheck, Copy, Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TEAMS } from '@/data/teams'
import { albumPlayerName, resolvePlayerLabel } from '@/lib/playerName'
import { usePublicLocale, usePublicT } from '@/lib/publicI18n'
import { formatGroupedCodes, submitRequest } from '@/lib/submissions'
import { useStickersMap } from '@/lib/state'

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]))

type Props = {
  theyHave: string[]
  theyWant: string[]
  onClose: () => void
  onCleared: () => void
}

type Submitted = { id: string; theyHave: string[]; theyWant: string[] }

export function SubmitModal({ theyHave, theyWant, onClose, onCleared }: Props) {
  const t = usePublicT()
  const { locale } = usePublicLocale()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Submitted | null>(null)

  async function handleSend() {
    setError(null)
    if (name.trim().length === 0) {
      setError(t('public.requiredName'))
      return
    }
    if (contact.trim().length === 0) {
      setError(t('public.requiredContact'))
      return
    }
    setSubmitting(true)
    try {
      const id = await submitRequest({
        name,
        contact,
        note,
        theyHave,
        theyWant,
        locale,
      })
      setSubmitted({ id, theyHave, theyWant })
    } catch (e) {
      console.error(e)
      setError(t('public.modal.error'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnother() {
    onCleared()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h2 className="flex-1 text-sm font-semibold text-neutral-900">
          {submitted ? t('public.success.title') : t('public.modal.title')}
        </h2>
        <button
          type="button"
          onClick={submitted ? handleAnother : onClose}
          aria-label="Close"
          className="rounded-full p-1 text-neutral-500 hover:text-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {submitted ? (
        <SuccessView submitted={submitted} onAnother={handleAnother} />
      ) : (
        <FormView
          name={name}
          setName={setName}
          contact={contact}
          setContact={setContact}
          note={note}
          setNote={setNote}
          theyHave={theyHave}
          theyWant={theyWant}
          error={error}
          submitting={submitting}
          onSend={handleSend}
          onCancel={onClose}
        />
      )}
    </div>
  )
}

type FormProps = {
  name: string
  setName: (v: string) => void
  contact: string
  setContact: (v: string) => void
  note: string
  setNote: (v: string) => void
  theyHave: string[]
  theyWant: string[]
  error: string | null
  submitting: boolean
  onSend: () => void
  onCancel: () => void
}

function FormView({
  name,
  setName,
  contact,
  setContact,
  note,
  setNote,
  theyHave,
  theyWant,
  error,
  submitting,
  onSend,
  onCancel,
}: FormProps) {
  const t = usePublicT()
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-4 text-xs text-neutral-600">{t('public.modal.lead')}</p>

        <div className="space-y-3">
          <Field label={t('public.modal.name')}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('public.modal.namePh')}
              maxLength={80}
              autoComplete="name"
            />
          </Field>
          <Field label={t('public.modal.contact')}>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('public.modal.contactPh')}
              maxLength={200}
            />
          </Field>
          <Field label={t('public.modal.note')}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('public.modal.notePh')}
              maxLength={500}
              rows={3}
              className="block w-full rounded-md border border-neutral-200 p-2 text-sm"
            />
          </Field>
        </div>

        <div className="mt-5 space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-700">
          <SummaryBlock label={t('public.modal.summaryHave', { count: theyHave.length })} codes={theyHave} />
          <SummaryBlock label={t('public.modal.summaryWant', { count: theyWant.length })} codes={theyWant} />
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
      </div>

      <div
        className="border-t border-neutral-200 bg-white px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            {t('public.modal.cancel')}
          </Button>
          <Button type="button" onClick={onSend} disabled={submitting} className="flex-1">
            {submitting ? t('public.modal.sending') : t('public.modal.send')}
          </Button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  )
}

function SummaryBlock({ label, codes }: { label: string; codes: string[] }) {
  if (codes.length === 0) return null
  return (
    <div>
      <div className="mb-1 font-semibold text-neutral-900">{label}</div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-neutral-700">
        {formatGroupedCodes(codes)}
      </pre>
    </div>
  )
}

function SuccessView({ submitted, onAnother }: { submitted: Submitted; onAnother: () => void }) {
  const t = usePublicT()
  const stickers = useStickersMap()
  const [copied, setCopied] = useState(false)

  const haveRows = useMemo(() => buildRows(submitted.theyHave, stickers), [submitted.theyHave, stickers])
  const wantRows = useMemo(() => buildRows(submitted.theyWant, stickers), [submitted.theyWant, stickers])

  const copyText = useMemo(() => {
    const parts: string[] = []
    if (submitted.theyHave.length > 0) {
      parts.push(`=== ${t('public.success.haveSection')} ===`)
      parts.push(formatGroupedCodes(submitted.theyHave))
    }
    if (submitted.theyWant.length > 0) {
      if (parts.length > 0) parts.push('')
      parts.push(`=== ${t('public.success.wantSection')} ===`)
      parts.push(formatGroupedCodes(submitted.theyWant))
    }
    return parts.join('\n')
  }, [submitted, t])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  function handleCsv() {
    const csv = buildCsv(haveRows, wantRows, t)
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `panini-trade-${submitted.id.slice(0, 6)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-4 text-sm text-neutral-700">{t('public.success.body')}</p>

        <div className="flex gap-2">
          <Button type="button" onClick={handleCopy} className="flex-1" variant="outline">
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                {t('public.success.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('public.success.copy')}
              </>
            )}
          </Button>
          <Button type="button" onClick={handleCsv} className="flex-1" variant="outline">
            <Download className="h-4 w-4" />
            {t('public.success.csv')}
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {haveRows.length > 0 && (
            <RowSection title={t('public.success.haveSection')} rows={haveRows} />
          )}
          {wantRows.length > 0 && (
            <RowSection title={t('public.success.wantSection')} rows={wantRows} />
          )}
        </div>
      </div>

      <div
        className="border-t border-neutral-200 bg-white px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button type="button" onClick={onAnother} className="w-full">
          {t('public.success.again')}
        </Button>
      </div>
    </>
  )
}

type Row = { code: string; teamName: string; num: number; name: string }

function buildRows(codes: string[], stickers: Map<string, { name: string | null }>): Row[] {
  return codes.map((code) => {
    const [teamCode, numStr] = code.split('-')
    const team = TEAM_BY_CODE.get(teamCode)
    const num = parseInt(numStr, 10)
    const userName = stickers.get(code)?.name ?? null
    const album = albumPlayerName(code)
    const name = userName ?? album ?? resolvePlayerLabel(code, null) ?? code
    return {
      code,
      teamName: team?.name ?? teamCode,
      num,
      name,
    }
  })
}

function RowSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title} · {rows.length}
      </h3>
      <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {rows.map((r, idx) => (
          <li
            key={r.code}
            className={
              idx !== rows.length - 1 ? 'border-b border-neutral-100' : undefined
            }
          >
            <div className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-neutral-900">{r.name}</div>
                <div className="text-[11px] text-neutral-500">{r.teamName}</div>
              </div>
              <span className="text-xs tabular-nums text-neutral-400">{r.code}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function buildCsv(haveRows: Row[], wantRows: Row[], t: ReturnType<typeof usePublicT>): string {
  const haveLabel = t('public.success.haveSection')
  const wantLabel = t('public.success.wantSection')
  const lines = ['Code,Team,Num,Name,Side']
  for (const r of haveRows) {
    lines.push(
      [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), csvEscape(haveLabel)].join(','),
    )
  }
  for (const r of wantRows) {
    lines.push(
      [r.code, csvEscape(r.teamName), r.num.toString(), csvEscape(r.name), csvEscape(wantLabel)].join(','),
    )
  }
  return lines.join('\n')
}
