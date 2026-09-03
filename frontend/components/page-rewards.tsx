'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Trophy, Check, Sparkles, TrendingUp, Star, Award,
} from 'lucide-react'
import { type HistoryData, getHistory } from '@/lib/api'
import {
  LoadingState, ErrorState, EmptyState,
  getInterventionIcon, getInterventionColor, getFriendlyInterventionName, getResponseLabel, getResponseColor,
} from '@/components/shared-widgets'

export default function PageRewards() {
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

  if (loading) return <LoadingState message="Loading rewards..." />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  const entries = history?.entries || []
  const completedEntries = entries.filter(e => e.response === 'COMPLETE')
  const totalReward = entries.reduce((sum, e) => sum + (e.rewardValue || 0), 0)
  const totalCompleted = history?.completedCount || 0
  const avgReward = history?.averageReward || 0

  // Reward breakdown
  const completeCount = entries.filter(e => e.response === 'COMPLETE').length
  const dismissCount = entries.filter(e => e.response === 'DISMISS').length
  const delayCount = entries.filter(e => e.response === 'DELAY').length

  // Best performing intervention type
  const typeReward: Record<string, { total: number; count: number; avg: number }> = {}
  entries.forEach(e => {
    if (!typeReward[e.interventionType]) {
      typeReward[e.interventionType] = { total: 0, count: 0, avg: 0 }
    }
    typeReward[e.interventionType].total += e.rewardValue || 0
    typeReward[e.interventionType].count++
  })
  Object.values(typeReward).forEach(v => {
    v.avg = v.count > 0 ? v.total / v.count : 0
  })

  return (
    <div className="animate-page-in">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">ContextBand</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your rewards</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Consistency deserves to be noticed.
      </p>

      {/* Total reward score */}
      <div className="mt-8 glass-card rounded-3xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber/10">
          <Trophy className="h-8 w-8 text-amber" />
        </div>
        <p className="text-5xl font-semibold tracking-tight">{totalReward.toFixed(1)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Total reward score</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Based on your responses: +1.0 for complete, 0.0 for dismiss, -0.5 for delay
        </p>
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{totalCompleted}</p>
          <p className="mt-1 text-xs text-muted-foreground">Interventions completed</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{avgReward.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Average reward</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
            <Star className="h-5 w-5" />
          </div>
          <p className="text-3xl font-semibold">{entries.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total interactions</p>
        </div>
      </div>

      {/* Response breakdown */}
      <div className="mt-6 glass-card rounded-3xl p-5">
        <h3 className="mb-4 font-semibold">Response breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">Completed</span>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-green" style={{ width: entries.length > 0 ? `${(completeCount / entries.length) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-medium w-12 text-right">{completeCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">Dismissed</span>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-muted-foreground" style={{ width: entries.length > 0 ? `${(dismissCount / entries.length) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-medium w-12 text-right">{dismissCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">Delayed</span>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber" style={{ width: entries.length > 0 ? `${(delayCount / entries.length) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-medium w-12 text-right">{delayCount}</span>
          </div>
        </div>
      </div>

      {/* Best performing types */}
      {Object.keys(typeReward).length > 0 && (
        <div className="mt-6 glass-card rounded-3xl p-5">
          <h3 className="mb-4 font-semibold">Rewards by intervention type</h3>
          <div className="space-y-3">
            {Object.entries(typeReward)
              .sort(([, a], [, b]) => b.avg - a.avg)
              .map(([type, data]) => {
                const Icon = getInterventionIcon(type)
                const color = getInterventionColor(type)
                return (
                  <div key={type} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className={`tone-icon tone-${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{getFriendlyInterventionName(type)}</p>
                      <p className="text-xs text-muted-foreground">{data.count} interactions</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${data.avg >= 0 ? 'text-green' : 'text-red-400'}`}>
                        {data.avg >= 0 ? '+' : ''}{data.avg.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">avg reward</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Reward history */}
      <div className="mt-6 glass-card rounded-3xl p-5">
        <h3 className="mb-4 font-semibold">Reward history</h3>
        {entries.length === 0 ? (
          <EmptyState title="No rewards yet" description="Complete interventions to earn rewards." />
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 15).map(entry => {
              const time = new Date(entry.decidedAt).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={entry.decisionId} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{time}</span>
                    <span className="text-xs font-medium">{getFriendlyInterventionName(entry.interventionType)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${getResponseColor(entry.response)}`}>
                      {getResponseLabel(entry.response)}
                    </span>
                    {entry.rewardValue !== null && (
                      <span className={`text-xs font-semibold ${entry.rewardValue >= 0 ? 'text-green' : 'text-red-400'}`}>
                        {entry.rewardValue >= 0 ? '+' : ''}{entry.rewardValue}
                      </span>
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
