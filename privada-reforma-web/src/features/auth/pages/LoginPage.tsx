import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoleLandingPath } from '../../../shared/domain/auth'
import { useDemoData } from '../../../shared/state/DemoDataContext'
import { supabase } from '../../../shared/supabase/client'
import { AppButton, AppCard } from '../../../shared/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, authLoading, login } = useDemoData()
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [magicLinkMessage, setMagicLinkMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSetupError, setPasswordSetupError] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const hashParams = new URLSearchParams(hash)
    const searchParams = new URLSearchParams(window.location.search)
    const flowType = hashParams.get('type') ?? searchParams.get('type')
    const flowError = hashParams.get('error_description') ?? searchParams.get('error_description')

    if (flowError) {
      setErrorMessage(decodeURIComponent(flowError))
    }
    if (flowType === 'invite' || flowType === 'recovery') {
      setNeedsPasswordSetup(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }
    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordSetup(true)
      }
    })

    return () => {
      authSubscription.data.subscription.unsubscribe()
    }
  }, [])

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Correo y contrasena son obligatorios.')
      return
    }
    setSubmitting(true)

    const result = await login(email, password)
    if (!result.ok) {
      setErrorMessage(result.error ?? 'No fue posible iniciar sesion.')
      setSubmitting(false)
      return
    }
    setErrorMessage('')
    setSubmitting(false)
  }

  async function handleMagicLinkLogin() {
    if (!email.trim()) {
      setErrorMessage('Correo obligatorio para enviar magic link.')
      return
    }
    if (!supabase) {
      setErrorMessage('Supabase no esta configurado.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setMagicLinkMessage('')

    const redirectTo = `${window.location.origin}/login`
    const result = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    })

    setSubmitting(false)
    if (result.error) {
      setErrorMessage(result.error.message)
      return
    }
    setMagicLinkMessage('Revisa tu correo. Te enviamos un enlace de acceso.')
  }

  async function handleSetPassword() {
    if (!session) {
      setPasswordSetupError('Primero valida la invitacion e inicia sesion con el enlace.')
      return
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordSetupError('Debes capturar y confirmar la nueva contrasena.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordSetupError('La contrasena debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordSetupError('La confirmacion no coincide.')
      return
    }
    if (!supabase) {
      setPasswordSetupError('Supabase no esta configurado.')
      return
    }

    setSettingPassword(true)
    const result = await supabase.auth.updateUser({ password: newPassword })
    setSettingPassword(false)
    if (result.error) {
      setPasswordSetupError(result.error.message)
      return
    }

    setPasswordSetupError('')
    setNeedsPasswordSetup(false)
    window.history.replaceState({}, '', window.location.pathname + window.location.search)
    navigate(getRoleLandingPath(session.role), { replace: true })
  }

  useEffect(() => {
    if (!session) {
      return
    }
    if (needsPasswordSetup) {
      return
    }
    navigate(getRoleLandingPath(session.role), { replace: true })
  }, [navigate, needsPasswordSetup, session])

  if (authLoading) {
    return <AppCard className="text-sm text-[var(--color-text-muted)]">Validando sesion...</AppCard>
  }

  if (needsPasswordSetup) {
    return (
      <AppCard className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Invitacion
          </p>
          <h1 className="text-xl font-semibold">Configura tu contrasena</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Antes de entrar, define la contrasena para tu cuenta.
          </p>
        </header>

        {!session ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Validando enlace de invitacion, espera unos segundos.
          </p>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Nueva contrasena</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Confirmar contrasena</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la contrasena"
          />
        </label>

        {passwordSetupError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{passwordSetupError}</p>
        ) : null}

        <AppButton block disabled={settingPassword || !session} onClick={() => void handleSetPassword()}>
          {settingPassword ? 'Guardando...' : 'Guardar contrasena'}
        </AppButton>
      </AppCard>
    )
  }

  if (session) {
    return null
  }

  return (
    <AppCard className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Acceso seguro
        </p>
        <h1 className="text-xl font-semibold">Privada Reforma</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Acceso con contrasena o magic link.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <AppButton
          block
          onClick={() => {
            setAuthMode('password')
            setErrorMessage('')
            setMagicLinkMessage('')
          }}
          variant={authMode === 'password' ? 'primary' : 'secondary'}
        >
          Contrasena
        </AppButton>
        <AppButton
          block
          onClick={() => {
            setAuthMode('magic_link')
            setErrorMessage('')
            setMagicLinkMessage('')
          }}
          variant={authMode === 'magic_link' ? 'primary' : 'secondary'}
        >
          Magic link
        </AppButton>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Correo</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu-correo@dominio.com"
        />
      </label>

      {authMode === 'password' ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Contrasena</span>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 pr-16 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-xs font-medium text-slate-700"
              onClick={() => setShowPassword((previous) => !previous)}
              type="button"
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </label>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          Enviaremos un enlace de acceso seguro a tu correo.
        </p>
      )}

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {magicLinkMessage ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {magicLinkMessage}
        </p>
      ) : null}

      {authMode === 'password' ? (
        <AppButton block disabled={submitting} onClick={handleLogin}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </AppButton>
      ) : (
        <AppButton block disabled={submitting} onClick={() => void handleMagicLinkLogin()}>
          {submitting ? 'Enviando...' : 'Enviar magic link'}
        </AppButton>
      )}
    </AppCard>
  )
}
