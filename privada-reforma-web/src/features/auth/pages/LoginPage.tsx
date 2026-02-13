import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getRoleLandingPath,
  loginDraftSchema,
  userRoleSchema,
  type UserRole,
} from '../../../shared/domain/auth'
import { useDemoData } from '../../../shared/state/DemoDataContext'
import { AppButton, AppCard } from '../../../shared/ui'

const roleLabels: Record<UserRole, string> = {
  resident: 'Residente',
  tenant: 'Inquilino',
  guard: 'Guardia',
  admin: 'Administrador',
  board: 'Comite',
}

export function LoginPage() {
  const navigate = useNavigate()
  const { accounts, findAccountByRole, login, resetDemoData } = useDemoData()
  const [email, setEmail] = useState('demo@privadareforma.mx')
  const [role, setRole] = useState<UserRole>('resident')
  const [errorMessage, setErrorMessage] = useState('')

  function handleLogin() {
    const result = loginDraftSchema.safeParse({ email, role })
    if (!result.success) {
      setErrorMessage(result.error.issues[0]?.message ?? 'Revisa tus datos.')
      return
    }

    login(result.data.email, result.data.role)
    setErrorMessage('')
    navigate(getRoleLandingPath(result.data.role))
  }

  function fillDemoAccount(nextRole: UserRole) {
    const account = findAccountByRole(nextRole)
    if (!account) {
      return
    }

    setRole(account.role)
    setEmail(account.email)
  }

  return (
    <AppCard className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Acceso seguro
        </p>
        <h1 className="text-xl font-semibold">Privada Reforma</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Sprint 0.6: incidencias, QR y guardia offline sin backend.
        </p>
      </header>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Correo</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Rol</span>
        <select
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--color-brand)]"
          value={role}
          onChange={(event) => {
            const parsedRole = userRoleSchema.safeParse(event.target.value)
            if (parsedRole.success) {
              setRole(parsedRole.data)
            }
          }}
        >
          {userRoleSchema.options.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleLabels[roleOption]}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Cuentas demo locales
        </p>
        <div className="grid grid-cols-1 gap-2">
          {accounts.slice(0, 4).map((account) => (
            <button
              key={account.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-left text-xs"
              onClick={() => fillDemoAccount(account.role)}
              type="button"
            >
              <p className="font-semibold text-[var(--color-text)]">
                {account.fullName}
              </p>
              <p className="text-[var(--color-text-muted)]">
                {account.email} - {roleLabels[account.role]} ({account.unitId})
              </p>
            </button>
          ))}
        </div>
      </div>

      {import.meta.env.DEV ? (
        <AppButton block onClick={resetDemoData} variant="secondary">
          Reset demo data (dev)
        </AppButton>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <AppButton block onClick={handleLogin}>
        Entrar
      </AppButton>
    </AppCard>
  )
}
