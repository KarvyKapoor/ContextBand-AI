'use client'

import { useState } from 'react'
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { loginUser, registerUser } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type Mode = 'login' | 'register'

export default function AuthScreen() {
  const { setAuth } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await loginUser({ username, password })
        setAuth(data)
      } else {
        const data = await registerUser({
          username,
          email,
          password,
          displayName: displayName || username,
        })
        setAuth(data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-sm animate-page-in">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="logo-mark" style={{ width: 44, height: 44, borderRadius: 14 }}>
              <span style={{ width: 16, height: 16 }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-tight">ContextBand</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Care, in context
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <h1 className="mb-1 text-xl font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to continue your care routine.'
                : 'Start your personalized care journey.'}
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan/40 focus:bg-white/[0.06]"
                  placeholder="your username"
                />
              </div>

              {/* Email (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan/40 focus:bg-white/[0.06]"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              {/* Display name (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    Display name <span className="text-muted-foreground/50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan/40 focus:bg-white/[0.06]"
                    placeholder="How you'd like to be called"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan/40 focus:bg-white/[0.06]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="button-primary mt-2 flex w-full items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
            </form>

            {/* Toggle mode */}
            <p className="mt-5 text-center text-xs text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setMode('register'); setError('') }}
                    className="text-cyan transition-colors hover:underline"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError('') }}
                    className="text-cyan transition-colors hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-6 text-center text-[10px] text-muted-foreground/50">
            ContextBand &middot; Adaptive chronic care
          </p>
        </div>
      </div>
    </div>
  )
}
