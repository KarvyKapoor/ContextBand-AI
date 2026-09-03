'use client'

import {
  Activity, Check, ChevronRight, Clock3, Droplets, Leaf, Pause,
  ShieldCheck, Sparkles, X, AlertCircle, Loader2,
} from 'lucide-react'

// ─── Progress Ring ──────────────────────────────────────────────────

export function ProgressRing({ value = 0 }: { value?: number }) {
  const circumference = 2 * Math.PI * 52
  const displayValue = Math.round(value)
  return (
    <div className="relative h-40 w-40 shrink-0 animate-ring-in">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={`${displayValue}% adherence`} role="img">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--ring-track)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="52" fill="none" stroke="var(--cyan)" strokeLinecap="round"
          strokeWidth="8" strokeDasharray={circumference}
          strokeDashoffset={circumference - (displayValue / 100) * circumference}
          className="progress-stroke"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight">{displayValue}%</span>
        <span className="text-xs text-muted-foreground">Daily adherence</span>
      </div>
    </div>
  )
}

// ─── Mini Progress Card ─────────────────────────────────────────────

export function MiniProgress({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string; icon: typeof Activity
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="flex items-center justify-between">
        <Icon className={`h-3.5 w-3.5 text-${color}`} />
        <span className="text-xs font-medium">{value}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-${color}`} style={{ width: value }} />
      </div>
    </div>
  )
}

// ─── Section Title ──────────────────────────────────────────────────

export function SectionTitle({ eyebrow, title, action, onAction }: {
  eyebrow?: string; title: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="text-xs text-muted-foreground transition-colors hover:text-cyan">
          {action} <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Loading Spinner ────────────────────────────────────────────────

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-cyan" />
      <p className="text-sm text-muted-foreground">{message || 'Loading...'}</p>
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-3 h-6 w-6 text-red-400" />
      <p className="mb-3 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="button-outline text-xs">
          Try again
        </button>
      )}
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty-state">
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>}
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────

export function Toast({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/10 px-3 py-2 text-xs text-cyan animate-toast">
      <Check className="h-3.5 w-3.5" /> {message}
    </div>
  )
}

// ─── Intervention type icon helper ──────────────────────────────────

export function getInterventionIcon(type: string) {
  switch (type) {
    case 'BREATHING_EXERCISE': return Leaf
    case 'HYDRATION_REMINDER': return Droplets
    case 'MOVEMENT_PROMPT': return Activity
    case 'MEDICATION_REMINDER': return ShieldCheck
    case 'STRESS_MANAGEMENT': return Sparkles
    case 'SLEEP_HYGIENE': return Clock3
    case 'SOCIAL_CONNECTION': return Sparkles
    case 'MINDFULNESS': return Leaf
    default: return Sparkles
  }
}

export function getInterventionColor(type: string): string {
  switch (type) {
    case 'BREATHING_EXERCISE': return 'cyan'
    case 'HYDRATION_REMINDER': return 'cyan'
    case 'MOVEMENT_PROMPT': return 'violet'
    case 'MEDICATION_REMINDER': return 'green'
    case 'STRESS_MANAGEMENT': return 'amber'
    case 'SLEEP_HYGIENE': return 'violet'
    case 'SOCIAL_CONNECTION': return 'green'
    case 'MINDFULNESS': return 'cyan'
    default: return 'cyan'
  }
}

export function getFriendlyInterventionName(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function getResponseLabel(response: string | null): string {
  if (!response) return 'Pending'
  switch (response) {
    case 'COMPLETE': return 'Completed'
    case 'DISMISS': return 'Dismissed'
    case 'DELAY': return 'Delayed'
    case 'IGNORE': return 'Ignored'
    default: return response
  }
}

export function getResponseColor(response: string | null): string {
  switch (response) {
    case 'COMPLETE': return 'text-green'
    case 'DISMISS': return 'text-muted-foreground'
    case 'DELAY': return 'text-amber'
    case 'IGNORE': return 'text-red-400'
    default: return 'text-muted-foreground'
  }
}
