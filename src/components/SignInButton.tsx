import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, signOut, useAuth } from '@/lib/auth'

export function SignInButton() {
  const auth = useAuth()
  if (auth.status === 'loading') return null
  if (auth.status === 'signed-out') {
    return (
      <Button type="button" variant="outline" onClick={() => void signInWithGoogle()}>
        <LogIn className="h-4 w-4" />
        <span>Sign in with Google</span>
      </Button>
    )
  }
  return (
    <Button type="button" variant="ghost" onClick={() => void signOut()}>
      <LogOut className="h-4 w-4" />
      <span>Sign out</span>
    </Button>
  )
}
