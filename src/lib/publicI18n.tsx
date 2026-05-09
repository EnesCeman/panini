import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'bs' | 'en'

const STORAGE_KEY = 'panini.locale'

const T = {
  bs: {
    'public.title': 'Razmjena sličica',
    'public.subtitle': 'Označi šta imaš i šta tražiš, pa pošalji.',
    'public.tab.have':
      'Imam ({count})',
    'public.tab.want': 'Želim ({count})',
    'public.have.heading': 'Sličice koje meni fale',
    'public.have.sub': 'Označi one koje ti imaš viška.',
    'public.want.heading': 'Sličice koje imam viška',
    'public.want.sub': 'Označi one koje tebi trebaju.',
    'public.search.name': 'Igrač, tim…',
    'public.search.code': 'Kod, npr. POR-5',
    'public.empty': 'Nema rezultata',
    'public.albumComplete': 'Album je popunjen!',
    'public.noDoubles': 'Trenutno nema duplikata.',
    'public.submit': 'Pošalji ({count})',
    'public.submit.zero': 'Označi bar jednu sličicu',
    'public.modal.title': 'Tvoji podaci',
    'public.modal.lead': 'Ostavi mi kontakt da se javim oko razmjene.',
    'public.modal.name': 'Ime',
    'public.modal.namePh': 'Tvoje ime',
    'public.modal.contact': 'Kontakt',
    'public.modal.contactPh': 'Telegram, Instagram, email, broj…',
    'public.modal.note': 'Poruka',
    'public.modal.notePh': 'Bilo šta dodatno (npr. iz kojeg si grada). Neobavezno.',
    'public.modal.summaryHave': 'Imaš ({count})',
    'public.modal.summaryWant': 'Želiš ({count})',
    'public.modal.send': 'Pošalji',
    'public.modal.sending': 'Šaljem…',
    'public.modal.cancel': 'Odustani',
    'public.modal.error': 'Slanje nije uspjelo. Pokušaj ponovo.',
    'public.success.title': 'Poslano!',
    'public.success.body':
      'Hvala! Javit ću ti se na ostavljeni kontakt. Ovdje je sažetak za tebe — kopiraj ili spusti CSV ako ti treba.',
    'public.success.copy': 'Kopiraj listu',
    'public.success.copied': 'Kopirano!',
    'public.success.csv': 'Skini CSV',
    'public.success.again': 'Pošalji još jednu listu',
    'public.success.haveSection': 'Imam (Enesu fali)',
    'public.success.wantSection': 'Želim (Enes ima viška)',
    'public.lang': 'EN',
    'public.requiredName': 'Unesi ime.',
    'public.requiredContact': 'Unesi kontakt.',
  },
  en: {
    'public.title': 'Sticker swap',
    'public.subtitle': 'Tick what you have and what you want, then send.',
    'public.tab.have': 'I have ({count})',
    'public.tab.want': 'I want ({count})',
    'public.have.heading': "Cards I'm missing",
    'public.have.sub': 'Tick the ones you have spare.',
    'public.want.heading': 'Cards I have spare',
    'public.want.sub': 'Tick the ones you need.',
    'public.search.name': 'Player, team…',
    'public.search.code': 'Code, e.g. POR-5',
    'public.empty': 'No matches',
    'public.albumComplete': 'Album complete!',
    'public.noDoubles': 'No spares right now.',
    'public.submit': 'Send ({count})',
    'public.submit.zero': 'Tick at least one card',
    'public.modal.title': 'Your details',
    'public.modal.lead': "Leave a contact so I can reach out about the swap.",
    'public.modal.name': 'Name',
    'public.modal.namePh': 'Your name',
    'public.modal.contact': 'Contact',
    'public.modal.contactPh': 'Telegram, Instagram, email, phone…',
    'public.modal.note': 'Note',
    'public.modal.notePh': 'Anything else (e.g. which city). Optional.',
    'public.modal.summaryHave': 'You have ({count})',
    'public.modal.summaryWant': 'You want ({count})',
    'public.modal.send': 'Send',
    'public.modal.sending': 'Sending…',
    'public.modal.cancel': 'Cancel',
    'public.modal.error': 'Failed to send. Try again.',
    'public.success.title': 'Sent!',
    'public.success.body':
      "Thanks! I'll get back to you on the contact you left. Here's a recap for you — copy it or grab the CSV.",
    'public.success.copy': 'Copy list',
    'public.success.copied': 'Copied!',
    'public.success.csv': 'Download CSV',
    'public.success.again': 'Send another list',
    'public.success.haveSection': 'You have (Enes is missing)',
    'public.success.wantSection': 'You want (Enes has spare)',
    'public.lang': 'BS',
    'public.requiredName': 'Enter your name.',
    'public.requiredContact': 'Enter a contact.',
  },
} as const

export type TKey = keyof typeof T.bs

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'bs'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'bs' || saved === 'en') return saved
  } catch {}
  return 'bs'
}

function format(template: string, vars: Record<string, string | number> | undefined): string {
  if (!vars) return template
  return template.replace(/{(\w+)}/g, (_, key: string) => String(vars[key] ?? ''))
}

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TKey, vars?: Record<string, string | number>) => string
}

const Context = createContext<Ctx>({
  locale: 'bs',
  setLocale: () => {},
  t: (k) => k,
})

export function PublicLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }, [locale])

  function setLocale(l: Locale) {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {}
  }

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => format((T[locale][key] ?? T.bs[key] ?? key) as string, vars),
    }),
    [locale],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function usePublicLocale() {
  return useContext(Context)
}

export function usePublicT() {
  return useContext(Context).t
}
