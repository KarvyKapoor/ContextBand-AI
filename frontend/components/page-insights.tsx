'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, TrendingUp, Brain, BarChart3, Target,
} from 'lucide-react'
import {
  type HistoryData, type PolicyData, type PolicyWeightInfo,
  getHistory, getPolicyWeights,
} from '@/lib/api'
import {
  LoadingState, ErrorState, EmptyState,
  getInterventionIcon, getInterventionColor, getFriendlyInterventionName,
} from '@/components/shared-widgets'

export default function PageInsights() {
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [policy, setPolicy] = useState<PolicyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const [hist, pol] = await Promise.allSettled([getHistory(), getPolicyWeights()])
      if (hist.status === 'fulfilled') setHistory(hist.value)
      if (pol.status === 'fulfilled') setPolicy(pol.value)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      if (!msg.includes('Session expired')) setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState message="Loading insights..." />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  const entries = history?.entries || []
  const weights = policy?.weights || []

  // Analyze patterns
  // Best intervention types by completion rate
  const typeStats: Record<string, { total: number; completed: number; avgReward: number }> = {}
  entries.forEach(e => {
    if (!typeStats[e.interventionType]) {
      typeStats[e.interventionType] = { total: 0, completed: 0, avgReward: 0 }
    }
    typeStats[e.interventionType].total++
    if (e.response === 'COMPLETE') typeStats[e.interventionType].completed++
    typeStats[e.interventionType].avgReward += e.rewardValue || 0
  })
  Object.values(typeStats).forEach(v => {
    v.avgReward = v.total > 0 ? v.avgReward / v.total : 0
  })

  // Best time-of-day performance
  const timeStats: Record<string, { total: number; completed: number }> = {}
  entries.forEach(e => {
    if (!timeStats[e.contextTimeOfDay]) {
      timeStats[e.contextTimeOfDay] = { total: 0, completed: 0 }
    }
    timeStats[e.contextTimeOfDay].total++
    if (e.response === 'COMPLETE') timeStats[e.contextTimeOfDay].completed++
  })

  // Stress level patterns
  const stressStats: Record<string, { total: number; completed: number }> = {}
  entries.forEach(e => {
    if (!stressStats[e.contextStressLevel]) {
      stressStats[e.contextStressLevel] = { total: 0, completed: 0 }
    }
    stressStats[e.contextStressLevel].total++
    if (e.response === 'COMPLETE') stressStats[e.contextStressLevel].completed++
  })

  // Top policy weights (strongest learned preferences)
  const topWeights = [...weights]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)

  const hasData = entries.length > 0 || weights.length > 0

  return (
    <div className="animate-page-in">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">ContextBand</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Personalized insights</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Patterns that help you plan your day.
      </p>

      {!hasData ? (
        <div className="mt-8">
          <EmptyState
            title="Not enough data yet"
            description="Complete some check-ins and interventions to see your personalized insights."
          />
        </div>
      ) : (
        <>
          {/* Best intervention types */}
          {Object.keys(typeStats).length > 0 && (
            <div className="mt-8 glass-card rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Best intervention types</h3>
                  <p className="text-xs text-muted-foreground">Ranked by completion rate</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(typeStats)
                  .sort(([, a], [, b]) => {
                    const rateA = a.total > 0 ? a.completed / a.total : 0
                    const rateB = b.total > 0 ? b.completed / b.total : 0
                    return rateB - rateA
                  })
                  .map(([type, stats]) => {
                    const Icon = getInterventionIcon(type)
                    const color = getInterventionColor(type)
                    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                    return (
                      <div key={type} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className={`tone-icon tone-${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{getFriendlyInterventionName(type)}</p>
                          <p className="text-xs text-muted-foreground">{stats.completed}/{stats.total} completed</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{rate}%</p>
                          <p className="text-[10px] text-muted-foreground">rate</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Time-of-day insights */}
          {Object.keys(timeStats).length > 0 && (
            <div className="mt-6 glass-card rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Performance by time of day</h3>
                  <p className="text-xs text-muted-foreground">When interventions work best</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(timeStats)
                  .sort(([, a], [, b]) => {
                    const rateA = a.total > 0 ? a.completed / a.total : 0
                    const rateB = b.total > 0 ? b.completed / b.total : 0
                    return rateB - rateA
                  })
                  .map(([time, stats]) => {
                    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                    return (
                      <div key={time} className="flex items-center gap-3">
                        <span className="w-28 text-xs text-muted-foreground">{time.replace(/_/g, ' ').toLowerCase()}</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-amber" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{rate}%</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Stress patterns */}
          {Object.keys(stressStats).length > 0 && (
            <div className="mt-6 glass-card rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Stress level patterns</h3>
                  <p className="text-xs text-muted-foreground">How stress affects your responses</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(stressStats)
                  .sort(([, a], [, b]) => {
                    const rateA = a.total > 0 ? a.completed / a.total : 0
                    const rateB = b.total > 0 ? b.completed / b.total : 0
                    return rateB - rateA
                  })
                  .map(([stress, stats]) => {
                    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                    return (
                      <div key={stress} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-muted-foreground">{stress.toLowerCase()}</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-violet" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{rate}%</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Learned policy weights */}
          {topWeights.length > 0 && (
            <div className="mt-6 glass-card rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Learned preferences</h3>
                  <p className="text-xs text-muted-foreground">The AI engine has learned which interventions work for you</p>
                </div>
              </div>
              <div className="space-y-3">
                {topWeights.map((w, i) => (
                  <div key={`${w.interventionId}-${w.contextSignature}`} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green/10 text-green text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{getFriendlyInterventionName(w.interventionType)}</p>
                      <p className="text-xs text-muted-foreground">
                        Context: {w.contextSignature.replace(/:/g, ' · ').toLowerCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${w.weight >= 0 ? 'text-green' : 'text-red-400'}`}>
                        {w.weight >= 0 ? '+' : ''}{w.weight.toFixed(3)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {w.observationCount} obs · avg {w.averageReward.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average reward trend */}
          <div className="mt-6 glass-card rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Overall summary</h3>
                <p className="text-xs text-muted-foreground">Your learning journey so far</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Total decisions</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{history?.completedCount || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{(history?.averageReward || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Avg reward</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
