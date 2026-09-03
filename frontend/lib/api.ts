/**
 * Centralized API client for ContextBand backend.
 *
 * - Stores JWT in localStorage
 * - Automatically attaches Bearer token
 * - Unwraps ApiResponse.data
 * - Handles 401 by clearing auth state
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface ApiError {
  success: false
  message?: string
  error?: string
}

export interface AuthData {
  token: string
  tokenType: string
  userId: number
  username: string
  displayName: string
}

export interface ContextData {
  id: number
  timeOfDay: string
  activityLevel: string
  stressLevel: string
  locationCategory: string
  receptivityScore: number
  preferences: string | null
  historicalResponseSummary: string | null
  recordedAt: string
}

export interface DecisionData {
  decisionId: number
  contextId: number
  selectedIntervention: InterventionInfo
  candidateInterventions: InterventionInfo[]
  explanation: string
  confidence: number
  status: string
  decidedAt: string
}

export interface InterventionInfo {
  id: number
  type: string
  tone: string
  message: string
  action: string
}

export interface InterventionResponseData {
  id: number
  type: string
  tone: string
  message: string
  action: string
  metadata: string | null
  active: boolean
  suitableTimeOfDay: string | null
}

export interface HistoryEntry {
  decisionId: number
  interventionType: string
  interventionTone: string
  interventionMessage: string
  contextTimeOfDay: string
  contextStressLevel: string
  contextActivityLevel: string
  contextLocationCategory: string
  contextReceptivityScore: number
  explanation: string
  confidence: number
  response: string | null
  rewardValue: number | null
  decidedAt: string
  respondedAt: string | null
}

export interface HistoryData {
  userId: number
  totalDecisions: number
  averageReward: number
  completedCount: number
  entries: HistoryEntry[]
}

export interface PolicyWeightInfo {
  interventionId: number
  interventionType: string
  interventionTone: string
  contextSignature: string
  weight: number
  observationCount: number
  averageReward: number
}

export interface PolicyData {
  userId: number
  weights: PolicyWeightInfo[]
}

export interface ResponseResultData {
  rewardId: number
  decisionId: number
  response: string
  rewardValue: number
  rewardDescription: string
  policyUpdate: {
    interventionType: string
    contextSignature: string
    previousWeight: number
    newWeight: number
    observationCount: number
  }
}

// Token management
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cb_token')
}

export function setToken(token: string) {
  localStorage.setItem('cb_token', token)
}

export function clearToken() {
  localStorage.removeItem('cb_token')
  localStorage.removeItem('cb_user')
}

export function getStoredUser(): AuthData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('cb_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthData) {
  localStorage.setItem('cb_user', JSON.stringify(user))
}

/**
 * Core fetch wrapper that:
 * - Attaches JWT Bearer token
 * - Unwraps ApiResponse.data
 * - Handles 401 by clearing auth and redirecting
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE}${path}`
  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error('Network error: unable to reach the server')
  }

  // Handle 401 - clear auth and throw so caller can handle
  if (response.status === 401) {
    clearToken()
    // Dispatch custom event so auth context can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cb-auth-expired'))
    }
    throw new Error('Session expired. Please log in again.')
  }

  // Parse JSON response
  let body: Record<string, unknown>
  try {
    body = await response.json()
  } catch {
    throw new Error('Invalid server response')
  }

  // Check for API-level errors
  if (body.success === false || !response.ok) {
    const msg = (body.error as string) || (body.message as string) || 'Unknown error'
    throw new Error(msg)
  }

  // Unwrap ApiResponse.data
  return body.data as T
}

// ─── Auth API ───────────────────────────────────────────────────────

export async function registerUser(params: {
  username: string
  email: string
  password: string
  displayName: string
}): Promise<AuthData> {
  return apiFetch<AuthData>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function loginUser(params: {
  username: string
  password: string
}): Promise<AuthData> {
  return apiFetch<AuthData>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getMe(): Promise<AuthData> {
  return apiFetch<AuthData>('/api/auth/me')
}

// ─── Context API ────────────────────────────────────────────────────

export async function submitContext(params: {
  timeOfDay: string
  activityLevel: string
  stressLevel: string
  locationCategory: string
  receptivityScore: number
  preferences?: string
  historicalResponseSummary?: string
}): Promise<ContextData> {
  return apiFetch<ContextData>('/api/context', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getCurrentContext(): Promise<ContextData> {
  return apiFetch<ContextData>('/api/context/current')
}

export async function getContextHistory(): Promise<ContextData[]> {
  return apiFetch<ContextData[]>('/api/context/history')
}

// ─── Decision API ───────────────────────────────────────────────────

export async function makeDecision(contextId?: number): Promise<DecisionData> {
  const body = contextId ? { contextId } : {}
  return apiFetch<DecisionData>('/api/decisions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ─── Intervention API ───────────────────────────────────────────────

export async function getInterventions(): Promise<InterventionResponseData[]> {
  return apiFetch<InterventionResponseData[]>('/api/interventions')
}

export async function getIntervention(id: number): Promise<InterventionResponseData> {
  return apiFetch<InterventionResponseData>(`/api/interventions/${id}`)
}

export async function submitInterventionResponse(params: {
  decisionId: number
  response: string
  responseTimeSeconds?: number
}): Promise<ResponseResultData> {
  return apiFetch<ResponseResultData>('/api/interventions/response', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ─── History API ────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryData> {
  return apiFetch<HistoryData>('/api/history')
}

export async function getPolicyWeights(): Promise<PolicyData> {
  return apiFetch<PolicyData>('/api/history/policy')
}

// ─── Utility: derive time of day from current time ──────────────────

export function deriveTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 7) return 'EARLY_MORNING'
  if (hour >= 7 && hour < 12) return 'MORNING'
  if (hour >= 12 && hour < 17) return 'AFTERNOON'
  if (hour >= 17 && hour < 21) return 'EVENING'
  return 'NIGHT'
}

/**
 * Map frontend context values to backend enum values.
 * Frontend uses: Low/Moderate/High for activity and stress
 * Backend expects: LOW/MODERATE/HIGH
 */
