'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, Check, ChevronRight, Clock3, Droplets, Leaf, Pause,
  ShieldCheck, Sparkles, X, Zap, MapPin,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  type HistoryData, type DecisionData, type HistoryEntry,
  submitContext, makeDecision, submitInterventionResponse,
  getHistory, deriveTimeOfDay, mapActivityLevel, mapStressLevel,
  mapLocation, deriveReceptivity, getGreeting, getTodayFormatted, getDeviceLocationCategory, getCareProfile,
} from '@/lib/api'
import {
  ProgressRing, MiniProgress, SectionTitle, LoadingState, ErrorState,
  Toast, getInterventionIcon, getInterventionColor, getFriendlyInterventionName,
} from '@/components/shared-widgets'

// ─── Recommendation Card ────────────────────────────────────────────

function RecommendationCard({
  decision,
  onStart, onResponse, responding,
}: {
  decision: DecisionData | null
  onStart: () => void
  onResponse: (response: string) => void
  responding: boolean
}) {
  if (!decision) return null
  const iv = decision.selectedIntervention
  const Icon = getInterventionIcon(iv.type)
  const color = getInterventionColor(iv.type)

  return (
    <section className="recommendation-card group relative overflow-hidden rounded-3xl p-6 sm:p-7">
      <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] text-cyan">
        <span className="pulse-dot" /> Recommended now
      </div>
      <div className="relative max-w-xl">
        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-${color}/10 text-${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-cyan/80">
          {getFriendlyInterventionName(iv.type)}
        </p>
        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-pretty sm:text-3xl">
          {iv.message.length > 80 ? iv.message.substring(0, 80) + '...' : iv.message}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {decision.explanation}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={onStart} disabled={responding} className="button-primary"><Sparkles className="h-4 w-4 fill-current" /> Start now</button>
          <button onClick={() => onResponse('DELAY')} disabled={responding} className="button-outline text-xs"><Clock3 className="h-4 w-4" /> Snooze</button>
          <button onClick={() => onResponse('DISMISS')} disabled={responding} className="button-quiet text-xs"><X className="h-4 w-4" /> Dismiss</button>
          <span className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            Confidence: {Math.round(decision.confidence * 100)}%
          </span>
        </div>
      </div>
      <div className="breathing-orb" aria-hidden="true">
        <div className="orb-core">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </section>
  )
}

// ─── Context Check-in Card ──────────────────────────────────────────

function ContextCard({
  onSubmit,
  loading,
}: {
  onSubmit: (activity: string, stress: string, place: string) => Promise<void>
  loading: boolean
}) {
  const [stress, setStress] = useState('Okay')
  const [activity, setActivity] = useState('Low')
  const [place, setPlace] = useState('Home')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    await onSubmit(activity, stress, place)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="glass-card rounded-3xl p-5">
        <div className="flex min-h-40 flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-cyan/10 text-cyan">
            <Check className="h-5 w-5" />
          </div>
          <p className="font-medium">Thanks, we&apos;ve updated your routine.</p>
          <p className="mt-1 text-xs text-muted-foreground">Your plan is ready for right now.</p>
          <button onClick={() => setSubmitted(false)} className="button-outline mt-4 text-xs">
            Update check-in
          </button>
        </div>
      </section>
    )
  }

  const choices = (value: string, values: string[], set: (v: string) => void) => (
    <div className="mt-2 flex gap-1.5">
      {values.map(item => (
        <button key={item} onClick={() => set(item)} className={`choice-chip ${value === item ? 'choice-chip-active' : ''}`}>
          {item}
        </button>
      ))}
    </div>
  )

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Quick check-in</p>
          <h2 className="font-semibold">Your current routine</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">How active are you?</p>
          {choices(activity, ['Low', 'Moderate', 'High'], setActivity)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">How are you feeling?</p>
          {choices(stress, ['Calm', 'Okay', 'Stressed'], setStress)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Where are you?</p>
          {choices(place, ['Home', 'Work', 'Other'], setPlace)}
        </div>
        <button onClick={handleSubmit} disabled={loading} className="button-outline sm:col-span-3">
          {loading ? 'Saving...' : <><Check className="h-4 w-4" /> Save check-in</>}
        </button>
      </div>
    </section>
  )
}

// ─── Notifications / Adaptive Nudges ────────────────────────────────

