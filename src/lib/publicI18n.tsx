import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'bs' | 'en'

const STORAGE_KEY = 'panini.locale'

const T = {
  bs: {
    'public.title': 'Razmjena sličica',
    'public.subtitle':
      'Klikni sve što imaš viška i sve što ti fali, pa pošalji. Meni stiže lista i javim ti se na kontakt koji ostaviš — a ti je možeš i preuzeti za sebe.',
    'public.tab.have': 'Meni nedostaju ({count})',
    'public.tab.want': 'Moji duplikati ({count})',
    'public.have.heading': 'Ovo su sličice koje meni nedostaju',
    'public.have.sub': 'Označi one koje ti imaš viška, javim ti se.',
    'public.want.heading': 'Ovo su moji duplikati',
    'public.want.sub': 'Označi one koje tebi trebaju.',
    'public.col.iNeed': 'Označi sličice koje TI trebaš, iz mojih duplikata',
    'public.col.iHave': 'Označi sličice koje TI imaš viška, a meni trebaju',
    'public.you.label': 'Tvoji podaci',
    'public.you.sub': 'Da ti se javim oko razmjene.',
    'public.spare.one': '{count} duplikat',
    'public.spare.few': '{count} duplikata',
    'public.spare.other': '{count} duplikata',
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
    'public.modal.contactPh': 'Kontakt',
    'public.modal.note': 'Poruka',
    'public.modal.notePh': 'Bilo šta dodatno (npr. iz kojeg dijela Sarajeva si). Neobavezno.',
    'public.modal.summaryHave': 'Imaš ({count})',
    'public.modal.summaryWant': 'Trebaš ({count})',
    'public.modal.send': 'Pošalji',
    'public.modal.sending': 'Šaljem…',
    'public.modal.cancel': 'Odustani',
    'public.modal.error': 'Slanje nije uspjelo. Pokušaj ponovo.',
    'public.success.title': 'Poslano!',
    'public.success.body':
      'Hvala! Javit ću ti se na ostavljeni kontakt. Ovdje je sažetak za tebe — kopiraj ili preuzmi CSV ako ti treba.',
    'public.success.copy': 'Kopiraj listu',
    'public.success.copied': 'Kopirano!',
    'public.success.csv': 'Preuzmi CSV',
    'public.success.again': 'Pošalji još jednu listu',
    'public.success.haveSection': 'Imam (Enesu fali)',
    'public.success.wantSection': 'Trebam (Enes ima viška)',
    'public.lang': 'EN',
    'public.requiredName': 'Unesi ime.',
    'public.requiredContact': 'Unesi kontakt.',
  },
  en: {
    'public.title': 'Sticker swap',
    'public.subtitle':
      "Tick everything you have spare and everything you're missing, then send. I'll get the list and reach out on the contact you leave — and you can download a copy for yourself.",
    'public.tab.have': "What I'm missing ({count})",
    'public.tab.want': 'My duplicates ({count})',
    'public.have.heading': "These are the cards I'm missing",
    'public.have.sub': "Tick the ones you have spare and I'll reach out.",
    'public.want.heading': 'These are my duplicates',
    'public.want.sub': 'Tick the ones you need.',
    'public.col.iNeed': 'Select stickers YOU need, from my duplicates',
    'public.col.iHave': 'Select stickers YOU have as duplicates that I need',
    'public.you.label': 'Your info',
    'public.you.sub': "So I can reach out about the swap.",
    'public.spare.one': '{count} spare',
    'public.spare.few': '{count} spare',
    'public.spare.other': '{count} spare',
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
    'public.modal.contactPh': 'Contact',
    'public.modal.note': 'Note',
    'public.modal.notePh': 'Anything else (e.g. which area in Sarajevo). Optional.',
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

// CLDR-ish plural form selector. Bosnian: one (1, 21, 31, but not 11),
// few (2-4, 22-24, but not 12-14), other (everything else).
export function pluralForm(n: number, locale: Locale): 'one' | 'few' | 'other' {
  if (locale === 'bs') {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'one'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
    return 'other'
  }
  return n === 1 ? 'one' : 'other'
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
