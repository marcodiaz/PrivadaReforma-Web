import { useState } from 'react'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import type { Package } from '../../shared/domain/packages'

const MAX_UPLOAD_BYTES = 500 * 1024
const TARGET_UPLOAD_BYTES = 400 * 1024

function packageStatusChip(status: Package['status']) {
  if (status === 'stored') {
    return 'bg-amber-100 text-amber-700'
  }
  if (status === 'ready_for_pickup') {
    return 'bg-emerald-100 text-emerald-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function packageStatusText(status: Package['status']) {
  if (status === 'stored') {
    return 'Waiting at lobby'
  }
  if (status === 'ready_for_pickup') {
    return 'You requested pickup'
  }
  return 'Delivered'
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No fue posible procesar la imagen.'))
    img.src = dataUrl
  })
}

async function compressImageToDataUrl(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(originalDataUrl)
  const maxWidth = 1280
  const scale = Math.min(1, maxWidth / image.width)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo preparar compresion de imagen.')
  }
  ctx.drawImage(image, 0, 0, width, height)

  const tryQualities = [0.85, 0.75, 0.65, 0.55]
  for (const quality of tryQualities) {
    const dataUrl = canvas.toDataURL('image/webp', quality)
    if (dataUrl.length <= TARGET_UPLOAD_BYTES * 1.37) {
      return dataUrl
    }
  }
  return canvas.toDataURL('image/webp', 0.5)
}