function Notifications({
  decision,
  onAction,
  responding,
}: {
  decision: DecisionData | null
  onAction: (decisionId: number, response: string) => Promise<void>
  responding: boolean
}) {
  if (!decision) return null
  const iv = decision.selectedIntervention
  const Icon = getInterventionIcon(iv.type)
  const color = getInterventionColor(iv.type)

  return (
    <section>
      <SectionTitle eyebrow="Adaptive nudges" title="For you today" />
      <div className="space-y-3">
        <div className="glass-card notification-card rounded-2xl p-4">
          <div className="flex gap-3">
            <div className={`tone-icon tone-${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {getFriendlyInterventionName(iv.type)}
                  </span>
                  <h3 className="mt-1 text-sm font-medium">{iv.message.substring(0, 60)}...</h3>
                </div>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">Now</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{iv.action}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onAction(decision.decisionId, 'COMPLETE')}
                  disabled={responding}
                  className="mini-button mini-button-primary"
                >
                  Complete
                </button>
                <button
                  onClick={() => onAction(decision.decisionId, 'DELAY')}
                  disabled={responding}
                  className="mini-button"
                >
                  <Pause className="h-3 w-3" /> Snooze
                </button>
                <button
                  onClick={() => onAction(decision.decisionId, 'DISMISS')}
                  disabled={responding}
                  aria-label="Dismiss notification"
                  className="icon-button ml-auto h-7 w-7"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Timeline ───────────────────────────────────────────────────────

function CareTimeline({ entries, onSeeAll }: { entries: HistoryEntry[]; onSeeAll: () => void }) {
  const recentEntries = entries.slice(0, 4)
  if (recentEntries.length === 0) {
    return (
      <section>
        <SectionTitle eyebrow="Today" title="Your care timeline" />
        <div className="glass-card rounded-3xl p-5">
          <div className="empty-state">No interventions yet. Complete a check-in to get started.</div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionTitle eyebrow="Today" title="Your care timeline" action="Open today" onAction={onSeeAll} />
      <div className="glass-card rounded-3xl p-5">
        <div className="space-y-5">
          {recentEntries.map((entry, i) => {
            const Icon = getInterventionIcon(entry.interventionType)
            const time = entry.decidedAt ? new Date(entry.decidedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            const isLatest = i === 0
            return (
              <div key={entry.decisionId} className="timeline-row">
                <div className="timeline-time">{time}</div>
                <div className={`timeline-icon ${isLatest ? 'timeline-icon-current' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{getFriendlyInterventionName(entry.interventionType)}</p>
                  <p className={`mt-1 text-xs ${isLatest ? 'text-cyan' : 'text-muted-foreground'}`}>
                    {entry.response ? (entry.response === 'COMPLETE' ? 'Completed' : entry.response === 'DISMISS' ? 'Dismissed' : entry.response === 'DELAY' ? 'Delayed' : 'Pending') : 'Pending'}
                  </p>
                </div>
                {entry.response === 'COMPLETE' && <Check className="h-4 w-4 text-green" />}
              </div>
            )
          })}
        </div>
        <button onClick={onSeeAll} className="mt-5 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-cyan">
          See full timeline <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  )
}

// ─── Breathing / Intervention Modal ─────────────────────────────────

