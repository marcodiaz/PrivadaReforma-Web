import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoleLandingPath } from '../../../shared/domain/auth'
import { useDemoData } from '../../../shared/state/DemoDataContext'
import { supabase } from '../../../shared/supabase/client'
import { AppButton, AppCard } from '../../../shared/ui'
import { useLanguage } from '../../../shared/i18n/LanguageContext'

function detectAuthFlowFromUrl() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash)
  const searchParams = new URLSearchParams(window.location.search)
  const flowType = hashParams.get('type') ?? searchParams.get('type')
  const flowError = hashParams.get('error_description') ?? searchParams.get('error_description')
  const isInviteOrRecovery = flowType === 'invite' || flowType === 'recovery'
  return { flowError, isInviteOrRecovery }
}

export function LoginPage() {
  const navigate = useNavigate()
  const { tx } = useLanguage()
  const { session, authLoading, login } = useDemoData()
  const authFlow = detectAuthFlowFromUrl()
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [magicLinkMessage, setMagicLinkMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(() => authFlow.isInviteOrRecovery)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSetupError, setPasswordSetupError] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  useEffect(() => {
    const { flowError, isInviteOrRecovery } = detectAuthFlowFromUrl()
    if (flowError) {
      try {
        setErrorMessage(decodeURIComponent(flowError))
      } catch {
        setErrorMessage(flowError)
      }
    }
    if (isInviteOrRecovery) {
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
      setErrorMessage(tx('Correo y contrasena son obligatorios.', 'Email and password are required.'))
      return
    }
    setSubmitting(true)

    const result = await login(email, password)
    if (!result.ok) {
      setErrorMessage(result.error ?? tx('No fue posible iniciar sesion.', 'Could not sign in.'))
      setSubmitting(false)
      return
    }
    setErrorMessage('')
    setSubmitting(false)
  }

  async function handleMagicLinkLogin() {
    if (!email.trim()) {
      setErrorMessage(tx('Correo obligatorio para enviar magic link.', 'Email is required for magic link.'))
      return
    }
    if (!supabase) {
      setErrorMessage(tx('Supabase no esta configurado.', 'Supabase is not configured.'))
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
    setMagicLinkMessage(tx('Revisa tu correo. Te enviamos un enlace de acceso.', 'Check your email. We sent a sign-in link.'))
  }

  async function handleSetPassword() {
    if (!session) {
      setPasswordSetupError(tx('Primero valida la invitacion e inicia sesion con el enlace.', 'First validate the invitation and sign in with the link.'))
      return
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordSetupError(tx('Debes capturar y confirmar la nueva contrasena.', 'You must enter and confirm the new password.'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordSetupError(tx('La contrasena debe tener al menos 8 caracteres.', 'Password must be at least 8 characters.'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordSetupError(tx('La confirmacion no coincide.', 'Confirmation does not match.'))
      return
    }
    if (!supabase) {
      setPasswordSetupError(tx('Supabase no esta configurado.', 'Supabase is not configured.'))
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
    if (needsPasswordSetup || authFlow.isInviteOrRecovery) {
      return
    }
    navigate(getRoleLandingPath(session.role), { replace: true })
  }, [authFlow.isInviteOrRecovery, navigate, needsPasswordSetup, session])

  if (authLoading) {
    return <AppCard className="text-sm text-[var(--color-text-muted)]">{tx('Validando sesion...', 'Validating session...')}</AppCard>
  }

  if (needsPasswordSetup) {
    return (
      <AppCard className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {tx('Invitacion', 'Invitation')}
          </p>
          <h1 className="text-xl font-semibold">{tx('Configura tu contrasena', 'Set your password')}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {tx('Antes de entrar, define la contrasena para tu cuenta.', 'Before entering, set a password for your account.')}
          </p>
        </header>

        {!session ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {tx('Validando enlace de invitacion, espera unos segundos.', 'Validating invitation link, wait a few seconds.')}
          </p>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium">{tx('Nueva contrasena', 'New password')}</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={tx('Minimo 8 caracteres', 'Minimum 8 characters')}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{tx('Confirmar contrasena', 'Confirm password')}</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500 ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={tx('Repite la contrasena', 'Repeat password')}
          />
        </label>

        {passwordSetupError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{passwordSetupError}</p>
        ) : null}

        <AppButton block disabled={settingPassword || !session} onClick={() => void handleSetPassword()}>
          {settingPassword ? tx('Guardando...', 'Saving...') : tx('Guardar contrasena', 'Save password')}
        </AppButton>
      </AppCard>
    )
  }

  if (session) {
    return <AppCard className="text-sm text-[var(--color-text-muted)]">{tx('Redirigiendo...', 'Redirecting...')}</AppCard>
  }

  return (
    <AppCard className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {tx('Acceso seguro', 'Secure access')}
        </p>
        <h1 className="text-xl font-semibold">Privada Reforma</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {tx('Acceso con contrasena o magic link.', 'Access with password or magic link.')}
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
          {tx('Contrasena', 'Password')}
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
          {tx('Magic link', 'Magic link')}
        </AppButton>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{tx('Correo', 'Email')}</span>
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
          <span className="text-sm font-medium">{tx('Contrasena', 'Password')}</span>
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
              {showPassword ? tx('Ocultar', 'Hide') : tx('Ver', 'Show')}
            </button>
          </div>
        </label>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          {tx('Enviaremos un enlace de acceso seguro a tu correo.', 'We will send a secure sign-in link to your email.')}
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
          {submitting ? tx('Entrando...', 'Signing in...') : tx('Entrar', 'Sign in')}
        </AppButton>
      ) : (
        <AppButton block disabled={submitting} onClick={() => void handleMagicLinkLogin()}>
          {submitting ? tx('Enviando...', 'Sending...') : tx('Enviar magic link', 'Send magic link')}
        </AppButton>
      )}
    </AppCard>
  )
}
