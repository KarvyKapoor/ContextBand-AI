'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Check, ChevronRight, Clock3, Droplets, Leaf, ShieldCheck,
  Sparkles, X,
} from 'lucide-react'
import {
  type HistoryData, type ContextData, type DecisionData,
  getHistory, getCurrentContext, makeDecision, submitInterventionResponse,
} from '@/lib/api'
import {
  SectionTitle, LoadingState, ErrorState, EmptyState,
  getInterventionIcon, getInterventionColor, getFriendlyInterventionName, getResponseLabel, getResponseColor,
} from '@/components/shared-widgets'

export default function PageToday() {
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [context, setContext] = useState<ContextData | null>(null)
  const [decision, setDecision] = useState<DecisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const [hist, ctx] = await Promise.allSettled([getHistory(), getCurrentContext()])
      if (hist.status === 'fulfilled') setHistory(hist.value)
      if (ctx.status === 'fulfilled') setContext(ctx.value)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      if (!msg.includes('Session expired')) setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Filter today's entries
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEntries = (history?.entries || []).filter(e => new Date(e.decidedAt) >= todayStart)
  const todayCompleted = todayEntries.filter(e => e.response === 'COMPLETE').length
  const todayDismissed = todayEntries.filter(e => e.response === 'DISMISS').length
  const todayDelayed = todayEntries.filter(e => e.response === 'DELAY').length

  async function handleNewDecision() {
    if (!context) return
    try {
      const dec = await makeDecision(context.id)
      setDecision(dec)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get recommendation'
      setError(msg)
    }
  }

  async function handleResponse(decisionId: number, response: string) {
    if (responding) return
    try {
      setResponding(true)
      await submitInterventionResponse({ decisionId, response })
      setDecision(null)
      const hist = await getHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
    } finally {
      setResponding(false)
    }
  }

  if (loading) return <LoadingState message="Loading today..." />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  return (
    <div className="animate-page-in">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">ContextBand</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Today, in context</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        A gentle view of everything you&apos;ve done and what&apos;s next.
      </p>

      {/* Current context */}
      {context && (
        <div className="mt-6 glass-card rounded-3xl p-5">
          <SectionTitle eyebrow="Current context" title="Your latest check-in" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Time</p>
              <p className="mt-1 text-sm font-medium">{context.timeOfDay?.replace(/_/g, ' ')}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Activity</p>
              <p className="mt-1 text-sm font-medium">{context.activityLevel}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stress</p>
              <p className="mt-1 text-sm font-medium">{context.stressLevel}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Location</p>
              <p className="mt-1 text-sm font-medium">{context.locationCategory}</p>
            </div>
          </div>
          {!decision && (
            <button onClick={handleNewDecision} className="button-outline mt-4">
              <Sparkles className="h-4 w-4" /> Get new recommendation
            </button>
          )}
        </div>
      )}

      {/* Current decision */}
      {decision && (
        <div className="mt-5 recommendation-card rounded-3xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan/80">
                {getFriendlyInterventionName(decision.selectedIntervention.type)}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{decision.selectedIntervention.message}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{decision.explanation}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleResponse(decision.decisionId, 'COMPLETE')} disabled={responding} className="button-primary text-xs">
              <Check className="h-3.5 w-3.5" /> Complete
            </button>
            <button onClick={() => handleResponse(decision.decisionId, 'DELAY')} disabled={responding} className="button-outline text-xs">
              Not now
            </button>
            <button onClick={() => handleResponse(decision.decisionId, 'DISMISS')} disabled={responding} className="button-quiet text-xs">
              <X className="h-3.5 w-3.5" /> Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{todayEntries.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Interventions</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-green">{todayCompleted}</p>
          <p className="mt-1 text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-amber">{todayDelayed}</p>
          <p className="mt-1 text-xs text-muted-foreground">Delayed</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-muted-foreground">{todayDismissed}</p>
          <p className="mt-1 text-xs text-muted-foreground">Dismissed</p>
        </div>
      </div>

      {/* Today's timeline */}
      <div className="mt-6 glass-card rounded-3xl p-5">
        <SectionTitle eyebrow="Timeline" title="Today's care timeline" />
        {todayEntries.length === 0 ? (
          <EmptyState title="No interventions yet today" description="Complete a check-in from the dashboard to get started." />
        ) : (
          <div className="space-y-4">
            {todayEntries.map(entry => {
              const Icon = getInterventionIcon(entry.interventionType)
              const color = getInterventionColor(entry.interventionType)
              const time = new Date(entry.decidedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={entry.decisionId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className={`tone-icon tone-${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{getFriendlyInterventionName(entry.interventionType)}</p>
                    <p className="text-xs text-muted-foreground">{entry.interventionMessage?.substring(0, 60)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{time}</p>
                    <p className={`text-xs font-medium ${getResponseColor(entry.response)}`}>
                      {getResponseLabel(entry.response)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
