import { useState } from 'react'
import { useSupabaseAuth } from './SupabaseAuthProvider'

const DEV_ROLE_OPTIONS = [
  'admin',
  'resident',
  'tenant',
  'guard',
  'board_member',
  'maintenance',
] as const

export function DevProfileTools() {
  const { profile, session, updateMyProfile } = useSupabaseAuth()
  const [role, setRole] = useState<(typeof DEV_ROLE_OPTIONS)[number]>(profile?.role ?? 'resident')
  const [unitNumber, setUnitNumber] = useState(profile?.unit_number ?? '')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const enabled = import.meta.env.VITE_DEV_TOOLS === 'true'
  const canShow = enabled && Boolean(session)

  if (!canShow) {
    return null
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateMyProfile({
      role,
      unitNumber: unitNumber.trim() || null,
    })
    setSaving(false)
    setStatus(result.ok ? 'Perfil actualizado. Recarga para refrescar vistas activas.' : (result.error ?? 'Error.'))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-slate-300 bg-white p-3 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Dev Tools
      </p>
      <p className="mb-2 text-xs text-slate-600">Perfil Supabase (usuario actual)</p>
      <p className="mb-2 text-[11px] text-slate-500">
        Actual: {profile?.role ?? '-'} / {profile?.unit_number ?? '-'}
      </p>
      <label className="block text-xs text-slate-700">
        Rol
        <select
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
          onChange={(event) => setRole(event.target.value as (typeof DEV_ROLE_OPTIONS)[number])}
          value={role}
        >
          {DEV_ROLE_OPTIONS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 block text-xs text-slate-700">
        unit_number
        <input
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
          onChange={(event) => setUnitNumber(event.target.value)}
          placeholder="1141 (o vacio)"
          value={unitNumber}
        />
      </label>
      <button
        className="mt-3 w-full rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        disabled={saving}
        onClick={() => void handleSave()}
        type="button"
      >
        {saving ? 'Guardando...' : 'Guardar perfil'}
      </button>
      {status ? <p className="mt-2 text-xs text-slate-600">{status}</p> : null}
    </div>
  )
}
