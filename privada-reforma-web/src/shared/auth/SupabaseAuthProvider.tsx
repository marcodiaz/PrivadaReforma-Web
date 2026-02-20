/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UserRole } from '../domain/auth'
import type { AppSession } from '../domain/demoData'
import { isSupabaseConfigured, supabase } from '../supabase/client'

type ProfileRole = 'admin' | 'resident' | 'tenant' | 'guard' | 'board_member' | 'maintenance'

type ProfileRow = {
  user_id: string
  role: ProfileRole
  unit_number: string | null
}

type SupabaseAuthContextValue = {
  session: AppSession | null
  profile: ProfileRow | null
  isLoading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
  updateMyProfile: (input: { role: ProfileRole; unitNumber: string | null }) => Promise<{
    ok: boolean
    error?: string
  }>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null)
const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000
const PROFILE_LOAD_TIMEOUT_MS = 5_000
const PROFILE_CACHE_KEY = 'auth_profile_cache_v1'

function devLog(message: string, extra?: unknown) {
  if (!import.meta.env.DEV) {
    return
  }
  if (typeof extra !== 'undefined') {
    console.info(`[auth] ${message}`, extra)
    return
  }
  console.info(`[auth] ${message}`)
}

function mapProfileRoleToUserRole(role: ProfileRole): UserRole {
  if (role === 'board_member') {
    return 'board'
  }
  if (role === 'maintenance') {
    return 'guard'
  }
  return role
}

function isProfileRole(value: unknown): value is ProfileRole {
  return (
    value === 'admin' ||
    value === 'resident' ||
    value === 'tenant' ||
    value === 'guard' ||
    value === 'board_member' ||
    value === 'maintenance'
  )
}

function getOptimisticRoleFromUser(user: User): ProfileRole {
  const metadataRole = user.user_metadata?.role ?? user.app_metadata?.role
  if (isProfileRole(metadataRole)) {
    return metadataRole
  }
  return 'resident'
}

function getOptimisticUnitFromUser(user: User): string | null {
  const metadataUnit = user.user_metadata?.unit_number ?? user.user_metadata?.unitNumber
  if (typeof metadataUnit === 'string' && metadataUnit.trim()) {
    return metadataUnit.trim()
  }
  return null
}

function buildOptimisticProfile(user: User): ProfileRow {
  return {
    user_id: user.id,
    role: getOptimisticRoleFromUser(user),
    unit_number: getOptimisticUnitFromUser(user),
  }
}

function readProfileCache(userId: string): ProfileRow | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as ProfileRow
    if (
      parsed &&
      parsed.user_id === userId &&
      isProfileRole(parsed.role) &&
      (parsed.unit_number === null || typeof parsed.unit_number === 'string')
    ) {
      return parsed
    }
  } catch {
    // no-op
  }
  return null
}

function writeProfileCache(profile: ProfileRow | null) {
  try {
    if (!profile) {
      localStorage.removeItem(PROFILE_CACHE_KEY)
      return
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
  } catch {
    // no-op
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function buildAppSession(activeSession: Session, profile: ProfileRow): AppSession {
  const email = activeSession.user.email ?? ''
  const fullName =
    (activeSession.user.user_metadata.full_name as string | undefined) ??
    email.split('@')[0] ??
    'Usuario'

  return {
    userId: activeSession.user.id,
    email,
    fullName,
    role: mapProfileRoleToUserRole(profile.role),
    unitNumber: profile.unit_number ?? undefined,
  }
}

async function ensureProfileExists(userId: string) {
  if (!supabase) {
    return null
  }

  const existing = await supabase
    .from('profiles')
    .select('user_id, role, unit_number')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()

  if (existing.error) {
    throw existing.error
  }

  if (existing.data) {
    return existing.data
  }

  const defaultProfile: ProfileRow = {
    user_id: userId,
    role: 'resident',
    unit_number: '0000',
  }

  const inserted = await supabase
    .from('profiles')
    .insert(defaultProfile)
    .select('user_id, role, unit_number')
    .single<ProfileRow>()

  if (inserted.error) {
    throw inserted.error
  }

  return inserted.data
}

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured && Boolean(supabase))

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    let active = true
    const timeoutId = window.setTimeout(() => {
      if (!active) {
        return
      }
      devLog('bootstrap timeout reached; forcing loading=false')
      setIsLoading(false)
    }, AUTH_BOOTSTRAP_TIMEOUT_MS)

    const syncFromSession = async (nextSession: Session | null) => {
      if (!active) {
        return
      }
      devLog('syncFromSession', { hasSession: Boolean(nextSession) })
      setSupabaseSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        writeProfileCache(null)
        setIsLoading(false)
        return
      }

      const cachedProfile = readProfileCache(nextSession.user.id)
      if (cachedProfile) {
        setProfile(cachedProfile)
      } else {
        setProfile(buildOptimisticProfile(nextSession.user))
      }
      setIsLoading(false)

      try {
        const nextProfile = await withTimeout(
          ensureProfileExists(nextSession.user.id),
          PROFILE_LOAD_TIMEOUT_MS,
          'Profile load timeout'
        )
        if (!active) {
          return
        }
        if (nextProfile) {
          setProfile(nextProfile)
          writeProfileCache(nextProfile)
        }
      } catch (error) {
        devLog('ensureProfileExists failed', error)
      }
    }

    devLog('bootstrap start')
    void (async () => {
      try {
        const current = await supabase.auth.getSession()
        if (!active) {
          return
        }
        await syncFromSession(current.data.session)
      } catch (error) {
        devLog('getSession failed', error)
        if (active) {
          setSupabaseSession(null)
          setProfile(null)
        }
      } finally {
        if (active) {
          setIsLoading(false)
          devLog('bootstrap end')
        }
      }
    })()

    const authSubscription = supabase.auth.onAuthStateChange((event, nextSession) => {
      devLog('onAuthStateChange', { event, hasSession: Boolean(nextSession) })
      void syncFromSession(nextSession)
    })

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      authSubscription.data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<SupabaseAuthContextValue>(() => {
    const session =
      supabaseSession && profile ? buildAppSession(supabaseSession, profile) : null

    return {
      session,
      profile,
      isLoading,
      async signInWithPassword(email: string, password: string) {
        if (!supabase) {
          return { ok: false, error: 'Supabase no esta configurado.' }
        }

        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (result.error) {
          return { ok: false, error: result.error.message }
        }
        return { ok: true }
      },
      async signOut() {
        if (!supabase) {
          return
        }
        const result = await supabase.auth.signOut()
        if (result.error) {
          devLog('signOut failed', result.error)
          throw result.error
        }
      },
      async updateMyProfile(input: { role: ProfileRole; unitNumber: string | null }) {
        if (!supabase || !supabaseSession) {
          return { ok: false, error: 'Sesion no disponible.' }
        }

        const payload = {
          user_id: supabaseSession.user.id,
          role: input.role,
          unit_number: input.unitNumber && input.unitNumber.trim() ? input.unitNumber.trim() : null,
        }

        const updated = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select('user_id, role, unit_number')
          .single<ProfileRow>()

        if (updated.error || !updated.data) {
          return { ok: false, error: updated.error?.message ?? 'No fue posible actualizar perfil.' }
        }

        setProfile(updated.data)
        return { ok: true }
      },
    }
  }, [isLoading, profile, supabaseSession])

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return context
}
