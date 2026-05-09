import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Locale = 'en' | 'bs'

const STORAGE_KEY = 'panini.locale'

// Translation table. Add a key in `en` first; the type system will then
// require the same key in `bs`. Strings can use `{name}` for interpolation.
const translations = {
  en: {
    // MarketShell
    'shell.brand': 'Panini WC 2026 · Sticker Swap',
    'shell.subtitle': 'World Cup 2026 album',
    'shell.lang.toggle': 'Language',

    // Browse — tabs
    'browse.tab.spares': 'Spares · {count}',
    'browse.tab.missing': 'Missing · {count}',

    // Browse — intro
    'browse.intro.title': 'Hey! Looking to swap World Cup stickers?',
    'browse.intro.lead':
      'Tabs below: my spares (cards I have spare for swap) and my missing (cards I still need). Tap any to start a proposal with it pre-selected.',
    'browse.intro.howTitle': 'How to build a trade',
    'browse.intro.howOffer':
      "Start with what you'd offer: tap a card from Cards I'm missing, then multi-select which of my spares you want in return.",
    'browse.intro.howWant':
      'Or start with what you want: tap a card from Cards I have spare, then multi-select which of my missing you’d send my way.',
    'browse.intro.ratioTitle': 'Per-trade ratio (one side must equal 1)',
    'browse.intro.ratio1m':
      '1 of yours → up to 5 of mine (offer one card I need for up to five of my spares).',
    'browse.intro.ratioN1':
      'Many of yours → exactly 1 of mine (sweeten the deal: send several cards I need for one specific spare of mine).',
    'browse.intro.otherTitle': 'Other things to know',
    'browse.intro.otherBundle':
      'You can bundle multiple trades into a single proposal — add as many trades as you want before submitting.',
    'browse.intro.otherEdit':
      'Everything is editable before you submit: remove cards, change quantities, or scrap a trade and start over.',
    'browse.intro.otherWithdraw':
      "After submitting you can't edit, but you'll get a tracking link and can withdraw if you change your mind.",
    'browse.intro.outro':
      "Whether to accept is up to me — your proposal lands in my inbox and I'll review it.",

    // Browse — sections
    'browse.section.spares.title': 'Cards I have spare ({count})',
    'browse.section.spares.subtitle':
      'Anything you want? Tap a team to expand, then tap a card.',
    'browse.section.missing.title': "Cards I'm missing ({count})",
    'browse.section.missing.subtitle':
      'You might have one of these? Search or tap a team to expand.',
    'browse.cta.buildCustom': 'Build a custom proposal',
    'browse.noMatches': 'No matches',

    // Search
    'search.placeholder.name': 'Player, team…',
    'search.placeholder.team_or_badge': 'Player, team, badge…',
    'search.placeholder.code': 'Code, e.g. POR-5',
    'search.mode.name': 'Name',
    'search.mode.code': 'Code',

    // Reservation badge
    'badge.incoming': 'incoming',
    'badge.incomingMulti': 'incoming ×{count}',
    'badge.allReserved': 'all reserved',
    'badge.partialReserved': '{count} reserved',

    // Sticker picker
    'picker.title.offer': 'Pick stickers you have to offer',
    'picker.title.want': 'Pick stickers you want',
    'picker.tapToSelect': 'Tap to select.',
    'picker.upTo': 'Up to {count, plural, one {# sticker} other {# stickers}}.',
    'picker.add': 'Add {count, plural, one {# sticker} other {# stickers}}',
    'picker.close': 'Close',

    // Trade row
    'trade.row.title': 'Trade {n}',
    'trade.row.remove': 'Remove trade',
    'trade.offer.label': "Cards you're offering (from my missing list)",
    'trade.offer.add': 'Add cards to offer',
    'trade.offer.multiHint': 'Multiple offered → pick exactly 1 of my spares below.',
    'trade.want.label': 'Cards you want from me ({total} / {max} of my spares)',
    'trade.want.add': 'Add cards you want',
    'trade.want.spareCount': '{available} available',
    'trade.qty.dec': 'Decrement qty',
    'trade.qty.inc': 'Increment qty',
    'trade.entry.remove': 'Remove requested',

    // New proposal
    'new.title': 'New proposal',
    'new.lead':
      'Each trade: 1 you offer for up to 5 you want, OR many you offer for exactly 1 you want.',
    'new.addTrade': 'Add another trade',
    'new.details.title': 'Your details',
    'new.details.required': '* required',
    'new.details.name': 'Your name',
    'new.details.contact': 'Contact (email, phone, IG handle…)',
    'new.details.contactPlaceholder': 'me@example.com',
    'new.details.note': 'Note',
    'new.details.noteOptional': '(optional)',
    'new.details.notePlaceholder': 'e.g., can ship from Lisbon',
    'new.submit': 'Submit proposal',
    'new.submit.busy': 'Submitting…',
    'new.cancel': 'Cancel and go back',
    'new.error.failed': 'Failed to submit. Try again.',
    'new.error.cannot': 'Cannot submit: {reason}',

    // Proposal tracking
    'tracking.back': 'Back to browse',
    'tracking.submitted.title': 'Submitted!',
    'tracking.submitted.body': "Save this URL to track status — there's no login.",
    'tracking.copyLink': 'Copy link',
    'tracking.status.pending': 'Pending — awaiting decision',
    'tracking.status.accepted': 'Accepted — arrange the swap',
    'tracking.status.rejected': 'Rejected',
    'tracking.status.withdrawn': 'Withdrawn',
    'tracking.status.completed': 'Completed',
    'tracking.status.cancelled': 'Cancelled',
    'tracking.trades': 'Trades',
    'tracking.trade.n': 'Trade {n}',
    'tracking.trade.offer': 'I offer',
    'tracking.trade.want': 'I want',
    'tracking.note.your': 'Your note',
    'tracking.note.owner': 'Owner reply',
    'tracking.withdraw': 'Cancel proposal',
    'tracking.withdraw.busy': 'Withdrawing…',
    'tracking.withdraw.confirm': 'Withdraw this proposal? This cannot be undone.',
    'tracking.withdraw.failed': 'Failed to withdraw.',
    'tracking.notFound': 'Proposal not found.',
    'tracking.loading': 'Loading…',

    // Card kinds (in trade chips, etc.)
    'card.badge': 'Team badge',
    'card.teamPhoto': 'Team photo',

    // Misc
    'common.cancel': 'Cancel',
  },

  bs: {
    // MarketShell
    'shell.brand': 'Panini SP 2026 · Razmjena sličica',
    'shell.subtitle': 'Album Svjetskog prvenstva 2026',
    'shell.lang.toggle': 'Jezik',

    // Browse — tabs
    'browse.tab.spares': 'Viška · {count}',
    'browse.tab.missing': 'Fale · {count}',

    // Browse — intro
    'browse.intro.title': 'Zdravo! Tražiš zamjenu sličica sa Svjetskog prvenstva?',
    'browse.intro.lead':
      'U karticama ispod: sličice koje imam viška (za zamjenu) i one koje mi još fale. Klikni bilo koju da pokreneš prijedlog razmjene s njom već odabranom.',
    'browse.intro.howTitle': 'Kako sastaviti razmjenu',
    'browse.intro.howOffer':
      'Kreni od onoga što ti nudiš: klikni karticu iz „Sličice koje mi fale“, pa odaberi više mojih sličica viška koje želiš zauzvrat.',
    'browse.intro.howWant':
      'Ili kreni od onoga što želiš: klikni karticu iz „Sličice koje imam viška“, pa odaberi više mojih koje mi fale, a ti ih imaš.',
    'browse.intro.ratioTitle': 'Omjer u jednoj razmjeni (jedna strana mora biti 1)',
    'browse.intro.ratio1m':
      '1 tvoja → do 5 mojih (jedna sličica koja mi fali za do pet mojih viška).',
    'browse.intro.ratioN1':
      'Više tvojih → tačno 1 moja (zasladi ponudu: pošalji više sličica koje mi fale za jednu konkretnu moju koja ti treba).',
    'browse.intro.otherTitle': 'Još par stvari',
    'browse.intro.otherBundle':
      'Više razmjena možeš spojiti u jedan prijedlog — dodaj koliko god trebaš prije slanja.',
    'browse.intro.otherEdit':
      'Sve je promjenjivo prije slanja: ukloni sličice, promijeni količine ili obriši razmjenu i počni iz početka.',
    'browse.intro.otherWithdraw':
      'Nakon slanja ne možeš mijenjati, ali dobiješ link za praćenje i možeš povući prijedlog ako se predomisliš.',
    'browse.intro.outro':
      'Da li ću prihvatiti zavisi od mene — tvoj prijedlog dolazi u moj inbox i ja ga pregledam.',

    // Browse — sections
    'browse.section.spares.title': 'Sličice koje imam viška ({count})',
    'browse.section.spares.subtitle':
      'Nešto ti se sviđa? Klikni tim da raširiš, pa klikni karticu.',
    'browse.section.missing.title': 'Sličice koje mi fale ({count})',
    'browse.section.missing.subtitle':
      'Možda neku od ovih imaš? Pretraži ili klikni tim da raširiš.',
    'browse.cta.buildCustom': 'Napravi vlastiti prijedlog',
    'browse.noMatches': 'Nema rezultata',

    // Search
    'search.placeholder.name': 'Igrač, tim…',
    'search.placeholder.team_or_badge': 'Igrač, tim, grb…',
    'search.placeholder.code': 'Kod, npr. POR-5',
    'search.mode.name': 'Ime',
    'search.mode.code': 'Kod',

    // Reservation badge
    'badge.incoming': 'dolazi',
    'badge.incomingMulti': 'dolazi ×{count}',
    'badge.allReserved': 'sve rezervisano',
    'badge.partialReserved': '{count} rezervisano',

    // Sticker picker
    'picker.title.offer': 'Odaberi sličice koje nudiš',
    'picker.title.want': 'Odaberi sličice koje želiš',
    'picker.tapToSelect': 'Klikni da odabereš.',
    'picker.upTo':
      'Do {count, plural, one {# sličice} few {# sličice} other {# sličica}}.',
    'picker.add':
      'Dodaj {count, plural, one {# sličicu} few {# sličice} other {# sličica}}',
    'picker.close': 'Zatvori',

    // Trade row
    'trade.row.title': 'Razmjena {n}',
    'trade.row.remove': 'Ukloni razmjenu',
    'trade.offer.label': 'Sličice koje nudiš (sa moje liste „fale“)',
    'trade.offer.add': 'Dodaj sličice koje nudiš',
    'trade.offer.multiHint':
      'Više tvojih → odaberi tačno 1 moju iz viška ispod.',
    'trade.want.label': 'Sličice koje želiš ({total} / {max} mojih viška)',
    'trade.want.add': 'Dodaj sličice koje želiš',
    'trade.want.spareCount': '{available} dostupno',
    'trade.qty.dec': 'Smanji količinu',
    'trade.qty.inc': 'Povećaj količinu',
    'trade.entry.remove': 'Ukloni stavku',

    // New proposal
    'new.title': 'Novi prijedlog',
    'new.lead':
      'Svaka razmjena: 1 tvoja za do 5 mojih, ILI više tvojih za tačno 1 moju.',
    'new.addTrade': 'Dodaj još jednu razmjenu',
    'new.details.title': 'Tvoji podaci',
    'new.details.required': '* obavezno',
    'new.details.name': 'Tvoje ime',
    'new.details.contact': 'Kontakt (email, telefon, IG…)',
    'new.details.contactPlaceholder': 'ja@primjer.com',
    'new.details.note': 'Napomena',
    'new.details.noteOptional': '(neobavezno)',
    'new.details.notePlaceholder': 'npr. mogu poslati iz Sarajeva',
    'new.submit': 'Pošalji prijedlog',
    'new.submit.busy': 'Šaljem…',
    'new.cancel': 'Otkaži i nazad',
    'new.error.failed': 'Slanje nije uspjelo. Pokušaj ponovo.',
    'new.error.cannot': 'Ne mogu poslati: {reason}',

    // Proposal tracking
    'tracking.back': 'Nazad na pregled',
    'tracking.submitted.title': 'Poslano!',
    'tracking.submitted.body':
      'Sačuvaj ovaj URL da pratiš status — nema prijave.',
    'tracking.copyLink': 'Kopiraj link',
    'tracking.status.pending': 'Na čekanju — čeka odluku',
    'tracking.status.accepted': 'Prihvaćeno — dogovorite razmjenu',
    'tracking.status.rejected': 'Odbijeno',
    'tracking.status.withdrawn': 'Povučeno',
    'tracking.status.completed': 'Završeno',
    'tracking.status.cancelled': 'Otkazano',
    'tracking.trades': 'Razmjene',
    'tracking.trade.n': 'Razmjena {n}',
    'tracking.trade.offer': 'Nudim',
    'tracking.trade.want': 'Želim',
    'tracking.note.your': 'Tvoja napomena',
    'tracking.note.owner': 'Odgovor vlasnika',
    'tracking.withdraw': 'Otkaži prijedlog',
    'tracking.withdraw.busy': 'Otkazujem…',
    'tracking.withdraw.confirm':
      'Povući prijedlog? Ovo se ne može poništiti.',
    'tracking.withdraw.failed': 'Otkazivanje nije uspjelo.',
    'tracking.notFound': 'Prijedlog nije pronađen.',
    'tracking.loading': 'Učitavanje…',

    // Card kinds
    'card.badge': 'Grb tima',
    'card.teamPhoto': 'Slika tima',

    // Misc
    'common.cancel': 'Otkaži',
  },
} as const

