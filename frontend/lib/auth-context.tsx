'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  type AuthData,
  getStoredUser,
  setStoredUser,
  setToken,
  clearToken,
  getMe,
} from '@/lib/api'

interface AuthContextValue {
  user: AuthData | null
  loading: boolean
  setAuth: (user: AuthData) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setAuth: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthData | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to load user from storage and validate with API
  useEffect(() => {
    let cancelled = false
    async function init() {
      const stored = getStoredUser()
      if (stored?.token) {
        try {
          const me = await getMe()
          if (!cancelled) {
            const full: AuthData = { ...stored, ...me }
            setUser(full)
            setStoredUser(full)
          }
        } catch {
          if (!cancelled) {
            clearToken()
            setUser(null)
          }
        }
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Listen for 401 events from apiFetch
  useEffect(() => {
    function onExpired() {
      setUser(null)
      clearToken()
    }
    window.addEventListener('cb-auth-expired', onExpired)
    return () => window.removeEventListener('cb-auth-expired', onExpired)
  }, [])

  const setAuth = useCallback((authData: AuthData) => {
    setToken(authData.token)
    setStoredUser(authData)
    setUser(authData)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(prev => {
        if (!prev) return prev
        const updated = { ...prev, ...me }
        setStoredUser(updated)
        return updated
      })
    } catch {
      clearToken()
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, setAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
