// Player names printed in the physical Panini WC 2026 album, used as a
// fallback when no user-entered name exists in Firestore. Keyed by
// sticker code (TEAM-NUM). Stickers 1 (badge) and 13 (team photo) are
// intentionally omitted — those have fixed labels.
//
// Data is filled in incrementally by reading album spread photos.
// Missing entries simply fall through to the sticker code (e.g. POR-3).

export const ALBUM_PLAYER_NAMES: Record<string, string> = {
  // Group A — Mexico
  'MEX-2': 'Luis Malagón',
  'MEX-3': 'Johan Vásquez',
  'MEX-4': 'Jorge Sánchez',
  'MEX-5': 'César Montes',
  'MEX-6': 'Jesús Gallardo',
  'MEX-7': 'Israel Reyes',
  'MEX-8': 'Diego Lainez',
  'MEX-9': 'Carlos Rodríguez',
  'MEX-10': 'Edson Álvarez',
  'MEX-11': 'Orbelín Pineda',
  'MEX-12': 'Marcel Ruiz',
  'MEX-14': 'Érick Sánchez',
  'MEX-15': 'Hirving Lozano',
  'MEX-16': 'Santiago Giménez',
  'MEX-17': 'Raúl Jiménez',
  'MEX-19': 'Roberto Alvarado',
  'MEX-20': 'César Huerta',

  // Group A — South Africa
  'RSA-2': 'Ronwen Williams',
  'RSA-3': 'Sipho Chaine',
  'RSA-4': 'Aubrey Modiba',
  'RSA-5': 'Samukele Kabini',
  'RSA-6': 'Mbekezeli Mbokazi',
  'RSA-7': 'Khulumani Ndamane',
  'RSA-8': 'Siyabonga Ngezana',
  'RSA-9': 'Khuliso Mudau',
  'RSA-11': 'Teboho Mokoena',
  'RSA-12': 'Thalente Mbatha',
  'RSA-19': 'Mohau Nkota',
  'RSA-20': 'Oswin Appollis',

  // Group A — Korea Republic
  'KOR-2': 'Hyeonwoo Jo',
  'KOR-3': 'Seunggyu Kim',
  'KOR-4': 'Minjae Kim',
  'KOR-5': 'Yuhan Cho',
  'KOR-6': 'Youngwoo Seol',
  'KOR-7': 'Hanbeom Lee',
  'KOR-8': 'Taeseok Lee',
  'KOR-9': 'Myungjae Lee',
  'KOR-10': 'Jaesung Lee',
  'KOR-11': 'Inbeom Hwang',
  'KOR-12': 'Kangin Lee',
  'KOR-14': 'Seungho Paik',
  'KOR-16': 'Donggyeong Lee',
  'KOR-17': 'Guesung Cho',
  'KOR-18': 'Heungmin Son',
  'KOR-19': 'Heechan Hwang',
  'KOR-20': 'Hyeongyu Oh',

  // Group A — Czechia
  'CZE-2': 'Matěj Kovář',
  'CZE-3': 'Jindřich Staněk',
  'CZE-4': 'Ladislav Krejčí',
  'CZE-5': 'Vladimír Coufal',
  'CZE-6': 'Jaroslav Zelený',
  'CZE-7': 'Tomáš Holeš',
  'CZE-8': 'David Zima',
  'CZE-9': 'Michal Sadílek',
  'CZE-10': 'Lukáš Provod',
  'CZE-11': 'Lukáš Červ',
  'CZE-12': 'Tomáš Souček',
  'CZE-14': 'Pavel Šulc',
  'CZE-15': 'Matěj Vydra',
  'CZE-16': 'Vasil Kušej',
  'CZE-17': 'Tomáš Chorý',
  'CZE-18': 'Václav Černý',
  'CZE-19': 'Adam Hložek',
  'CZE-20': 'Patrik Schick',
}