export type TKey = keyof typeof translations.en

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'bs') return saved
  } catch {}
  const lang = (navigator.language ?? 'en').toLowerCase()
  if (
    lang.startsWith('bs') ||
    lang.startsWith('sr') ||
    lang.startsWith('hr') ||
    lang.startsWith('cnr') ||
    lang.startsWith('me')
  ) {
    return 'bs'
  }
  return 'en'
}

// Bosnian plural form selector. CLDR rules: one (1, 21, 31, but not 11),
// few (2-4, 22-24, 32-34, but not 12-14), other (everything else).
function bsPluralForm(n: number): 'one' | 'few' | 'other' {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'one'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
  return 'other'
}

// Replaces `{var}` with values, handles `{var, plural, ...}` for plural forms.
function format(
  template: string,
  vars: Record<string, string | number> | undefined,
  locale: Locale,
): string {
  if (!vars) return template
  return template.replace(
    /{(\w+)(?:,\s*plural,\s*([^}]+))?}/g,
    (_, name: string, pluralBody?: string) => {
      const value = vars[name]
      if (pluralBody) {
        const count = Number(value)
        const form =
          locale === 'bs'
            ? bsPluralForm(count)
            : count === 1
              ? 'one'
              : 'other'
        // Parse "one {x} few {y} other {z}" forms
        const formMap: Record<string, string> = {}
        const re = /(one|few|many|other|=\d+)\s*\{([^}]*)\}/g
        let m: RegExpExecArray | null
        while ((m = re.exec(pluralBody)) !== null) {
          formMap[m[1]] = m[2]
        }
        const exact = formMap[`=${count}`]
        const chosen = exact ?? formMap[form] ?? formMap.other ?? formMap.one ?? ''
        return chosen.replace(/#/g, String(count))
      }
      return String(value ?? '')
    },
  )
}

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TKey, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<Ctx>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
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
      t: (key, vars) => {
        const dict = translations[locale]
        const raw = (dict[key] ?? translations.en[key] ?? key) as string
        return format(raw, vars, locale)
      },
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}

export function useT() {
  return useContext(LocaleContext).t
}