export function mapActivityLevel(frontend: string): string {
  return frontend.toUpperCase()
}

export function mapStressLevel(frontend: string): string {
  return frontend.toUpperCase()
}

export function mapLocation(frontend: string): string {
  const map: Record<string, string> = {
    Home: 'HOME',
    Work: 'WORK',
    Other: 'OTHER',
  }
  return map[frontend] || 'HOME'
}

/**
 * Derive a sensible receptivityScore from context signals.
 * Higher when stress is low and activity is moderate.
 */
export function deriveReceptivity(
  stressLevel: string,
  activityLevel: string,
): number {
  let base = 0.6
  switch (stressLevel.toUpperCase()) {
    case 'LOW': base += 0.15; break
    case 'OKAY':
    case 'MODERATE': base += 0.05; break
    case 'HIGH': base -= 0.2; break
  }
  switch (activityLevel.toUpperCase()) {
    case 'MODERATE': base += 0.1; break
    case 'LOW': base -= 0.05; break
    case 'HIGH': base += 0.05; break
  }
  return Math.max(0, Math.min(1, Math.round(base * 100) / 100))
}

/**
 * Format a timestamp for display.
 */
export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Format a date for display.
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Get a friendly greeting based on time of day.
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Get today's date formatted.
 */
export function getTodayFormatted(): string {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Local chronic-care profile + device location ───────────────────

export type ChronicCareProfile = {
  condition: 'DIABETES' | 'HYPERTENSION' | 'ASTHMA' | 'GENERAL_CHRONIC_CARE'
  homeLatitude?: number
  homeLongitude?: number
  homeRadiusMeters: number
  locationLabel?: string
  tonePreference: 'GENTLE' | 'ENCOURAGING' | 'DIRECT' | 'MINIMAL' | 'CELEBRATORY'
}

const PROFILE_KEY = 'cb_care_profile'

export function getCareProfile(): ChronicCareProfile {
  if (typeof window === 'undefined') return { condition: 'GENERAL_CHRONIC_CARE', homeRadiusMeters: 150, tonePreference: 'ENCOURAGING' }
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { homeRadiusMeters: 150, tonePreference: 'ENCOURAGING', condition: 'GENERAL_CHRONIC_CARE', ...JSON.parse(raw) } :
      { condition: 'GENERAL_CHRONIC_CARE', homeRadiusMeters: 150, tonePreference: 'ENCOURAGING' }
  } catch { return { condition: 'GENERAL_CHRONIC_CARE', homeRadiusMeters: 150, tonePreference: 'ENCOURAGING' } }
}

export function saveCareProfile(profile: ChronicCareProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function distanceMeters(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R=6371e3, p=Math.PI/180
  const a=Math.sin((lat2-lat1)*p/2)**2 + Math.cos(lat1*p)*Math.cos(lat2*p)*Math.sin((lon2-lon1)*p/2)**2
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function getDeviceLocationCategory(): Promise<{category:string; latitude?:number; longitude?:number; distanceFromHome?:number}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { category: 'UNKNOWN' }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:false, timeout:7000, maximumAge:60000 }))
  const { latitude, longitude } = pos.coords
  const profile=getCareProfile()
  if (profile.homeLatitude != null && profile.homeLongitude != null) {
    const distance=distanceMeters(latitude, longitude, profile.homeLatitude, profile.homeLongitude)
    return { category: distance <= profile.homeRadiusMeters ? 'HOME' : 'OTHER', latitude, longitude, distanceFromHome: Math.round(distance) }
  }
  return { category: 'OTHER', latitude, longitude }
}
