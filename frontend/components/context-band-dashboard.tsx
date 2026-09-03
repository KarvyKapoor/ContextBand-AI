'use client'
import AutoNotification from "./AutoNotification";
import { useState } from 'react'
import {
  Activity, Bell, CalendarDays, HeartPulse, Menu, Sparkles,
  Trophy, UserRound,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import DashboardHome from '@/components/dashboard-home'
import PageToday from '@/components/page-today'
import PageProgress from '@/components/page-progress'
import PageRewards from '@/components/page-rewards'
import PageInsights from '@/components/page-insights'
import PageProfile from '@/components/page-profile'

const navItems = [
  { label: 'Dashboard', icon: HeartPulse },
  { label: 'Today', icon: CalendarDays },
  { label: 'Progress', icon: Activity },
  { label: 'Rewards', icon: Trophy },
  { label: 'Insights', icon: Sparkles },
  { label: 'Profile', icon: UserRound },
]

function Sidebar({ active, setActive }: { active: string; setActive: (item: string) => void }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-sidebar/75 px-4 py-5 backdrop-blur-xl lg:flex">
      <div className="mb-10 flex items-center gap-3 px-3">
        <div className="logo-mark"><span /></div>
        <div>
          <p className="text-sm font-semibold tracking-tight">ContextBand</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Care, in context</p>
        </div>
      </div>
      <nav className="space-y-1">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => setActive(label)} className={`nav-item ${active === label ? 'nav-item-active' : ''}`}>
            <Icon className="h-[18px] w-[18px]" />
            {label}
            {active === label && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_12px_var(--cyan)]" />}
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <WeeklyCard />
      </div>
    </aside>
  )
}

function WeeklyCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">This week</span>
        <Sparkles className="h-4 w-4 text-amber" />
      </div>
      <p className="text-xl font-semibold">Quick stats</p>
      <p className="mt-1 text-xs text-muted-foreground">See Progress for details</p>
    </div>
  )
}

export default function ContextBandDashboard() {
  const [active, setActive] = useState('Dashboard')

  function renderPage() {
    switch (active) {
      case 'Dashboard':
        return <DashboardHome setActive={setActive} />
      case 'Today':
        return <PageToday />
      case 'Progress':
        return <PageProgress />
      case 'Rewards':
        return <PageRewards />
      case 'Insights':
        return <PageInsights />
      case 'Profile':
        return <PageProfile />
      default:
        return <DashboardHome setActive={setActive} />
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="flex min-h-screen">
        <Sidebar active={active} setActive={setActive} />
        <main className="relative min-w-0 flex-1 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
            {/* Mobile header */}
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="logo-mark small"><span /></div>
                <span className="text-sm font-semibold">ContextBand</span>
              </div>
              <button className="icon-button" aria-label="Open menu"><Menu className="h-4 w-4" /></button>
            </div>
            <div className="animate-page-in" key={active}>
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
      {/* Mobile nav */}
      <nav className="mobile-nav lg:hidden">
        {navItems.slice(0, 5).map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => setActive(label)} className={active === label ? 'mobile-nav-active' : ''}>
            <Icon className="h-[18px] w-[18px]" />
            <span>{label === 'Dashboard' ? 'Home' : label}</span>
          </button>
        ))}
      </nav>
      <AutoNotification />
    </div>
  )
}

export { ProgressRing, MiniProgress } from '@/components/shared-widgets'
