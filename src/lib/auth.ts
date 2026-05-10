import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { auth, db } from './firebase'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, provider)
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User }

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState(user ? { status: 'signed-in', user } : { status: 'signed-out' })
    })
  }, [])
  return state
}

export type AdminCheck =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'not-admin'; uid: string }
  | { status: 'admin'; uid: string }

export function useIsAdmin(): AdminCheck {
  const authState = useAuth()
  const [check, setCheck] = useState<AdminCheck>({ status: 'loading' })

  useEffect(() => {
    if (authState.status === 'loading') {
      setCheck({ status: 'loading' })
      return
    }
    if (authState.status === 'signed-out') {
      setCheck({ status: 'not-signed-in' })
      return
    }
    const uid = authState.user.uid
    let cancelled = false

    // Right after sign-in (especially after a domain change forces a fresh
    // session), the Firestore client can briefly lack the new auth token
    // and return permission-denied on the admins lookup. That used to flip
    // the user to 'not-admin' and flash the rejection screen even though
    // they were a real admin. Retry a few times with backoff so transient
    // errors stay as 'loading'; only a confirmed missing doc marks
    // not-admin.
    async function check() {
      const delays = [0, 400, 900, 1800]
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (cancelled) return
        if (delays[attempt] > 0) {
          await new Promise((r) => setTimeout(r, delays[attempt]))
          if (cancelled) return
        }
        try {
          const snap = await getDoc(doc(db, 'admins', uid))
          if (cancelled) return
          setCheck(
            snap.exists()
              ? { status: 'admin', uid }
              : { status: 'not-admin', uid },
          )
          return
        } catch (err) {
          if (attempt === delays.length - 1) {
            console.error('admin check failed after retries', err)
            if (!cancelled) setCheck({ status: 'not-admin', uid })
            return
          }
        }
      }
    }
    void check()

    return () => {
      cancelled = true
    }
  }, [authState])

  return check
}
