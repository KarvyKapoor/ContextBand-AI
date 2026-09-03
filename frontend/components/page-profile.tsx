'use client'

import { useState, useEffect } from 'react'
import { UserRound, LogOut, MapPin, HeartPulse, Navigation, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { getCareProfile, saveCareProfile, type ChronicCareProfile } from '@/lib/api'

const conditions = [
  ['DIABETES','Diabetes'], ['HYPERTENSION','Hypertension'], ['ASTHMA','Asthma'], ['GENERAL_CHRONIC_CARE','General chronic care'],
] as const
const tones = ['GENTLE','ENCOURAGING','DIRECT','MINIMAL','CELEBRATORY'] as const

export default function PageProfile() {
  const { user, logout } = useAuth()
  const [profile,setProfile]=useState<ChronicCareProfile>({ condition:'GENERAL_CHRONIC_CARE', homeRadiusMeters:150, tonePreference:'ENCOURAGING' })
  const [locationStatus,setLocationStatus]=useState('Home location not set')
  const [saved,setSaved]=useState(false)
  useEffect(()=>setProfile(getCareProfile()),[])
  const save=()=>{ saveCareProfile(profile); setSaved(true); setTimeout(()=>setSaved(false),2500) }
  const setHome=()=>{
    if (!navigator.geolocation) return setLocationStatus('Location is not supported on this device')
    setLocationStatus('Getting device location...')
    navigator.geolocation.getCurrentPosition(pos=>{
      setProfile(p=>({...p,homeLatitude:pos.coords.latitude,homeLongitude:pos.coords.longitude,locationLabel:'Current device location'}))
      setLocationStatus('Home location saved from your device')
    },()=>setLocationStatus('Location permission was not granted. You can try again.'),{enableHighAccuracy:false,timeout:8000})
  }
  return <div className="animate-page-in">
    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan">Personalized chronic care</p>
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your care profile</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">ContextBand adapts recommendations using your chronic-care focus, preferred communication style, and live device location. This is a behavioural support tool and not a medical diagnosis system.</p>

    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section className="glass-card rounded-3xl p-6"><div className="flex items-center gap-3"><HeartPulse className="h-5 w-5 text-cyan"/><h2 className="font-semibold">Chronic-care focus</h2></div><div className="mt-5 grid gap-2">{conditions.map(([value,label])=><button key={value} onClick={()=>setProfile({...profile,condition:value})} className={`choice-chip text-left ${profile.condition===value?'choice-chip-active':''}`}>{label}</button>)}</div></section>
      <section className="glass-card rounded-3xl p-6"><div className="flex items-center gap-3"><Navigation className="h-5 w-5 text-cyan"/><h2 className="font-semibold">Adaptive tone</h2></div><p className="mt-2 text-xs text-muted-foreground">Tone changes the wording and delivery style while ContextBand also rotates messages to reduce repetition.</p><div className="mt-5 flex flex-wrap gap-2">{tones.map(t=><button key={t} onClick={()=>setProfile({...profile,tonePreference:t})} className={`choice-chip ${profile.tonePreference===t?'choice-chip-active':''}`}>{t.charAt(0)+t.slice(1).toLowerCase()}</button>)}</div></section>
    </div>

    <section className="mt-6 glass-card rounded-3xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-cyan"/><h2 className="font-semibold">Home location</h2></div><p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">Save your home using the current device location. During check-ins, ContextBand compares live device coordinates with your home radius to classify context as Home or Away.</p></div><button onClick={setHome} className="button-outline"><MapPin className="h-4 w-4"/> Set home from device</button></div><div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-sm"><p>{locationStatus}</p>{profile.homeLatitude!=null&&<p className="mt-1 text-xs text-muted-foreground">Home radius: <input className="ml-1 w-16 bg-transparent text-cyan outline-none" type="number" value={profile.homeRadiusMeters} onChange={e=>setProfile({...profile,homeRadiusMeters:Number(e.target.value)||150})}/> meters</p>}</div></section>

    <button onClick={save} className="button-primary mt-6">{saved?<><CheckCircle2 className="h-4 w-4"/> Saved</>:<>Save care profile</>}</button>
    <div className="mt-8 glass-card rounded-3xl p-5 flex items-center justify-between"><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-muted-foreground"/><div><p className="font-medium">{user?.displayName || user?.username}</p><p className="text-xs text-muted-foreground">Adaptive chronic care profile</p></div></div><button onClick={logout} className="button-outline text-red-400 border-red-400/20"> <LogOut className="h-4 w-4"/> Sign out</button></div>
  </div>
}