export function AppPackagesPage() {
  const { getPackagesForUser, getHeldPackageCountForUser, markPackageReady, session } =
    useDemoData()
  const [showHistory, setShowHistory] = useState(false)
  const [feedback, setFeedback] = useState('')
  const packages = getPackagesForUser()
  const heldCount = getHeldPackageCountForUser()
  const activePackages = packages.filter((entry) => entry.status !== 'delivered')
  const deliveredPackages = packages.filter((entry) => entry.status === 'delivered')

  function handleReady(packageId: string) {
    const result = markPackageReady(packageId)
    setFeedback(result.ok ? 'Listo. Muestra esto al guardia.' : (result.error ?? 'Error.'))
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino / Comite"
        title="Paquetes"
        description="Flujo seguro: guardia resguarda -> residente confirma -> guardia entrega."
      />
      <AppCard>
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Packages held
        </p>
        <p className="text-2xl font-semibold">{heldCount}</p>
      </AppCard>
      {feedback ? (
        <AppCard className="border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
          {feedback}
        </AppCard>
      ) : null}
      <div className="space-y-2">
        {activePackages.length === 0 ? (
          <AppCard className="text-sm text-[var(--color-text-muted)]">
            Sin paquetes activos para tu unidad.
          </AppCard>
        ) : (
          activePackages.map((entry) => (
            <AppCard key={entry.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Unidad {entry.unitNumber}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${packageStatusChip(entry.status)}`}
                >
                  {packageStatusText(entry.status)}
                </span>
              </div>
              <img
                alt={`Paquete ${entry.unitNumber}`}
                className="h-24 w-full rounded-xl border border-[var(--color-border)] object-cover"
                src={entry.photoUrl}
              />
              {entry.carrier ? (
                <p className="text-xs text-[var(--color-text-muted)]">Carrier: {entry.carrier}</p>
              ) : null}
              {entry.notes ? (
                <p className="text-xs text-[var(--color-text-muted)]">Notas: {entry.notes}</p>
              ) : null}
              {entry.status === 'stored' && session?.role !== 'board' ? (
                <AppButton block onClick={() => handleReady(entry.id)}>
                  I'm coming to pick up
                </AppButton>
              ) : null}
              {entry.status === 'ready_for_pickup' ? (
                <p className="text-xs font-semibold text-emerald-700">Show this to the guard.</p>
              ) : null}
            </AppCard>
          ))
        )}
      </div>
      <AppButton block onClick={() => setShowHistory((current) => !current)} variant="secondary">
        {showHistory ? 'Hide delivered history' : 'Show delivered history'}
      </AppButton>
      {showHistory ? (
        <div className="space-y-2">
          {deliveredPackages.length === 0 ? (
            <AppCard className="text-sm text-[var(--color-text-muted)]">
              Sin historial de entrega.
            </AppCard>
          ) : (
            deliveredPackages.map((entry) => (
              <AppCard key={entry.id} className="space-y-1">
                <p className="text-sm font-semibold">Unidad {entry.unitNumber}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Entregado:{' '}
                  {entry.deliveredAt ? new Date(entry.deliveredAt).toLocaleString() : '-'}
                </p>
              </AppCard>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function GuardPackagesPage() {
  const { deliverPackage, getHeldPackageCountGlobal, getPackagesForUser, registerPackage } =
    useDemoData()
  const [activeTab, setActiveTab] = useState<'register' | 'held'>('register')
  const [unitNumber, setUnitNumber] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [carrier, setCarrier] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState('')
  const [statusFilter, setStatusFilter] = useState<'stored' | 'ready_for_pickup'>('stored')

  const heldCount = getHeldPackageCountGlobal()
  const packages = getPackagesForUser()
    .filter((entry) => entry.status === statusFilter)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  async function handleFileChange(file: File | null) {
    if (!file) {
      return
    }
    try {
      const compressedDataUrl = await compressImageToDataUrl(file)
      if (compressedDataUrl.length > MAX_UPLOAD_BYTES * 1.37) {
        setFeedback('Imagen demasiado grande. Intenta una foto mas ligera (<500KB).')
        return
      }
      setPhotoUrl(compressedDataUrl)
      setFeedback('Imagen lista para guardar.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No fue posible procesar imagen.')
    }
  }

  function handleRegister() {
    const result = registerPackage({
      unitNumber,
      photoUrl,
      carrier,
      notes,
    })
    setFeedback(result.ok ? 'Paquete registrado.' : (result.error ?? 'Error.'))
    if (result.ok) {
      setUnitNumber('')
      setPhotoUrl('')
      setCarrier('')
      setNotes('')
    }
  }

  function handleDeliver(packageId: string) {
    const result = deliverPackage(packageId)
    setFeedback(result.ok ? 'Paquete entregado.' : (result.error ?? 'Error.'))
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Paqueteria"
        description="Registro y entrega segura con confirmacion previa del residente."
      />
      <AppCard className="border-slate-700 bg-slate-900 text-slate-100">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Held packages</p>
        <p className="text-2xl font-semibold">{heldCount}</p>
      </AppCard>
      <div className="grid grid-cols-2 gap-2">
        <AppButton
          block
          onClick={() => setActiveTab('register')}
          variant={activeTab === 'register' ? 'primary' : 'secondary'}
        >
          Register package
        </AppButton>
        <AppButton
          block
          onClick={() => setActiveTab('held')}
          variant={activeTab === 'held' ? 'primary' : 'secondary'}
        >
          Held packages
        </AppButton>
      </div>
      {feedback ? (
        <AppCard className="border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-100">
          {feedback}
        </AppCard>
      ) : null}

      {activeTab === 'register' ? (
        <AppCard className="space-y-2 border-slate-700 bg-slate-900 text-slate-100">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setUnitNumber(event.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Unidad (1141)"
            type="tel"
            value={unitNumber}
          />
          <label className="block text-xs text-slate-300">
            Foto del paquete (requerida)
            <input
              accept="image/*"
              className="mt-1 block w-full text-xs"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="o pega photoUrl/dataURL manual"
            value={photoUrl}
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            onChange={(event) => setCarrier(event.target.value)}
            placeholder="Carrier (opcional)"
            value={carrier}
          />
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            value={notes}
          />
          <AppButton block onClick={handleRegister}>
            Registrar paquete
          </AppButton>
        </AppCard>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <AppButton
              block
              onClick={() => setStatusFilter('stored')}
              variant={statusFilter === 'stored' ? 'primary' : 'secondary'}
            >
              Stored
            </AppButton>
            <AppButton
              block
              onClick={() => setStatusFilter('ready_for_pickup')}
              variant={statusFilter === 'ready_for_pickup' ? 'primary' : 'secondary'}
            >
              Ready
            </AppButton>
          </div>
          {packages.length === 0 ? (
            <AppCard className="border-slate-700 bg-slate-900 text-sm text-slate-300">
              Sin paquetes en este filtro.
            </AppCard>
          ) : (
            packages.map((entry) => (
              <AppCard
                key={entry.id}
                className="space-y-2 border-slate-700 bg-slate-900 text-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Unidad {entry.unitNumber}</p>
                    <p className="text-xs text-slate-300">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${packageStatusChip(entry.status)}`}
                  >
                    {entry.status}
                  </span>
                </div>
                <img
                  alt={`Paquete ${entry.unitNumber}`}
                  className="h-24 w-full rounded-xl border border-slate-700 object-cover"
                  src={entry.photoUrl}
                />
                {entry.status === 'stored' ? (
                  <div className="space-y-1">
                    <AppButton block disabled variant="secondary">
                      Deliver package
                    </AppButton>
                    <p className="text-xs text-amber-300">Waiting for resident confirmation.</p>
                  </div>
                ) : (
                  <AppButton block onClick={() => handleDeliver(entry.id)}>
                    Deliver package
                  </AppButton>
                )}
              </AppCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function AdminPackagesPage() {
  const { getPackagesForUser, getHeldPackageCountGlobal } = useDemoData()
  const [statusFilter, setStatusFilter] = useState<'all' | Package['status']>('all')
  const packages = getPackagesForUser()
  const filtered = packages.filter((entry) =>
    statusFilter === 'all' ? true : entry.status === statusFilter
  )

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador / Comite"
        title="Paquetes"
        description="Resumen global de paqueteria por unidad (solo lectura)."
      />
      <AppCard>
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Held packages
        </p>
        <p className="text-2xl font-semibold">{getHeldPackageCountGlobal()}</p>
      </AppCard>
      <div className="grid grid-cols-2 gap-2">
        <AppButton block onClick={() => setStatusFilter('all')} variant="secondary">
          All
        </AppButton>
        <select
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-sm"
          onChange={(event) => setStatusFilter(event.target.value as 'all' | Package['status'])}
          value={statusFilter}
        >
          <option value="all">all</option>
          <option value="stored">stored</option>
          <option value="ready_for_pickup">ready_for_pickup</option>
          <option value="delivered">delivered</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((entry) => (
          <AppCard key={entry.id}>
            <p className="text-sm font-semibold">Unidad {entry.unitNumber}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {entry.status} - {new Date(entry.createdAt).toLocaleString()}
            </p>
          </AppCard>
        ))}
      </div>
    </div>
  )
}
