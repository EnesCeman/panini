#!/usr/bin/env node
// Dumps stickers + proposals + admins to backups/<timestamp>.json
// Reads .env.local for VITE_FIREBASE_* config.
// Run: node scripts/backup-firestore.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

function loadEnv(path) {
  const text = readFileSync(path, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  return env
}

const env = loadEnv(join(root, '.env.local'))

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

function serializeValue(v) {
  if (v === null || v === undefined) return v
  if (v && typeof v.toMillis === 'function') {
    return { __ts: v.toMillis() }
  }
  if (Array.isArray(v)) return v.map(serializeValue)
  if (typeof v === 'object') {
    const out = {}
    for (const [k, vv] of Object.entries(v)) out[k] = serializeValue(vv)
    return out
  }
  return v
}

async function dumpCollection(name) {
  const snap = await getDocs(collection(db, name))
  const docs = {}
  snap.forEach((d) => {
    docs[d.id] = serializeValue(d.data())
  })
  console.log(`  ${name}: ${snap.size} docs`)
  return docs
}

async function main() {
  console.log(`Backing up project ${env.VITE_FIREBASE_PROJECT_ID}…`)
  const data = {
    project: env.VITE_FIREBASE_PROJECT_ID,
    takenAt: new Date().toISOString(),
    collections: {
      stickers: await dumpCollection('stickers'),
      proposals: await dumpCollection('proposals'),
    },
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = join(root, 'backups')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `firestore-${stamp}.json`)
  writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`Saved → ${outPath}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Backup failed:', err)
  process.exit(1)
})