function InterventionModal({
  decision,
  onClose,
  onComplete,
  responding,
}: {
  decision: DecisionData
  onClose: () => void
  onComplete: (decisionId: number, response: string, seconds: number) => Promise<void>
  responding: boolean
}) {
  const startTime = useRef(Date.now())
  const iv = decision.selectedIntervention
  const Icon = getInterventionIcon(iv.type)

  async function handleComplete() {
    const elapsed = Math.round((Date.now() - startTime.current) / 1000)
    await onComplete(decision.decisionId, 'COMPLETE', elapsed)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intervention-title" onClick={onClose}>
      <div className="breathing-modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="icon-button absolute right-5 top-5" aria-label="Close intervention">
          <X className="h-4 w-4" />
        </button>
        <div className="breathing-circle">
          <div className="breathing-circle-inner">
            <Icon className="h-6 w-6 text-cyan" />
          </div>
        </div>
        <p className="mt-7 text-[10px] uppercase tracking-[0.22em] text-cyan">
          {getFriendlyInterventionName(iv.type)}
        </p>
        <h2 id="intervention-title" className="mt-2 text-2xl font-semibold">{iv.action}</h2>
        <p className="mt-2 max-w-xs text-center text-sm leading-6 text-muted-foreground">
          {iv.message}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button onClick={handleComplete} disabled={responding} className="button-primary">{responding ? 'Saving...' : <><Check className="h-4 w-4" /> Complete</>}</button>
          <button onClick={() => onComplete(decision.decisionId, 'DELAY', Math.round((Date.now()-startTime.current)/1000))} disabled={responding} className="button-outline">Snooze</button>
          <button onClick={() => onComplete(decision.decisionId, 'DISMISS', Math.round((Date.now()-startTime.current)/1000))} disabled={responding} className="button-quiet"><X className="h-4 w-4" /> Dismiss</button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Home (main section) ──────────────────────────────────

export default function DashboardHome({ setActive }: { setActive: (item: string) => void }) {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [decision, setDecision] = useState<DecisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contextLoading, setContextLoading] = useState(false)
  const [responding, setResponding] = useState(false)
  const [showIntervention, setShowIntervention] = useState(false)
  const [toast, setToast] = useState('')
  const [respondedDecisions, setRespondedDecisions] = useState<Set<number>>(new Set())

  const displayName = user?.displayName || user?.username || 'there'

  // Load history on mount
  const loadData = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const hist = await getHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      if (!msg.includes('Session expired')) {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Handle context check-in submission
  async function handleContextSubmit(activity: string, stress: string, place: string) {
    try {
      setContextLoading(true)
      const timeOfDay = deriveTimeOfDay()
      const receptivityScore = deriveReceptivity(stress, activity)
      const careProfile = getCareProfile()
      let locationCategory = mapLocation(place)
      try {
        const deviceLocation = await getDeviceLocationCategory()
        if (deviceLocation.category === 'HOME' || deviceLocation.category === 'OTHER') locationCategory = deviceLocation.category
      } catch { /* permission unavailable: use user-selected fallback */ }

      const ctx = await submitContext({
        timeOfDay,
        activityLevel: mapActivityLevel(activity),
        stressLevel: mapStressLevel(stress),
        locationCategory,
        receptivityScore,
        preferences: JSON.stringify({ condition: careProfile.condition, tonePreference: careProfile.tonePreference }),
      })

      // Get a decision based on this context
      const dec = await makeDecision(ctx.id)
      setDecision(dec)
      setToast('Check-in saved. New recommendation ready!')
      setTimeout(() => setToast(''), 3000)

      // Refresh history
      const hist = await getHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit check-in'
      setError(msg)
    } finally {
      setContextLoading(false)
    }
  }

  // Handle intervention response
  async function handleInterventionResponse(decisionId: number, response: string, seconds?: number) {
    if (respondedDecisions.has(decisionId)) return // Prevent duplicate
    try {
      setResponding(true)
      await submitInterventionResponse({
        decisionId,
        response,
        responseTimeSeconds: seconds,
      })
      setRespondedDecisions(prev => new Set(prev).add(decisionId))
      setDecision(null)
      setShowIntervention(false)

      const msg = response === 'COMPLETE' ? 'Nice work! Your progress is moving forward.' :
                  response === 'DELAY' ? 'Snoozed for later.' :
                  'Dismissed for now.'
      setToast(msg)
      setTimeout(() => setToast(''), 3000)

      // Refresh history
      const hist = await getHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record response'
      setError(msg)
    } finally {
      setResponding(false)
    }
  }

  // Calculate metrics from real history data
  const totalDecisions = history?.totalDecisions || 0
  const completedCount = history?.completedCount || 0
  const avgReward = history?.averageReward || 0
  const completionRate = totalDecisions > 0 ? Math.round((completedCount / totalDecisions) * 100) : 0
  const recentEntries = history?.entries || []

  // Calculate today's metrics
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEntries = recentEntries.filter(e => {
    const d = new Date(e.decidedAt)
    return d >= todayStart
  })
  const todayCompleted = todayEntries.filter(e => e.response === 'COMPLETE').length
  const todayRate = todayEntries.length > 0 ? Math.round((todayCompleted / todayEntries.length) * 100) : 0

  // Count this week's entries (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekEntries = recentEntries.filter(e => {
    const d = new Date(e.decidedAt)
    return d >= weekAgo
  })
  const weekCompleted = weekEntries.filter(e => e.response === 'COMPLETE').length
  const weekTotal = weekEntries.length || 5 // fallback for display
  const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  if (loading) {
    return (
      <>
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">{getTodayFormatted()}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{getGreeting()}, {displayName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Loading your care data...</p>
          </div>
        </header>
        <LoadingState message="Loading dashboard..." />
      </>
    )
  }

  return (
    <>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">{getTodayFormatted()}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Here&apos;s your personalized plan for right now.</p>
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={loadData} />}
      {toast && <Toast message={toast} />}

      <div className="space-y-7">
        {/* Recommendation */}
        {decision && (
          <RecommendationCard
            decision={decision}
            onStart={() => setShowIntervention(true)}
            onResponse={(response) => handleInterventionResponse(decision.decisionId, response)}
            responding={responding}
          />
        )}

        {/* Progress + Context check-in */}
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-card rounded-3xl p-5 sm:p-6">
            <SectionTitle eyebrow="Today's progress" title="Your routine at a glance" action="Details" onAction={() => setActive('Progress')} />
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ProgressRing value={todayRate} />
              <div className="grid w-full grid-cols-2 gap-3">
                <MiniProgress label="Completed today" value={`${todayCompleted}`} color="cyan" icon={Check} />
                <MiniProgress label="Total decisions" value={`${totalDecisions}`} color="violet" icon={Activity} />
                <MiniProgress label="Completion rate" value={`${completionRate}%`} color="amber" icon={Sparkles} />
                <MiniProgress label="Avg reward" value={avgReward.toFixed(1)} color="green" icon={Leaf} />
              </div>
            </div>
          </section>
          <ContextCard onSubmit={handleContextSubmit} loading={contextLoading} />
        </div>

        {/* Notifications + Timeline */}
        <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
          <Notifications
            decision={decision}
            onAction={(id, resp) => handleInterventionResponse(id, resp)}
            responding={responding}
          />
          <CareTimeline entries={recentEntries} onSeeAll={() => setActive('Today')} />
        </div>
      </div>

      {/* Intervention modal */}
      {showIntervention && decision && (
        <InterventionModal
          decision={decision}
          onClose={() => setShowIntervention(false)}
          onComplete={handleInterventionResponse}
          responding={responding}
        />
      )}
    </>
  )
}
