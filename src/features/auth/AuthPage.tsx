import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/errors'
import { Button, Card, Field, Logo } from '../../components/ui'
import { APP_NAME } from '../../lib/app'
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from './authService'
import { useAuth } from './AuthProvider'

type Mode = 'signin' | 'signup' | 'forgot'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        const { session } = await signUp(email, password)
        if (!session) setNotice('Check your email to confirm your account, then sign in.')
      } else {
        await requestPasswordReset(email)
        setNotice('If that account exists, a reset link is on its way.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const title = { signin: 'Welcome back', signup: 'Create your account', forgot: 'Reset password' }[mode]

  return (
    <Shell>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <form onSubmit={submit} className="space-y-3">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== 'forgot' && (
            <Field
              label="Password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : { signin: 'Sign in', signup: 'Sign up', forgot: 'Send reset link' }[mode]}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm text-slate-600">
          {mode === 'signin' ? (
            <>
              <button className="underline" onClick={() => switchMode('signup')}>Create account</button>
              <button className="underline" onClick={() => switchMode('forgot')}>Forgot password?</button>
            </>
          ) : (
            <button className="underline" onClick={() => switchMode('signin')}>Back to sign in</button>
          )}
        </div>
      </Card>
    </Shell>
  )
}

/** Shown after following a password-recovery email link. */
export function ResetPasswordPage() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      finishRecovery()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Choose a new password</h2>
        <form onSubmit={submit} className="space-y-3">
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </Shell>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <div className="animate-fade-up flex flex-col items-center gap-3">
        <Logo size={56} />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">A shared daily list for two</p>
        </div>
      </div>
      {children}
    </main>
  )
}
