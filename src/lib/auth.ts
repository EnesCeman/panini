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
  const auth = useAuth()
  const [check, setCheck] = useState<AdminCheck>({ status: 'loading' })

  useEffect(() => {
    if (auth.status === 'loading') {
      setCheck({ status: 'loading' })
      return
    }
    if (auth.status === 'signed-out') {
      setCheck({ status: 'not-signed-in' })
      return
    }
    const uid = auth.user.uid
    let cancelled = false
    getDoc(doc(db, 'admins', uid))
      .then((snap) => {
        if (cancelled) return
        setCheck(
          snap.exists()
            ? { status: 'admin', uid }
            : { status: 'not-admin', uid },
        )
      })
      .catch(() => {
        if (!cancelled) setCheck({ status: 'not-admin', uid })
      })
    return () => {
      cancelled = true
    }
  }, [auth])

  return check
}
