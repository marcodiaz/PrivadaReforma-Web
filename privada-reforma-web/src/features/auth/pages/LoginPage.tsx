import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoleLandingPath } from '../../../shared/domain/auth'
import { useDemoData } from '../../../shared/state/DemoDataContext'
import { AppButton, AppCard } from '../../../shared/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, authLoading, login } = useDemoData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    if (!session) {
      return
    }
    navigate(getRoleLandingPath(session.role), { replace: true })
  }, [navigate, session])

  if (authLoading) {
    return <AppCard className="text-sm text-[var(--color-text-muted)]">Validando sesion...</AppCard>
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
          Acceso con Supabase Auth (email + password).
        </p>
      </header>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Correo</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu-correo@dominio.com"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Contrasena</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <AppButton block disabled={submitting} onClick={handleLogin}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </AppButton>
    </AppCard>
  )
}
