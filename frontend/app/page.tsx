'use client'

import { useAuth } from '@/lib/auth-context'
import AuthScreen from '@/components/auth-screen'
import ContextBandDashboard from '@/components/context-band-dashboard'

export default function Page() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-page-in text-center">
            <div className="logo-mark mx-auto mb-4" style={{ width: 44, height: 44, borderRadius: 14 }}>
              <span style={{ width: 16, height: 16 }} />
            </div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return <ContextBandDashboard />
}
