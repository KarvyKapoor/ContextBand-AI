'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Check, TrendingUp, Target, Sparkles, Award,
} from 'lucide-react'
import { type HistoryData, getHistory } from '@/lib/api'
import {
  LoadingState, ErrorState, EmptyState,
  getInterventionIcon, getInterventionColor, getFriendlyInterventionName, getResponseLabel, getResponseColor,
} from '@/components/shared-widgets'

export default function PageProgress() {
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const hist = await getHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      if (!msg.includes('Session expired')) setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState message="Loading progress..." />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  const entries = history?.entries || []
  const totalDecisions = history?.totalDecisions || 0
  const completedCount = history?.completedCount || 0
  const avgReward = history?.averageReward || 0
  const completionRate = totalDecisions > 0 ? Math.round((completedCount / totalDecisions) * 100) : 0
  const dismissedCount = entries.filter(e => e.response === 'DISMISS').length
  const delayedCount = entries.filter(e => e.response === 'DELAY').length

  // Count by intervention type
  const typeCount: Record<string, { total: number; completed: number }> = {}
  entries.forEach(e => {
    if (!typeCount[e.interventionType]) {
      typeCount[e.interventionType] = { total: 0, completed: 0 }
    }
    typeCount[e.interventionType].total++
    if (e.response === 'COMPLETE') typeCount[e.interventionType].completed++
  })

  // Recent 7 days activity
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekEntries = entries.filter(e => new Date(e.decidedAt) >= weekAgo)
  const weekCompleted = weekEntries.filter(e => e.response === 'COMPLETE').length

  return (
    <div className="animate-page-in">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">ContextBand</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your progress</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Small actions, made visible.
      </p>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <Target className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{totalDecisions}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total decisions</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{completedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{completionRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Completion rate</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{avgReward.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Avg reward</p>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="mt-6 glass-card rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-amber" />
          <div>
            <h3 className="font-semibold">This week</h3>
            <p className="text-sm text-muted-foreground">
              {weekCompleted} of {weekEntries.length || 0} interventions completed in the last 7 days
            </p>
          </div>
        </div>
        {weekEntries.length > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
              style={{ width: `${Math.round((weekCompleted / weekEntries.length) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Breakdown by intervention type */}
      {Object.keys(typeCount).length > 0 && (
        <div className="mt-6 glass-card rounded-3xl p-5">
          <h3 className="mb-4 font-semibold">By intervention type</h3>
          <div className="space-y-3">
            {Object.entries(typeCount)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([type, counts]) => {
                const Icon = getInterventionIcon(type)
                const color = getInterventionColor(type)
                const rate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
                return (
                  <div key={type} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className={`tone-icon tone-${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{getFriendlyInterventionName(type)}</p>
                      <p className="text-xs text-muted-foreground">{counts.completed}/{counts.total} completed ({rate}%)</p>
                    </div>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-${color}`} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Recent history */}
      <div className="mt-6 glass-card rounded-3xl p-5">
        <h3 className="mb-4 font-semibold">Recent activity</h3>
        {entries.length === 0 ? (
          <EmptyState title="No history yet" description="Start by completing a check-in from the dashboard." />
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map(entry => {
              const Icon = getInterventionIcon(entry.interventionType)
              const time = new Date(entry.decidedAt).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={entry.decisionId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{getFriendlyInterventionName(entry.interventionType)}</p>
                    <p className="text-xs text-muted-foreground">{time}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${getResponseColor(entry.response)}`}>
                      {getResponseLabel(entry.response)}
                    </p>
                    {entry.rewardValue !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        {entry.rewardValue >= 0 ? '+' : ''}{entry.rewardValue} reward
                      </p>
                    )}
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
