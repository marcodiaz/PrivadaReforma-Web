import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppButton, AppCard, MarketplacePhoto, ModulePlaceholder, PetPhoto } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { sortIncidentsForGuard } from '../incidents/logic'
import { filterMarketplacePosts } from '../marketplace/logic'
import type { Incident, PetProfile, Poll } from '../../shared/domain/demoData'
import {
  buildQrImageUrl,
  buildQrPayload,
  getLast4Code,
  normalizeDepartmentCode,
} from '../access/qrLogic'
import { isSupabaseConfigured, supabase } from '../../shared/supabase/client'
import { sendPushTestToUser, uploadMarketplacePhoto, uploadPetPhoto } from '../../shared/supabase/data'
import {
  getNotificationPermissionState,
  isWebPushConfigured,
  isWebPushSupported,
  subscribeThisDeviceToPush,
  unsubscribeThisDeviceFromPush,
} from '../../shared/push/webPush'
import { adminCreateOrInviteUser } from '../../shared/supabase/admin'
import { useLanguage } from '../../shared/i18n/LanguageContext'
import { useTheme } from '../../shared/theme/ThemeContext'
export { AppPackagesPage } from '../packages/pages'

function priorityBadge(priority: Incident['priority']) {
  if (priority === 'high') {
    return 'bg-red-100 text-red-700'
  }
  if (priority === 'medium') {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function incidentEmphasis(score: number) {
  if (score >= 10) {
    return 'ring-2 ring-red-500 border-red-500/40 bg-red-50'
  }
  if (score >= 5) {
    return 'ring-2 ring-amber-500 border-amber-500/40 bg-amber-50'
  }
  return ''
}

const reportActionClass =
  'border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
const MAX_MARKETPLACE_UPLOAD_BYTES = 15 * 1024 * 1024

const petBehaviorTraitOptions: Array<{ value: PetProfile['behaviorTraits'][number]; label: string; icon: string }> = [
  { value: 'playful', label: 'Playful', icon: '🎾' },
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'protective', label: 'Protective', icon: '🛡️' },
  { value: 'curious', label: 'Curious', icon: '🧭' },
  { value: 'anxious', label: 'Anxious', icon: '😟' },
  { value: 'stubborn', label: 'Stubborn', icon: '🧱' },
  { value: 'gentle', label: 'Gentle', icon: '🤍' },
  { value: 'vocal', label: 'Vocal', icon: '🔊' },
  { value: 'alert', label: 'Alert', icon: '👀' },
  { value: 'lazy', label: 'Lazy', icon: '🛋️' },
]

const petKnownCommandOptions: Array<{ value: PetProfile['commandsKnown'][number]; label: string; icon: string }> = [
  { value: 'sit', label: 'Sit', icon: '🪑' },
  { value: 'stay', label: 'Stay', icon: '✋' },
  { value: 'come', label: 'Come', icon: '📣' },
  { value: 'down', label: 'Down', icon: '⬇️' },
  { value: 'heel', label: 'Heel', icon: '🦶' },
  { value: 'leave_it', label: 'Leave it', icon: '🚫' },
  { value: 'drop_it', label: 'Drop it', icon: '📦' },
]

const petPersonalityHighlightOptions: Array<{
  value: PetProfile['personalityHighlights'][number]
  label: string
  icon: string
}> = [
  { value: 'loves_people', label: 'Loves people', icon: '💞' },
  { value: 'high_energy', label: 'High energy', icon: '⚡' },
  { value: 'great_with_kids', label: 'Great with kids', icon: '🧒' },
  { value: 'needs_training', label: 'Needs training', icon: '🎓' },
  { value: 'independent', label: 'Independent', icon: '🧠' },
]

const petPrefersOptions: Array<{ value: PetProfile['prefers'][number]; label: string; icon: string }> = [
  { value: 'small_dogs', label: 'Small dogs', icon: '🐕' },
  { value: 'large_dogs', label: 'Large dogs', icon: '🐕‍🦺' },
  { value: 'calm_pets', label: 'Calm pets', icon: '🧘' },
  { value: 'energetic_pets', label: 'Energetic pets', icon: '⚡' },
]

const petAvailableForOptions: Array<{
  value: PetProfile['availableFor'][number]
  label: string
  icon: string
}> = [
  { value: 'playdates', label: 'Playdates', icon: '🎉' },
  { value: 'breeding', label: 'Breeding', icon: '🧬' },
  { value: 'adoption', label: 'Adoption', icon: '🏡' },
  { value: 'training_buddies', label: 'Training buddies', icon: '🏋️' },
  { value: 'walk_groups', label: 'Walk groups', icon: '🚶' },
]

function toggleInArray<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
}

function normalizeEnergyLevel(
  value: PetProfile['energyLevel'] | undefined
): 'chill' | 'balanced' | 'zoomies' {
  if (value === 'low' || value === 'chill') {
    return 'chill'
  }
  if (value === 'high' || value === 'zoomies') {
    return 'zoomies'
  }
  return 'balanced'
}

function createDefaultPetProfile(): PetProfile {
  return {
    socialWithHumans: 'depends',
    socialWithChildren: 'depends',
    socialWithDogs: 'depends',
    socialWithCats: 'depends',
    socialWithOtherAnimals: 'depends',
    energyLevel: 'balanced',
    friendliness: 'neutral',
    independence: 'balanced',
    affectionLevel: 'medium',
    behaviorTraits: [],
    vaccinated: 'up_to_date',
    specialNeeds: false,
    groomingNeeds: 'medium',
    houseTrained: 'in_progress',
    crateTrained: 'unknown',
    leashTrained: 'in_progress',
    recallTrained: 'partial',
    commandsKnown: [],
    species: 'dog',
    size: 'm',
    personalityHighlights: [],
    likesPlaydates: 'selective',
    prefers: [],
    availableFor: [],
  }
}

function normalizePetProfile(input?: PetProfile): PetProfile {
  const base = createDefaultPetProfile()
  if (!input) {
    return base
  }
  return {
    ...base,
    ...input,
    energyLevel: normalizeEnergyLevel(input.energyLevel),
  }
}

async function compressImageForUpload(file: File, maxDimension = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    return file
  }
  if (file.type.includes('heic') || file.type.includes('heif')) {
    throw new Error('Formato HEIC/HEIF no compatible en este navegador. Usa JPG o PNG.')
  }

  const toCanvasBlob = async (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      return file
    }
    draw(context)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })
    return blob ?? file
  }

  if ('createImageBitmap' in window) {
    const imageBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    try {
      const largestSide = Math.max(imageBitmap.width, imageBitmap.height)
      const scale = largestSide > maxDimension ? maxDimension / largestSide : 1
      const width = Math.max(1, Math.round(imageBitmap.width * scale))
      const height = Math.max(1, Math.round(imageBitmap.height * scale))
      return await toCanvasBlob(width, height, (ctx) => {
        ctx.drawImage(imageBitmap, 0, 0, width, height)
      })
    } finally {
      imageBitmap.close()
    }
  }

  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image()
      node.onload = () => resolve(node)
      node.onerror = () => reject(new Error('No fue posible procesar la imagen.'))
      node.src = imageUrl
    })
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    return await toCanvasBlob(width, height, (ctx) => {
      ctx.drawImage(image, 0, 0, width, height)
    })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export function AppHomePage() {
  const { tx } = useLanguage()
  const {
    incidents,
    qrPasses,
    auditLog,
    parkingReports,
    polls,
    petPosts,
    maintenanceReports,
    marketplacePosts,
    remoteDataLoading,
    session,
  } =
    useDemoData()
  const navigate = useNavigate()
  const myQrPasses = qrPasses.filter((pass) => pass.createdByUserId === session?.userId)
  const activeAlerts = incidents.filter((incident) => incident.supportScore >= 3).length
  const activeQr = myQrPasses.filter((pass) => pass.status === 'active').length
  const activeParkingReports = parkingReports.filter(
    (report) => report.status === 'open' && report.createdByUserId === session?.userId
  ).length
  const activePolls = polls.length
  const activePetPosts = petPosts.length
  const activeMaintenanceReports = maintenanceReports.filter(
    (report) => report.status === 'open' && report.createdByUserId === session?.userId
  ).length
  const activeMarketPosts = marketplacePosts.filter((post) => post.status === 'active').length
  const profileTitle = `${session?.fullName ?? tx('Usuario', 'User')} - ${session?.unitNumber ?? tx('Sin departamento', 'No unit')}`
  const menuItems = [
    { label: tx('Comunicados', 'Announcements'), icon: 'CO', action: () => navigate('/app/announcements') },
    { label: tx('Visitas', 'Visits'), icon: 'VI', action: () => navigate('/app/visits') },
    { label: tx('Reservaciones', 'Reservations'), icon: 'RE', action: () => navigate('/app/reservations') },
    { label: tx('Estacionamiento', 'Parking'), icon: 'ES', action: () => navigate('/app/parking') },
    { label: tx('Votaciones', 'Polls'), icon: 'VO', action: () => navigate('/app/polls') },
    { label: tx('Mascotas', 'Pets'), icon: 'MA', action: () => navigate('/app/pets') },
    { label: tx('Rep. Manto', 'Maint. Report'), icon: 'RM', action: () => navigate('/app/maintenance') },
    { label: 'Marketplace', icon: 'MK', action: () => navigate('/app/marketplace') },
    ...(session?.role === 'resident'
      ? [{ label: tx('Agregar Inquilino', 'Add Tenant'), icon: 'TI', action: () => navigate('/app/add-tenant') }]
      : []),
    { label: tx('Paquetes', 'Packages'), icon: 'PA', action: () => navigate('/app/packages') },
    { label: tx('Incidencias', 'Incidents'), icon: 'IN', action: () => navigate('/app/incidents') },
    { label: tx('Perfil', 'Profile'), icon: 'PE', action: () => navigate('/app/profile') },
    { label: tx('Estado de Cuenta', 'Account Statement'), icon: 'EC', action: () => navigate('/app/finance') },
  ]

  return (
    <div className="space-y-4">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title={profileTitle}
        description={tx('Accesos, comunicados y modulos principales.', 'Access, announcements, and main modules.')}
      />
      {remoteDataLoading ? (
        <AppCard className="rounded-xl border-zinc-700 bg-zinc-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            {tx('Sincronizando datos...', 'Syncing data...')}
          </p>
        </AppCard>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={() => navigate('/app/visits')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">{tx('QR activos', 'Active QR')}</p>
            <p className="text-2xl font-bold text-white">{activeQr}</p>
          </AppCard>
        </button>
        <button onClick={() => navigate('/app/incidents?highlight=alert')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">{tx('Alertas', 'Alerts')}</p>
            <p className="text-2xl font-bold text-white">{activeAlerts}</p>
          </AppCard>
        </button>
        <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase text-slate-400">{tx('Auditoria', 'Audit')}</p>
          <p className="text-2xl font-bold text-white">{auditLog.length}</p>
        </AppCard>
        <button onClick={() => navigate('/app/parking')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">Parking</p>
            <p className="text-2xl font-bold text-white">{activeParkingReports}</p>
          </AppCard>
        </button>
        <button onClick={() => navigate('/app/polls')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">{tx('Votaciones', 'Polls')}</p>
            <p className="text-2xl font-bold text-white">{activePolls}</p>
          </AppCard>
        </button>
        <button onClick={() => navigate('/app/pets')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">{tx('Mascotas', 'Pets')}</p>
            <p className="text-2xl font-bold text-white">{activePetPosts}</p>
          </AppCard>
        </button>
        <button onClick={() => navigate('/app/maintenance')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">{tx('Mantenimiento', 'Maintenance')}</p>
            <p className="text-2xl font-bold text-white">{activeMaintenanceReports}</p>
          </AppCard>
        </button>
        <button onClick={() => navigate('/app/marketplace')} type="button">
          <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center transition hover:border-zinc-500">
            <p className="text-[11px] uppercase text-slate-400">Marketplace</p>
            <p className="text-2xl font-bold text-white">{activeMarketPosts}</p>
          </AppCard>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AppButton block onClick={() => navigate('/app/reservations')} variant="secondary">
          {tx('Reservaciones', 'Reservations')}
        </AppButton>
        <AppButton block onClick={() => navigate('/app/parking')} variant="secondary">
          {tx('Reporte Estacionamiento', 'Parking Report')}
        </AppButton>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {menuItems.map((item) => (
          <button key={item.label} onClick={item.action} type="button">
            <AppCard className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-zinc-500">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-[linear-gradient(180deg,_#2a2a2a,_#1a1a1a)] text-xs font-bold tracking-[0.14em] text-zinc-100">
                {item.icon}
              </span>
              <span className="text-center text-sm font-medium tracking-[-0.01em] text-slate-100">
                {item.label}
              </span>
            </AppCard>
          </button>
        ))}
      </div>
    </div>
  )
}

export function AppVisitsPage() {
  const { qrPasses, createQrPass, deleteQrPass, debtMode, session } = useDemoData()
  const [visitorName, setVisitorName] = useState('')
  const [accessType, setAccessType] = useState<'temporal' | 'time_limit'>('temporal')
  const [timeLimit, setTimeLimit] = useState<'week' | 'month' | 'permanent'>('week')
  const [maxUses, setMaxUses] = useState(1)
  const [maxPersons, setMaxPersons] = useState(1)
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [visitorPhotoUrl, setVisitorPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [accessMessage, setAccessMessage] = useState('')
  const [message, setMessage] = useState('')
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const accountUnitNumber = session?.unitNumber?.trim() ?? ''
  const accountDepartmentCode = normalizeDepartmentCode(session?.unitNumber ?? '').slice(0, 4)

  const myQrPasses = qrPasses.filter((pass) => pass.createdByUserId === session?.userId)
  const selectedQr = myQrPasses.find((pass) => pass.id === selectedQrId) ?? null
  const selectedQrPayload = useMemo(() => {
    if (!selectedQr) {
      return ''
    }
    return buildQrPayload({
      id: selectedQr.id,
      displayCode: selectedQr.displayCode,
      qrValue: selectedQr.qrValue,
      unitId: selectedQr.unitId,
      status: selectedQr.status,
      type: selectedQr.type,
      endAt: selectedQr.endAt,
      visitorName: selectedQr.visitorName,
      maxPersons: selectedQr.maxPersons,
    })
  }, [selectedQr])
  const selectedQrImageUrl = selectedQr ? buildQrImageUrl(selectedQrPayload, 440) : ''

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const nextPhotoUrl = URL.createObjectURL(file)
    setVisitorPhotoUrl((previous) => {
      if (previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return nextPhotoUrl
    })
    setPhotoName(file.name)
  }

  function handleCreateQr() {
    const normalizedVisitorName = visitorName.trim().toUpperCase()
    if (!accountUnitNumber) {
      setMessage('Tu cuenta no tiene unidad/departamento asignado.')
      return
    }
    const result = createQrPass({
      label: `Visita: ${normalizedVisitorName || 'VISITANTE'}`,
      unitId: accountUnitNumber,
      departmentCode: accountDepartmentCode,
      visitorName: normalizedVisitorName,
      maxUses,
      maxPersons,
      accessMessage:
        accessMessage.trim() ||
        `Hola. Este es tu codigo de acceso: [${accountDepartmentCode}] para la fecha ${visitDate}.`,
      accessType,
      timeLimit: accessType === 'time_limit' ? timeLimit : undefined,
      visitorPhotoUrl: visitorPhotoUrl || undefined,
    })
    setMessage(result.ok ? 'QR creado correctamente.' : result.error ?? 'Error.')
    if (result.ok) {
      setAccessMessage('')
      if (visitorPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(visitorPhotoUrl)
      }
      setVisitorPhotoUrl('')
      setPhotoName('')
      setPhotoInputKey((previous) => previous + 1)
    }
  }

  useEffect(() => {
    return () => {
      if (visitorPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(visitorPhotoUrl)
      }
    }
  }, [visitorPhotoUrl])

  async function handleCopyPayload() {
    if (!selectedQrPayload) {
      return
    }
    try {
      await navigator.clipboard.writeText(selectedQrPayload)
      setCopyMessage('Link de acceso copiado.')
    } catch {
      setCopyMessage('No fue posible copiar en este dispositivo.')
    }
    window.setTimeout(() => setCopyMessage(''), 2200)
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Visitantes"
        description="Registro programado y codigos QR para acceso."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Reg. Visita Programada</p>
        {debtMode ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            debtMode activo: la creacion de QR esta bloqueada.
          </p>
        ) : null}
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Nombre del visitante
          </span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setVisitorName(event.target.value)}
            placeholder="Ej. Juan Perez"
            value={visitorName}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Unidad / Depto
          </span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            disabled
            placeholder="Sin departamento"
            readOnly
            value={accountUnitNumber}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Temporalidad
            </span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setAccessType(event.target.value as 'temporal' | 'time_limit')}
              value={accessType}
            >
              <option value="temporal">Fecha unica</option>
              <option value="time_limit">Con vigencia</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Fecha
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setVisitDate(event.target.value)}
              type="date"
              value={visitDate}
            />
          </label>
        </div>
        {accessType === 'time_limit' ? (
          <>
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                Vigencia
              </span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
                onChange={(event) =>
                  setTimeLimit(event.target.value as 'week' | 'month' | 'permanent')
                }
                value={timeLimit}
              >
                <option value="week">1 semana</option>
                <option value="month">1 mes</option>
                <option value="permanent">Permanente</option>
              </select>
            </label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setVisitorPhotoUrl(event.target.value)}
              placeholder="visitorPhotoUrl (opcional)"
              value={visitorPhotoUrl}
            />
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                Foto visitante (opcional)
              </span>
              <input
                accept="image/*"
                capture="environment"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-100"
                key={photoInputKey}
                onChange={handlePhotoSelection}
                type="file"
              />
              {photoName ? <p className="text-xs text-zinc-400">Archivo: {photoName}</p> : null}
            </label>
          </>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Max. usos
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              min={1}
              onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={maxUses}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Max. personas
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              min={1}
              onChange={(event) => setMaxPersons(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={maxPersons}
            />
          </label>
        </div>
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          onChange={(event) => setAccessMessage(event.target.value)}
          placeholder="Mensaje opcional para compartir"
          rows={2}
          value={accessMessage}
        />
        <AppButton block onClick={handleCreateQr}>
          Registrar
        </AppButton>
        {message ? <p className="text-xs text-slate-300">{message}</p> : null}
      </AppCard>
      <div className="space-y-2">
        {myQrPasses.map((pass) => (
          <button
            className="block w-full text-left"
            key={pass.id}
            onClick={() => setSelectedQrId(pass.id)}
            type="button"
          >
            <AppCard className="border-slate-700 bg-slate-900 hover:border-[var(--color-brand)]/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{pass.visitorName ?? pass.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700">
                    {pass.type === 'single_use' ? 'Temporal' : 'Time limit'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Unidad: {pass.unitId} - Estado: {pass.status}
                </p>
                <p className="text-xs font-semibold text-slate-300">
                  Codigo: {pass.displayCode} (ultimos 4: {getLast4Code(pass.displayCode)})
                </p>
              </div>
            </AppCard>
          </button>
        ))}
      </div>
      {selectedQr ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <header className="mb-2 rounded-xl bg-zinc-900 px-3 py-2 text-center">
              <p className="text-xl font-semibold text-white">Residencia QR</p>
            </header>
            <AppCard className="space-y-2 border-slate-300 bg-slate-100">
              <img
                alt="Codigo QR de acceso"
                className="mx-auto w-full max-w-[320px] rounded-lg bg-white p-3"
                src={selectedQrImageUrl}
              />
              <p className="text-center text-xl font-bold text-zinc-900">
                {selectedQr.visitorName ?? 'VISITA'}
              </p>
              <p className="text-center text-sm font-semibold text-slate-600">
                {new Date().toLocaleDateString()} - Max. Personas: {selectedQr.maxPersons ?? 1}
              </p>
              <p className="rounded-lg bg-zinc-200 px-3 py-2 text-center text-sm text-slate-700">
                {selectedQr.accessMessage ??
                  `Hola. Este es tu codigo de acceso: ${selectedQr.displayCode} [Depto. ${selectedQr.unitId}].`}
              </p>
              <p className="rounded-lg bg-white px-2 py-1 text-center text-xs font-mono text-slate-700">
                Token: {selectedQr.qrValue}
              </p>
              {copyMessage ? <p className="text-center text-xs text-slate-500">{copyMessage}</p> : null}
              <AppButton block onClick={handleCopyPayload} variant="secondary">
                Copiar Link De Acceso
              </AppButton>
              <div className="grid grid-cols-2 gap-2">
                <AppButton onClick={() => setSelectedQrId(null)} variant="secondary">
                  Cerrar
                </AppButton>
                <AppButton
                  onClick={() => {
                    deleteQrPass(selectedQr.id)
                    setSelectedQrId(null)
                  }}
                  variant="danger"
                >
                  Borrar QR
                </AppButton>
              </div>
            </AppCard>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppPoolPage() {
  const { createReservation, getActiveReservations, session } = useDemoData()
  const [amenity, setAmenity] = useState('Terraza')
  const [reservationDate, setReservationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const activeReservations = getActiveReservations()

  function handleReserve() {
    const result = createReservation({ amenity, reservationDate })
    setMessage(result.ok ? 'Reservacion registrada.' : result.error ?? 'No se pudo reservar.')
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Reservaciones"
        description="Solo viernes/sabado. Cuota fija por reservacion: $5,000 MXN."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Nueva reservacion</p>
        <p className="text-xs text-zinc-400">Departamento: {session?.unitNumber ?? 'Sin departamento'}</p>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Amenidad</span>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setAmenity(event.target.value)}
            value={amenity}
          >
            <option value="Terraza">Terraza</option>
            <option value="Salon de eventos">Salon de eventos</option>
            <option value="Asador">Asador</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Fecha</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setReservationDate(event.target.value)}
            type="date"
            value={reservationDate}
          />
        </label>
        <p className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          Fee de reservacion: <strong>$5,000 MXN</strong>
        </p>
        <AppButton block onClick={handleReserve}>
          Reservar
        </AppButton>
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Reservaciones activas (toda la privada)</p>
        {activeReservations.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay reservaciones activas.</p>
        ) : (
          <div className="space-y-2">
            {activeReservations.map((reservation) => (
              <div
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                key={reservation.id}
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {reservation.amenity} - {reservation.reservationDate}
                </p>
                <p className="text-xs text-zinc-400">
                  Depto: {reservation.unitNumber} | Fee: ${reservation.fee.toLocaleString('es-MX')} MXN
                </p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AppParkingPage() {
  const { createParkingReport, getAssignedParkingForUnit, parkingReports, session } = useDemoData()
  const [reportType, setReportType] = useState<'own_spot' | 'visitor_spot'>('own_spot')
  const [visitorParkingSpot, setVisitorParkingSpot] = useState('')
  const [description, setDescription] = useState('Vehiculo no autorizado ocupando mi lugar.')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState('')
  const myUnit = session?.unitNumber
  const mySpot = getAssignedParkingForUnit(myUnit)
  const myReports = parkingReports.filter((report) => report.createdByUserId === session?.userId)

  async function handlePhotoSelection(file: File | null) {
    if (!file) {
      return
    }
    setUploadingPhoto(true)
    setMessage('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No fue posible leer la foto.'))
        reader.readAsDataURL(file)
      })
      setPhotoUrl(dataUrl)
      setPhotoName(file.name)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar la foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleCreateReport() {
    const result = createParkingReport({
      description,
      reportType,
      visitorParkingSpot: reportType === 'visitor_spot' ? visitorParkingSpot : undefined,
      photoUrl,
    })
    setMessage(result.ok ? 'Reporte enviado a guardia.' : result.error ?? 'No se pudo enviar.')
    if (result.ok) {
      setReportType('own_spot')
      setVisitorParkingSpot('')
      setDescription('')
      setPhotoUrl('')
      setPhotoName('')
      setPhotoInputKey((previous) => previous + 1)
    }
  }

  function statusLabel(status: string) {
    if (status === 'open') {
      return 'Pendiente de atencion'
    }
    if (status === 'owner_notified') {
      return 'Guardia notifico al conductor'
    }
    return 'Guardia notifico a la grua'
  }

  function statusBadgeClass(status: string) {
    if (status === 'open') {
      return 'bg-amber-500/20 text-amber-200 border-amber-500/30'
    }
    if (status === 'owner_notified') {
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30'
    }
    return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Estacionamiento"
        description="Reporta a guardia sobre tu cajon o sobre cajones de visitante."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Nuevo reporte</p>
        <p className="text-xs text-zinc-400">Departamento: {myUnit ?? 'Sin departamento'}</p>
        <div className="grid grid-cols-2 gap-2">
          <AppButton
            block
            className={reportType === 'own_spot' ? 'ring-1 ring-zinc-400' : ''}
            onClick={() => setReportType('own_spot')}
            variant="secondary"
          >
            Mi cajon
          </AppButton>
          <AppButton
            block
            className={reportType === 'visitor_spot' ? 'ring-1 ring-zinc-400' : ''}
            onClick={() => setReportType('visitor_spot')}
            variant="secondary"
          >
            Cajon visitante
          </AppButton>
        </div>
        {reportType === 'own_spot' ? (
          <p className="text-xs text-zinc-400">Cajon asignado (auto): {mySpot}</p>
        ) : (
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setVisitorParkingSpot(event.target.value)}
            placeholder="Ej. V-12 / Visitante 4"
            value={visitorParkingSpot}
          />
        )}
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          value={description}
        />
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Foto (camara)
          </span>
          <input
            accept="image/*"
            capture="environment"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-100"
            key={photoInputKey}
            onChange={(event) => void handlePhotoSelection(event.target.files?.[0] ?? null)}
            type="file"
          />
          {photoName ? <p className="text-xs text-zinc-400">Archivo: {photoName}</p> : null}
          {photoUrl ? (
            <PetPhoto
              alt="Evidencia de estacionamiento"
              className="h-32 w-full rounded-xl border border-zinc-700 object-cover"
              pathOrUrl={photoUrl}
            />
          ) : null}
        </label>
        <AppButton block disabled={uploadingPhoto} onClick={handleCreateReport}>
          {uploadingPhoto ? 'Procesando foto...' : 'Reportar a guardia'}
        </AppButton>
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Mis reportes</p>
        {myReports.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin reportes por ahora.</p>
        ) : (
          <div className="space-y-2">
            {myReports.map((report) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2" key={report.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">{report.parkingSpot}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(report.status)}`}
                  >
                    {report.status === 'open' ? 'Pendiente' : 'Atendido'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Tipo: {report.reportType === 'visitor_spot' ? 'Visitante' : 'Mi cajon'}
                </p>
                <p className="text-xs text-zinc-300">{report.description}</p>
                {report.photoUrl ? (
                  <PetPhoto
                    alt="Evidencia enviada"
                    className="mt-2 h-28 w-full rounded-xl border border-zinc-700 object-cover"
                    pathOrUrl={report.photoUrl}
                  />
                ) : null}
                <p className="text-xs text-zinc-400">{statusLabel(report.status)}</p>
                {report.guardNote ? <p className="text-xs text-zinc-400">Nota: {report.guardNote}</p> : null}
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AppIncidentsPage() {
  const location = useLocation()
  const { incidents, updateVote, createIncident, createModerationReport, session } = useDemoData()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Incident['category']>('other')
  const [priority, setPriority] = useState<Incident['priority']>('medium')
  const [message, setMessage] = useState('')
  const [reportingIncidentId, setReportingIncidentId] = useState<string | null>(null)

  const sortedIncidents = useMemo(() => sortIncidentsForGuard(incidents), [incidents])
  const communalAlert = sortedIncidents.some((incident) => incident.supportScore >= 3)
  const searchParams = new URLSearchParams(location.search)
  const highlightedById = searchParams.get('incidentId')
  const highlightedByAlert =
    searchParams.get('highlight') === 'alert'
      ? sortedIncidents.find((incident) => incident.supportScore >= 10) ??
        sortedIncidents.find((incident) => incident.supportScore >= 3)
      : null
  const highlightedIncidentId = highlightedById ?? highlightedByAlert?.id ?? null

  function handleCreateIncident() {
    if (!title.trim() || !description.trim()) {
      setMessage('Titulo y descripcion son obligatorios.')
      return
    }
    const ok = createIncident({ title, description, category, priority })
    setMessage(ok ? 'Incidencia creada.' : 'No fue posible crear incidencia.')
    if (ok) {
      setTitle('')
      setDescription('')
      setCategory('other')
      setPriority('medium')
      setIsCreateModalOpen(false)
    }
  }

  async function handleReportIncident(incidentId: string) {
    setReportingIncidentId(incidentId)
    const result = await createModerationReport({
      targetType: 'incident',
      targetId: incidentId,
      reason: 'Contenido inapropiado en incidencia',
    })
    setMessage(result.ok ? 'Incidencia reportada para moderacion.' : result.error ?? 'No se pudo reportar.')
    setReportingIncidentId(null)
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Incidencias"
        description="Voto comunitario +1/-1 con score unico por usuario."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Incidencias de la comunidad</p>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold leading-none text-zinc-100 transition hover:border-zinc-500"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          +
        </button>
      </div>
      {message ? <p className="text-xs text-[var(--color-text-muted)]">{message}</p> : null}
      {communalAlert ? (
        <AppCard className="border-[var(--color-brand)]/40 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            Alerta comunitaria activa: incidencias con score alto se notifican a vecinos.
          </p>
        </AppCard>
      ) : null}
      <div className="space-y-2">
        {sortedIncidents.map((incident) => {
          const myVote = incident.votes.find((vote) => vote.userId === session?.userId)?.value
          return (
            <AppCard
              className={`${incidentEmphasis(incident.supportScore)} ${
                highlightedIncidentId === incident.id ? 'ring-2 ring-[var(--color-brand)]' : ''
              }`}
              key={incident.id}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(incident.createdAt).toLocaleString()} - {incident.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${priorityBadge(incident.priority)}`}
                    >
                      {incident.priority}
                    </span>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                      {incident.supportScore >= 0
                        ? `+${incident.supportScore}`
                        : incident.supportScore}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{incident.description}</p>
                {incident.supportScore >= 10 ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
                    Prioridad critica comunitaria
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <AppButton
                    className={`px-3 py-2 text-xs ${myVote === 1 ? 'ring-2 ring-emerald-400' : ''}`}
                    onClick={() => updateVote(incident.id, 1)}
                    variant="primary"
                  >
                    +1 Apoyar
                  </AppButton>
                  <AppButton
                    className={`px-3 py-2 text-xs ${myVote === -1 ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => updateVote(incident.id, -1)}
                    variant="secondary"
                  >
                    -1 Restar
                  </AppButton>
                  <AppButton
                    className={`px-3 py-2 text-xs ${reportActionClass}`}
                    disabled={reportingIncidentId === incident.id}
                    onClick={() => void handleReportIncident(incident.id)}
                    variant="secondary"
                  >
                    {reportingIncidentId === incident.id ? 'Enviando...' : 'Reportar'}
                  </AppButton>
                </div>
              </div>
            </AppCard>
          )
        })}
      </div>
      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-100">Nueva incidencia</p>
              <AppButton
                className="px-2 py-1 text-xs"
                onClick={() => setIsCreateModalOpen(false)}
                variant="secondary"
              >
                Cerrar
              </AppButton>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titulo"
                value={title}
              />
              <textarea
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descripcion"
                rows={3}
                value={description}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  onChange={(event) => setCategory(event.target.value as Incident['category'])}
                  value={category}
                >
                  <option value="noise">Ruido</option>
                  <option value="pets">Mascotas</option>
                  <option value="rules">Reglamento</option>
                  <option value="other">Otro</option>
                </select>
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  onChange={(event) => setPriority(event.target.value as Incident['priority'])}
                  value={priority}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <AppButton block onClick={handleCreateIncident}>
                Crear incidencia
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppMaintenancePage() {
  const { createMaintenanceReport, maintenanceReports, session } = useDemoData()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState<
    'plumbing' | 'electrical' | 'lighting' | 'common_area' | 'security' | 'other'
  >('plumbing')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [feedback, setFeedback] = useState('')

  const myReports = maintenanceReports.filter((report) => report.createdByUserId === session?.userId)

  async function handlePhotoUpload(file: File | null) {
    if (!file) {
      return
    }
    setUploadingPhoto(true)
    setFeedback('')
    try {
      if (isSupabaseConfigured && navigator.onLine) {
        const objectPath = await uploadPetPhoto(file)
        setPhotoUrl(objectPath)
        setPhotoName(file.name)
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('No fue posible leer la foto.'))
          reader.readAsDataURL(file)
        })
        setPhotoUrl(dataUrl)
        setPhotoName(file.name)
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo cargar foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function clearForm() {
    setTitle('')
    setDescription('')
    setReportType('plumbing')
    setPhotoUrl('')
    setPhotoName('')
  }

  function handleSubmit() {
    const result = createMaintenanceReport({
      title,
      description,
      reportType,
      photoUrl,
    })
    setFeedback(result.ok ? 'Reporte enviado.' : result.error ?? 'No se pudo enviar.')
    if (result.ok) {
      clearForm()
      setIsCreateModalOpen(false)
    }
  }

  function reportTypeLabel(type: typeof reportType) {
    if (type === 'plumbing') return 'Plomeria'
    if (type === 'electrical') return 'Electrico'
    if (type === 'lighting') return 'Iluminacion'
    if (type === 'common_area') return 'Area comun'
    if (type === 'security') return 'Seguridad'
    return 'Otro'
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Reporte Mantenimiento"
        description="Reporta incidencias de mantenimiento con evidencia fotografica."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Reportes de mantenimiento</p>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold leading-none text-zinc-100 transition hover:border-zinc-500"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          +
        </button>
      </div>
      {feedback ? <p className="text-xs text-zinc-300">{feedback}</p> : null}
      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {myReports.length === 0 ? (
          <AppCard className="text-sm text-zinc-300">Aun no has enviado reportes.</AppCard>
        ) : (
          myReports.map((report) => (
            <AppCard className="space-y-2 border-zinc-800 bg-zinc-950" key={report.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-100">{report.title}</p>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase text-zinc-300">
                  {reportTypeLabel(report.reportType)}
                </span>
              </div>
              <PetPhoto
                alt={`Evidencia ${report.title}`}
                className="h-36 w-full rounded-xl border border-zinc-700 object-cover"
                pathOrUrl={report.photoUrl}
              />
              <p className="text-xs text-zinc-300">{report.description}</p>
              <p className="text-xs text-zinc-400">{new Date(report.createdAt).toLocaleString()}</p>
            </AppCard>
          ))
        )}
      </div>
      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-100">Nuevo reporte mantenimiento</p>
              <AppButton className="px-2 py-1 text-xs" onClick={() => setIsCreateModalOpen(false)} variant="secondary">
                Cerrar
              </AppButton>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titulo (ej. Fuga en pasillo)"
                value={title}
              />
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) =>
                  setReportType(
                    event.target.value as
                      | 'plumbing'
                      | 'electrical'
                      | 'lighting'
                      | 'common_area'
                      | 'security'
                      | 'other'
                  )
                }
                value={reportType}
              >
                <option value="plumbing">Plomeria</option>
                <option value="electrical">Electrico</option>
                <option value="lighting">Iluminacion</option>
                <option value="common_area">Area comun</option>
                <option value="security">Seguridad</option>
                <option value="other">Otro</option>
              </select>
              <textarea
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descripcion"
                rows={3}
                value={description}
              />
              <label className="space-y-1">
                <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                  Foto
                </span>
                <input
                  accept="image/*"
                  capture="environment"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-100"
                  onChange={(event) => void handlePhotoUpload(event.target.files?.[0] ?? null)}
                  type="file"
                />
                {photoName ? <p className="text-xs text-zinc-400">Archivo: {photoName}</p> : null}
              </label>
              <AppButton block disabled={uploadingPhoto} onClick={handleSubmit}>
                {uploadingPhoto ? 'Subiendo foto...' : 'Enviar reporte'}
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppAnnouncementsPage() {
  const navigate = useNavigate()
  const { incidents } = useDemoData()
  const escalated = incidents.filter((incident) => incident.supportScore >= 3)

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Comunicados"
        description="Alertas vecinales por score de incidencias."
      />
      <AppCard>
        <p className="text-sm font-semibold">Notificaciones comunitarias</p>
        {escalated.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Sin incidentes con score alto por ahora.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {escalated.map((incident) => (
              <li key={incident.id}>
                <button
                  className="w-full rounded-lg border border-zinc-700 px-2 py-2 text-left text-sm text-[var(--color-text-muted)] transition hover:border-zinc-500"
                  onClick={() => navigate(`/app/incidents?incidentId=${encodeURIComponent(incident.id)}`)}
                  type="button"
                >
                  {incident.title}: score {incident.supportScore}. Tap para ver detalle.
                </button>
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  )
}

function getPollOptionVotesCount(poll: Poll, optionId: string) {
  return poll.votes.filter((vote) => vote.optionId === optionId).length
}

function getPollStatusLabel(poll: Poll) {
  if (poll.endedAt) {
    return 'Finalizada'
  }
  if (poll.endsAt && new Date(poll.endsAt) < new Date()) {
    return 'Expirada'
  }
  return 'Activa'
}

export function AppPollsPage() {
  const { createPoll, deletePoll, endPoll, polls, session, votePoll } = useDemoData()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'yes_no' | 'multiple'>('yes_no')
  const [optionsText, setOptionsText] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [feedback, setFeedback] = useState('')

  function handleCreatePoll() {
    const options =
      mode === 'yes_no'
        ? ['Si', 'No']
        : optionsText
            .split('\n')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
    const result = createPoll({ title, options, durationDays })
    setFeedback(result.ok ? 'Votacion publicada.' : result.error ?? 'No fue posible crear votacion.')
    if (result.ok) {
      setTitle('')
      setOptionsText('')
      setMode('yes_no')
      setDurationDays(1)
    }
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino / Admin"
        title="Votaciones"
        description="Crea encuestas publicas y participa con un voto por usuario."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Nueva votacion</p>
        <input
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titulo de la votacion"
          value={title}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AppButton
            block
            onClick={() => setMode('yes_no')}
            variant={mode === 'yes_no' ? 'primary' : 'secondary'}
          >
            Si / No
          </AppButton>
          <AppButton
            block
            onClick={() => setMode('multiple')}
            variant={mode === 'multiple' ? 'primary' : 'secondary'}
          >
            Opcion multiple
          </AppButton>
        </div>
        {mode === 'multiple' ? (
          <textarea
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setOptionsText(event.target.value)}
            placeholder={'Escribe una opcion por linea\nEj:\nPorton\nLimpieza\nIluminacion'}
            rows={4}
            value={optionsText}
          />
        ) : null}
        <label className="flex flex-col gap-2">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Duracion
          </span>
          <select
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setDurationDays(Number(event.target.value))}
            value={durationDays}
          >
            <option value={1}>1 dia</option>
            <option value={2}>2 dias</option>
            <option value={3}>3 dias</option>
            <option value={4}>4 dias</option>
            <option value={5}>5 dias</option>
            <option value={6}>6 dias</option>
            <option value={7}>7 dias</option>
          </select>
        </label>
        <div className="pt-1">
          <AppButton block onClick={handleCreatePoll}>
            Publicar votacion
          </AppButton>
        </div>
        {feedback ? <p className="text-xs text-zinc-300">{feedback}</p> : null}
      </AppCard>
      <div className="space-y-2">
        {polls.length === 0 ? (
          <AppCard className="text-sm text-zinc-300">No hay votaciones por ahora.</AppCard>
        ) : (
          polls.map((poll) => {
            const myVote = poll.votes.find((vote) => vote.userId === session?.userId)
            const isClosed = poll.endedAt ? true : poll.endsAt ? new Date(poll.endsAt) < new Date() : false
            const canManage = session?.role === 'admin' || session?.userId === poll.createdByUserId
            return (
              <AppCard className="space-y-2 border-zinc-800 bg-zinc-950" key={poll.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{poll.title}</p>
                    <p className="text-xs text-zinc-400">
                      Creada por: {poll.createdByName} - {new Date(poll.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Estado: {getPollStatusLabel(poll)}
                      {poll.endsAt ? ` - Cierra: ${new Date(poll.endsAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
                      {!isClosed ? (
                        <AppButton
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            const result = endPoll(poll.id)
                            setFeedback(
                              result.ok
                                ? 'Votacion finalizada.'
                                : result.error ?? 'No se pudo finalizar votacion.'
                            )
                          }}
                          variant="secondary"
                        >
                          Terminar
                        </AppButton>
                      ) : null}
                      <AppButton
                        className="px-2 py-1 text-xs"
                        onClick={() => {
                          const result = deletePoll(poll.id)
                          setFeedback(
                            result.ok
                              ? 'Votacion eliminada.'
                              : result.error ?? 'No se pudo eliminar votacion.'
                          )
                        }}
                        variant="danger"
                      >
                        Borrar
                      </AppButton>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const count = getPollOptionVotesCount(poll, option.id)
                    const selected = myVote?.optionId === option.id
                    return (
                      <button
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                        }`}
                        disabled={isClosed}
                        key={option.id}
                        onClick={() => {
                          const result = votePoll(poll.id, option.id)
                          setFeedback(
                            result.ok ? 'Voto registrado.' : result.error ?? 'No se pudo votar.'
                          )
                        }}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{option.label}</span>
                          <span className="text-xs font-semibold text-zinc-400">{count} voto(s)</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </AppCard>
            )
          })
        )}
      </div>
    </div>
  )
}

export function AppPetsPage() {
  const {
    createPetPost,
    updatePetPost,
    createPetPostComment,
    createModerationReport,
    petPosts,
    petPostComments,
    session,
  } = useDemoData()
  const [petName, setPetName] = useState('')
  const [comments, setComments] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [petProfile, setPetProfile] = useState<PetProfile>(normalizePetProfile)
  const [petFormStep, setPetFormStep] = useState<1 | 2 | 3>(1)
  const [isPetFormOpen, setIsPetFormOpen] = useState(false)
  const [selectedPetPostId, setSelectedPetPostId] = useState<string | null>(null)
  const [editingPetPostId, setEditingPetPostId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [feedback, setFeedback] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [reportingPetPostId, setReportingPetPostId] = useState<string | null>(null)

  const selectedPetPost = petPosts.find((post) => post.id === selectedPetPostId) ?? null
  const editingPetPost = petPosts.find((post) => post.id === editingPetPostId) ?? null
  const selectedPetComments = petPostComments.filter((comment) => comment.petPostId === selectedPetPostId)

  async function handleFileChange(file: File | null) {
    if (!file) {
      return
    }
    setUploadingPhoto(true)
    setFeedback('')
    try {
      if (isSupabaseConfigured && navigator.onLine) {
        const objectPath = await uploadPetPhoto(file)
        setPhotoUrl(objectPath)
        setFeedback('Foto cargada correctamente.')
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('No fue posible leer la foto.'))
          reader.readAsDataURL(file)
        })
        setPhotoUrl(dataUrl)
        setFeedback('Foto guardada localmente (modo sin red).')
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo cargar la foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function resetPetForm() {
    setPetName('')
    setComments('')
    setPhotoUrl('')
    setPetProfile(normalizePetProfile())
    setPetFormStep(1)
    setIsPetFormOpen(false)
    setSelectedPetPostId(null)
    setEditingPetPostId(null)
    setNewCommentText('')
  }

  function canManage(postUserId: string) {
    return session?.userId === postUserId || session?.role === 'admin'
  }

  function beginEditPetPost(postId: string) {
    const post = petPosts.find((entry) => entry.id === postId)
    if (!post) {
      return
    }
    setIsPetFormOpen(true)
    setEditingPetPostId(post.id)
    setPetName(post.petName)
    setComments(post.comments)
    setPhotoUrl(post.photoUrl)
    setPetProfile(normalizePetProfile(post.profile))
    setPetFormStep(1)
    setFeedback('')
  }

  function openCreatePetPost() {
    setEditingPetPostId(null)
    setPetName('')
    setComments('')
    setPhotoUrl('')
    setPetProfile(normalizePetProfile())
    setPetFormStep(1)
    setFeedback('')
    setIsPetFormOpen(true)
  }

  function handleSubmitPetPost() {
    if (editingPetPost) {
      const result = updatePetPost({
        postId: editingPetPost.id,
        petName,
        photoUrl,
        comments,
        profile: normalizePetProfile(petProfile),
      })
      setFeedback(
        result.ok ? 'Publicacion de mascota actualizada.' : result.error ?? 'No se pudo actualizar.'
      )
      if (result.ok) {
        resetPetForm()
      }
      return
    }

    const result = createPetPost({
      petName,
      photoUrl,
      comments,
      profile: normalizePetProfile(petProfile),
    })
    setFeedback(
      result.ok ? 'Mascota publicada correctamente.' : result.error ?? 'No se pudo publicar.'
    )
    if (result.ok) {
      resetPetForm()
    }
  }

  function handleCreatePetComment() {
    if (!selectedPetPostId) {
      return
    }
    const result = createPetPostComment({ petPostId: selectedPetPostId, message: newCommentText })
    setFeedback(
      result.ok ? 'Comentario publicado.' : result.error ?? 'No se pudo publicar comentario.'
    )
    if (result.ok) {
      setNewCommentText('')
    }
  }

  async function handleReportPetPost(petPostId: string) {
    setReportingPetPostId(petPostId)
    const result = await createModerationReport({
      targetType: 'pet_post',
      targetId: petPostId,
      reason: 'Contenido inapropiado en mascotas',
    })
    setFeedback(result.ok ? 'Publicacion reportada para moderacion.' : result.error ?? 'No se pudo reportar.')
    setReportingPetPostId(null)
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Mascotas"
        description="Comparte a tu mascota con foto y experiencia para la comunidad."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Mascotas de la comunidad</p>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold leading-none text-zinc-100 transition hover:border-zinc-500"
          onClick={openCreatePetPost}
          type="button"
        >
          +
        </button>
      </div>
      {feedback ? <p className="text-xs text-zinc-300">{feedback}</p> : null}
      <div className="space-y-2">
        {petPosts.length === 0 ? (
          <AppCard className="text-sm text-zinc-300">Aun no hay mascotas publicadas.</AppCard>
        ) : (
          petPosts.map((petPost) => (
            <AppCard
              className="space-y-2 border-zinc-800 bg-zinc-950 transition hover:border-zinc-600"
              key={petPost.id}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-100">{petPost.petName}</p>
                <p className="text-xs text-zinc-400">
                  Publicado por: {petPost.createdByName} -{' '}
                  {new Date(petPost.createdAt).toLocaleString()}
                </p>
              </div>
              <PetPhoto
                alt={`Mascota ${petPost.petName}`}
                className="h-36 w-full rounded-xl border border-zinc-700 object-cover"
                pathOrUrl={petPost.photoUrl}
              />
              <p className="text-sm text-zinc-300">{petPost.comments}</p>
              {petPost.profile?.personalityHighlights?.length ? (
                <div className="flex flex-wrap gap-1">
                  {petPost.profile.personalityHighlights.map((highlight) => (
                    <span
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-300"
                      key={highlight}
                    >
                      {highlight.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="text-xs font-semibold text-zinc-400">
                Comentarios: {petPostComments.filter((comment) => comment.petPostId === petPost.id).length}
              </p>
              <div
                className={`grid gap-2 ${canManage(petPost.createdByUserId) ? 'grid-cols-3' : 'grid-cols-2'}`}
              >
                <AppButton
                  block
                  onClick={() => setSelectedPetPostId(petPost.id)}
                  variant="secondary"
                >
                  Ver detalle
                </AppButton>
                {canManage(petPost.createdByUserId) ? (
                  <AppButton block onClick={() => beginEditPetPost(petPost.id)} variant="secondary">
                    Editar
                  </AppButton>
                ) : null}
                <AppButton
                  block
                  className={reportActionClass}
                  disabled={reportingPetPostId === petPost.id}
                  onClick={() => void handleReportPetPost(petPost.id)}
                  variant="secondary"
                >
                  {reportingPetPostId === petPost.id ? 'Enviando...' : 'Reportar'}
                </AppButton>
              </div>
            </AppCard>
          ))
        )}
      </div>
      {isPetFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-100">
                {editingPetPost ? 'Editar mascota' : 'Nueva mascota'}
              </p>
              <AppButton className="px-2 py-1 text-xs" onClick={resetPetForm} variant="secondary">
                Cerrar
              </AppButton>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['Basic', 'Social', 'Advanced'] as const).map((label, index) => {
                  const step = (index + 1) as 1 | 2 | 3
                  const isActive = petFormStep === step
                  return (
                    <button
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                      key={label}
                      onClick={() => setPetFormStep(step)}
                      type="button"
                    >
                      {index + 1}. {label}
                    </button>
                  )
                })}
              </div>
              {petFormStep === 1 ? (
                <>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setPetName(event.target.value)}
                placeholder="Nombre de la mascota"
                value={petName}
              />
              <label className="space-y-1">
                <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Foto</span>
                <input
                  accept="image/*"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-100"
                  onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setComments(event.target.value)}
                placeholder="Comentarios / experiencia"
                rows={3}
                value={comments}
              />
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Basic profile
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        species: event.target.value as PetProfile['species'],
                      }))
                    }
                    value={petProfile.species}
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        size: event.target.value as PetProfile['size'],
                      }))
                    }
                    value={petProfile.size}
                  >
                    <option value="xs">XS</option>
                    <option value="s">S</option>
                    <option value="m">M</option>
                    <option value="l">L</option>
                    <option value="xl">XL</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, breed: event.target.value }))
                    }
                    placeholder="Breed"
                    value={petProfile.breed ?? ''}
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, age: event.target.value }))
                    }
                    placeholder="Age"
                    value={petProfile.age ?? ''}
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, weight: event.target.value }))
                    }
                    placeholder="Weight"
                    value={petProfile.weight ?? ''}
                  />
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        gender: event.target.value as PetProfile['gender'],
                      }))
                    }
                    value={petProfile.gender ?? 'other'}
                  >
                    <option value="female">Gender: Female</option>
                    <option value="male">Gender: Male</option>
                    <option value="other">Gender: Other</option>
                  </select>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, locationCity: event.target.value }))
                    }
                    placeholder="City (optional)"
                    value={petProfile.locationCity ?? ''}
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, birthday: event.target.value }))
                    }
                    placeholder="Birthday (optional)"
                    type="date"
                    value={petProfile.birthday ?? ''}
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, availabilityNote: event.target.value }))
                    }
                    placeholder="Availability note (optional)"
                    value={petProfile.availabilityNote ?? ''}
                  />
                </div>
              </div>
                </>
              ) : null}
              {petFormStep === 2 ? (
                <>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Social behavior
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        socialWithHumans: event.target.value as PetProfile['socialWithHumans'],
                      }))
                    }
                    value={petProfile.socialWithHumans}
                  >
                    <option value="yes">Humans: Yes</option>
                    <option value="no">Humans: No</option>
                    <option value="depends">Humans: Depends</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        socialWithChildren: event.target.value as PetProfile['socialWithChildren'],
                      }))
                    }
                    value={petProfile.socialWithChildren}
                  >
                    <option value="yes">Children: Yes</option>
                    <option value="no">Children: No</option>
                    <option value="depends">Children: Depends</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        socialWithDogs: event.target.value as PetProfile['socialWithDogs'],
                      }))
                    }
                    value={petProfile.socialWithDogs}
                  >
                    <option value="yes">Dogs: Yes</option>
                    <option value="no">Dogs: No</option>
                    <option value="depends">Dogs: Depends</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        socialWithCats: event.target.value as PetProfile['socialWithCats'],
                      }))
                    }
                    value={petProfile.socialWithCats}
                  >
                    <option value="yes">Cats: Yes</option>
                    <option value="no">Cats: No</option>
                    <option value="depends">Cats: Depends</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        socialWithOtherAnimals: event.target.value as PetProfile['socialWithOtherAnimals'],
                      }))
                    }
                    value={petProfile.socialWithOtherAnimals}
                  >
                    <option value="yes">Other animals: Yes</option>
                    <option value="no">Other animals: No</option>
                    <option value="depends">Other animals: Depends</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Temperament & health
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        energyLevel: event.target.value as PetProfile['energyLevel'],
                      }))
                    }
                    value={petProfile.energyLevel}
                  >
                    <option value="chill">🐢 Chill</option>
                    <option value="balanced">🚶 Balanced</option>
                    <option value="zoomies">🚀 Zoomies</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        friendliness: event.target.value as PetProfile['friendliness'],
                      }))
                    }
                    value={petProfile.friendliness}
                  >
                    <option value="shy">Friendliness: Shy</option>
                    <option value="neutral">Friendliness: Neutral</option>
                    <option value="friendly">Friendliness: Friendly</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        independence: event.target.value as PetProfile['independence'],
                      }))
                    }
                    value={petProfile.independence}
                  >
                    <option value="independent">Independence: Independent</option>
                    <option value="balanced">Independence: Balanced</option>
                    <option value="clingy">Independence: Clingy</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        affectionLevel: event.target.value as PetProfile['affectionLevel'],
                      }))
                    }
                    value={petProfile.affectionLevel}
                  >
                    <option value="low">Affection: Low</option>
                    <option value="medium">Affection: Medium</option>
                    <option value="high">Affection: High</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        vaccinated: event.target.value as PetProfile['vaccinated'],
                      }))
                    }
                    value={petProfile.vaccinated}
                  >
                    <option value="up_to_date">Vaccinated: Up to date</option>
                    <option value="partial">Vaccinated: Partial</option>
                    <option value="no">Vaccinated: No</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        likesPlaydates: event.target.value as PetProfile['likesPlaydates'],
                      }))
                    }
                    value={petProfile.likesPlaydates}
                  >
                    <option value="yes">Likes playdates: Yes</option>
                    <option value="no">Likes playdates: No</option>
                    <option value="selective">Likes playdates: Selective</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        groomingNeeds: event.target.value as PetProfile['groomingNeeds'],
                      }))
                    }
                    value={petProfile.groomingNeeds}
                  >
                    <option value="low">Grooming: Low</option>
                    <option value="medium">Grooming: Medium</option>
                    <option value="high">Grooming: High</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        houseTrained: event.target.value as PetProfile['houseTrained'],
                      }))
                    }
                    value={petProfile.houseTrained}
                  >
                    <option value="yes">House trained: Yes</option>
                    <option value="no">House trained: No</option>
                    <option value="in_progress">House trained: In progress</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        crateTrained: event.target.value as PetProfile['crateTrained'],
                      }))
                    }
                    value={petProfile.crateTrained}
                  >
                    <option value="yes">Crate trained: Yes</option>
                    <option value="no">Crate trained: No</option>
                    <option value="unknown">Crate trained: Unknown</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        leashTrained: event.target.value as PetProfile['leashTrained'],
                      }))
                    }
                    value={petProfile.leashTrained}
                  >
                    <option value="yes">Leash trained: Yes</option>
                    <option value="no">Leash trained: No</option>
                    <option value="in_progress">Leash trained: In progress</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({
                        ...previous,
                        recallTrained: event.target.value as PetProfile['recallTrained'],
                      }))
                    }
                    value={petProfile.recallTrained}
                  >
                    <option value="reliable">Recall: Reliable</option>
                    <option value="partial">Recall: Partial</option>
                    <option value="no">Recall: No</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, neuteredOrSpayed: event.target.value === 'yes' }))
                    }
                    value={petProfile.neuteredOrSpayed ? 'yes' : 'no'}
                  >
                    <option value="yes">Neutered/Spayed: Yes</option>
                    <option value="no">Neutered/Spayed: No</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, specialNeeds: event.target.value === 'yes' }))
                    }
                    value={petProfile.specialNeeds ? 'yes' : 'no'}
                  >
                    <option value="no">Special needs: No</option>
                    <option value="yes">Special needs: Yes</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, allergies: event.target.value }))
                    }
                    placeholder="Allergies (optional)"
                    value={petProfile.allergies ?? ''}
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
                    onChange={(event) =>
                      setPetProfile((previous) => ({ ...previous, medications: event.target.value }))
                    }
                    placeholder="Medications (optional)"
                    value={petProfile.medications ?? ''}
                  />
                </div>
              </div>
                </>
              ) : null}
              {petFormStep === 3 ? (
                <>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Behavior traits
                </p>
                <div className="flex flex-wrap gap-2">
                  {petBehaviorTraitOptions.map((option) => {
                    const selected = petProfile.behaviorTraits.includes(option.value)
                    return (
                      <button
                        className={`rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                        }`}
                        key={option.value}
                        onClick={() =>
                          setPetProfile((previous) => ({
                            ...previous,
                            behaviorTraits: toggleInArray(previous.behaviorTraits, option.value),
                          }))
                        }
                        type="button"
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Commands known
                </p>
                <div className="flex flex-wrap gap-2">
                  {petKnownCommandOptions.map((option) => {
                    const selected = petProfile.commandsKnown.includes(option.value)
                    return (
                      <button
                        className={`rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                        }`}
                        key={option.value}
                        onClick={() =>
                          setPetProfile((previous) => ({
                            ...previous,
                            commandsKnown: toggleInArray(previous.commandsKnown, option.value),
                          }))
                        }
                        type="button"
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Highlights (pick up to 5)
                </p>
                <div className="flex flex-wrap gap-2">
                  {petPersonalityHighlightOptions.map((option) => {
                    const selected = petProfile.personalityHighlights.includes(option.value)
                    const canAdd = selected || petProfile.personalityHighlights.length < 5
                    return (
                      <button
                        className={`rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                        } ${canAdd ? '' : 'opacity-50'}`}
                        disabled={!canAdd}
                        key={option.value}
                        onClick={() =>
                          setPetProfile((previous) => ({
                            ...previous,
                            personalityHighlights: toggleInArray(previous.personalityHighlights, option.value),
                          }))
                        }
                        type="button"
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Preferences & availability
                </p>
                <div className="flex flex-wrap gap-2">
                  {petPrefersOptions.map((option) => {
                    const selected = petProfile.prefers.includes(option.value)
                    return (
                      <button
                        className={`rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                        }`}
                        key={option.value}
                        onClick={() =>
                          setPetProfile((previous) => ({
                            ...previous,
                            prefers: toggleInArray(previous.prefers, option.value),
                          }))
                        }
                        type="button"
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {petAvailableForOptions.map((option) => {
                    const selected = petProfile.availableFor.includes(option.value)
                    return (
                      <button
                        className={`rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                        }`}
                        key={option.value}
                        onClick={() =>
                          setPetProfile((previous) => ({
                            ...previous,
                            availableFor: toggleInArray(previous.availableFor, option.value),
                          }))
                        }
                        type="button"
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
                </>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {petFormStep > 1 ? (
                  <AppButton block onClick={() => setPetFormStep((previous) => (previous > 1 ? ((previous - 1) as 1 | 2 | 3) : previous))} variant="secondary">
                    Atras
                  </AppButton>
                ) : (
                  <div />
                )}
                {petFormStep < 3 ? (
                  <AppButton block onClick={() => setPetFormStep((previous) => (previous < 3 ? ((previous + 1) as 1 | 2 | 3) : previous))}>
                    Siguiente
                  </AppButton>
                ) : (
                  <AppButton block disabled={uploadingPhoto} onClick={handleSubmitPetPost}>
                    {uploadingPhoto
                      ? 'Subiendo foto...'
                      : editingPetPost
                        ? 'Guardar cambios'
                        : 'Publicar mascota'}
                  </AppButton>
                )}
              </div>
              {editingPetPost ? (
                <AppButton block onClick={resetPetForm} variant="secondary">
                  Cancelar edicion
                </AppButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {selectedPetPost ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-zinc-100">{selectedPetPost.petName}</p>
                <p className="text-xs text-zinc-400">
                  Publicado por: {selectedPetPost.createdByName}
                </p>
              </div>
              <AppButton
                className="px-2 py-1 text-xs"
                onClick={() => {
                  setSelectedPetPostId(null)
                  setNewCommentText('')
                }}
                variant="secondary"
              >
                Cerrar
              </AppButton>
            </div>
            <PetPhoto
              alt={`Mascota ${selectedPetPost.petName}`}
              className="mb-2 h-40 w-full rounded-xl border border-zinc-700 object-cover"
              pathOrUrl={selectedPetPost.photoUrl}
            />
            <p className="mb-3 text-sm text-zinc-300">{selectedPetPost.comments}</p>
            {selectedPetPost.profile?.behaviorTraits?.length ? (
              <div className="mb-3 flex flex-wrap gap-1">
                {selectedPetPost.profile.behaviorTraits.map((trait) => (
                  <span
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-300"
                    key={trait}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mb-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">
                Comentarios
              </p>
              {selectedPetComments.length === 0 ? (
                <p className="text-xs text-zinc-500">Sin comentarios todavia.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {selectedPetComments.map((comment) => (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2" key={comment.id}>
                      <p className="text-xs font-semibold text-zinc-300">{comment.createdByName}</p>
                      <p className="text-sm text-zinc-200">{comment.message}</p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <textarea
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setNewCommentText(event.target.value)}
                placeholder="Escribe un comentario..."
                rows={2}
                value={newCommentText}
              />
              <AppButton block onClick={handleCreatePetComment}>
                Comentar
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppAddTenantPage() {
  const { session } = useDemoData()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('success')

  async function handleInviteTenant() {
    if (!session) {
      setFeedbackType('error')
      setFeedback('Sesion requerida.')
      return
    }
    if (session.role !== 'resident') {
      setFeedbackType('error')
      setFeedback('Solo residentes pueden invitar inquilinos desde esta pantalla.')
      return
    }
    if (!session.unitNumber?.trim()) {
      setFeedbackType('error')
      setFeedback('Tu cuenta no tiene unidad asignada.')
      return
    }
    if (!email.trim()) {
      setFeedbackType('error')
      setFeedback('Correo requerido.')
      return
    }

    setLoading(true)
    const result = await adminCreateOrInviteUser({
      mode: 'invite',
      email,
      role: 'tenant',
      unitNumber: session.unitNumber.trim(),
    })
    setLoading(false)

    if (!result.ok) {
      setFeedbackType('error')
      setFeedback(result.error ?? 'No se pudo enviar invitacion.')
      return
    }

    setFeedbackType('success')
    setFeedback(`Invitacion enviada a ${result.email ?? email}.`)
    setEmail('')
  }

  if (!session || session.role !== 'resident') {
    return (
      <AppCard className="text-sm text-zinc-300">
        Solo residentes pueden invitar inquilinos desde esta pantalla.
      </AppCard>
    )
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente"
        title="Agregar Inquilino"
        description="Invita un inquilino para tu misma unidad."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-xs text-zinc-400">Unidad asignada: {session.unitNumber ?? '-'}</p>
        <input
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Correo del inquilino"
          type="email"
          value={email}
        />
        <AppButton block disabled={loading} onClick={() => void handleInviteTenant()}>
          {loading ? 'Enviando invitacion...' : 'Invitar inquilino'}
        </AppButton>
        {feedback ? (
          <p className={feedbackType === 'error' ? 'text-xs text-red-400' : 'text-xs text-zinc-300'}>
            {feedback}
          </p>
        ) : null}
      </AppCard>
    </div>
  )
}

export function AppMarketplacePage() {
  const {
    marketplacePosts,
    createMarketplacePost,
    updateMarketplacePost,
    deleteMarketplacePost,
    createModerationReport,
    session,
  } = useDemoData()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'new' | 'used'>('used')
  const [contactMessage, setContactMessage] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isPostFormOpen, setIsPostFormOpen] = useState(false)
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCondition, setFilterCondition] = useState<'all' | 'new' | 'used'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'sold'>('all')
  const [minFilterPrice, setMinFilterPrice] = useState('')
  const [maxFilterPrice, setMaxFilterPrice] = useState('')

  const selectedPost = marketplacePosts.find((post) => post.id === selectedPostId) ?? null
  const editingPost = marketplacePosts.find((post) => post.id === editingPostId) ?? null
  const filteredMarketplacePosts = useMemo(
    () =>
      filterMarketplacePosts(marketplacePosts, {
        query: searchQuery,
        condition: filterCondition,
        status: filterStatus,
        minPrice: minFilterPrice,
        maxPrice: maxFilterPrice,
      }),
    [marketplacePosts, searchQuery, filterCondition, filterStatus, minFilterPrice, maxFilterPrice]
  )

  async function handlePhotoUpload(file: File | null) {
    if (!file) {
      return
    }
    if (file.size > MAX_MARKETPLACE_UPLOAD_BYTES) {
      setFeedback('La foto excede 15 MB. Selecciona una imagen mas ligera.')
      return
    }
    setUploadingPhoto(true)
    setPhotoUploadProgress(5)
    setFeedback('')
    try {
      setPhotoUploadProgress(20)
      const imageBlob = await compressImageForUpload(file)
      setPhotoUploadProgress(55)
      if (isSupabaseConfigured && navigator.onLine) {
        const objectPath = await uploadMarketplacePhoto(imageBlob)
        setPhotoUrl(objectPath)
        setPhotoUploadProgress(100)
        setFeedback('Foto cargada correctamente.')
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('No fue posible leer la foto.'))
          reader.readAsDataURL(imageBlob)
        })
        setPhotoUrl(dataUrl)
        setPhotoUploadProgress(100)
        setFeedback('Foto guardada localmente (modo sin red).')
      }
    } catch (error) {
      setPhotoUploadProgress(0)
      setFeedback(error instanceof Error ? error.message : 'No se pudo cargar la foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setPrice('')
    setCondition('used')
    setContactMessage('')
    setWhatsappNumber('')
    setPhotoUrl('')
    setPhotoUploadProgress(0)
    setIsPostFormOpen(false)
    setEditingPostId(null)
  }

  function beginEdit(postId: string) {
    const post = marketplacePosts.find((entry) => entry.id === postId)
    if (!post) {
      return
    }
    setEditingPostId(post.id)
    setTitle(post.title)
    setDescription(post.description)
    setPrice(String(post.price))
    setCondition(post.condition)
    setContactMessage(post.contactMessage ?? '')
    setWhatsappNumber(post.whatsappNumber ?? '')
    setPhotoUrl(post.photoUrl)
    setPhotoUploadProgress(0)
    setIsPostFormOpen(true)
    setFeedback('')
  }

  function openCreatePost() {
    setEditingPostId(null)
    setTitle('')
    setDescription('')
    setPrice('')
    setCondition('used')
    setContactMessage('')
    setWhatsappNumber('')
    setPhotoUrl('')
    setPhotoUploadProgress(0)
    setFeedback('')
    setIsPostFormOpen(true)
  }

  function handleSubmitPost() {
    const parsedPrice = Number(price)
    if (editingPost) {
      const result = updateMarketplacePost({
        postId: editingPost.id,
        title,
        description,
        price: parsedPrice,
        photoUrl,
        condition,
        status: editingPost.status,
        contactMessage,
        whatsappNumber,
      })
      setFeedback(result.ok ? 'Publicacion actualizada.' : result.error ?? 'No se pudo actualizar.')
      if (result.ok) {
        resetForm()
      }
      return
    }

    const result = createMarketplacePost({
      title,
      description,
      price: parsedPrice,
      photoUrl,
      condition,
      contactMessage,
      whatsappNumber,
    })
    setFeedback(result.ok ? 'Publicacion creada.' : result.error ?? 'No se pudo crear.')
    if (result.ok) {
      resetForm()
    }
  }

  function handleToggleSold(postId: string) {
    const target = marketplacePosts.find((entry) => entry.id === postId)
    if (!target) {
      return
    }
    const result = updateMarketplacePost({
      postId: target.id,
      title: target.title,
      description: target.description,
      price: target.price,
      photoUrl: target.photoUrl,
      condition: target.condition,
      status: target.status === 'active' ? 'sold' : 'active',
      contactMessage: target.contactMessage,
      whatsappNumber: target.whatsappNumber,
    })
    setFeedback(result.ok ? 'Estado actualizado.' : result.error ?? 'No se pudo actualizar estado.')
  }

  function handleDeletePost(postId: string) {
    const result = deleteMarketplacePost(postId)
    setFeedback(result.ok ? 'Publicacion eliminada.' : result.error ?? 'No se pudo eliminar.')
    if (result.ok && selectedPostId === postId) {
      setSelectedPostId(null)
    }
    if (result.ok && editingPostId === postId) {
      resetForm()
    }
  }

  function canManage(postUserId: string) {
    return session?.userId === postUserId || session?.role === 'admin'
  }

  function normalizeWhatsappNumber(value: string) {
    return value.replace(/[^\d]/g, '')
  }

  function buildWhatsappLink(value?: string) {
    const normalized = normalizeWhatsappNumber(value ?? '')
    if (!normalized) {
      return null
    }
    return `https://wa.me/${normalized}`
  }

  async function handleReportMarketplacePost(postId: string) {
    setReportingPostId(postId)
    const result = await createModerationReport({
      targetType: 'marketplace_post',
      targetId: postId,
      reason: 'Contenido inapropiado en marketplace',
    })
    setFeedback(result.ok ? 'Publicacion reportada para moderacion.' : result.error ?? 'No se pudo reportar.')
    setReportingPostId(null)
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Comunidad"
        title="Marketplace"
        description="Compra y venta entre vecinos de la privada."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Publicaciones de marketplace</p>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-semibold leading-none text-zinc-100 transition hover:border-zinc-500"
          onClick={openCreatePost}
          type="button"
        >
          +
        </button>
      </div>
      {feedback ? <p className="text-xs text-zinc-300">{feedback}</p> : null}
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <input
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por titulo, descripcion o vendedor"
          value={searchQuery}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setFilterCondition(event.target.value as 'all' | 'new' | 'used')}
            value={filterCondition}
          >
            <option value="all">Condicion: Todas</option>
            <option value="used">Condicion: Usado</option>
            <option value="new">Condicion: Nuevo</option>
          </select>
          <select
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setFilterStatus(event.target.value as 'all' | 'active' | 'sold')}
            value={filterStatus}
          >
            <option value="all">Estado: Todos</option>
            <option value="active">Estado: Disponible</option>
            <option value="sold">Estado: Vendido</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            min="0"
            onChange={(event) => setMinFilterPrice(event.target.value)}
            placeholder="Precio minimo"
            step="0.01"
            type="number"
            value={minFilterPrice}
          />
          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            min="0"
            onChange={(event) => setMaxFilterPrice(event.target.value)}
            placeholder="Precio maximo"
            step="0.01"
            type="number"
            value={maxFilterPrice}
          />
        </div>
      </AppCard>

      <div className="space-y-2">
        {filteredMarketplacePosts.length === 0 ? (
          <AppCard className="text-sm text-zinc-300">
            {marketplacePosts.length === 0
              ? 'Aun no hay publicaciones.'
              : 'No hay resultados con los filtros actuales.'}
          </AppCard>
        ) : (
          filteredMarketplacePosts.map((post) => (
            <AppCard className="space-y-2 border-zinc-800 bg-zinc-950" key={post.id}>
              <button className="w-full text-left" onClick={() => setSelectedPostId(post.id)} type="button">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{post.title}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                        post.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {post.status === 'active' ? 'Disponible' : 'Vendido'}
                    </span>
                  </div>
                  <MarketplacePhoto
                    alt={`Producto ${post.title}`}
                    className="h-36 w-full rounded-xl border border-zinc-700 object-cover"
                    pathOrUrl={post.photoUrl}
                  />
                  <p className="text-xs text-zinc-400">
                    Publicado por: {post.createdByName} | Condicion:{' '}
                    {post.condition === 'new' ? 'Nuevo' : 'Usado'}
                  </p>
                  <p className="text-lg font-bold text-white">${post.price.toFixed(2)}</p>
                </div>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <AppButton
                  block
                  className={reportActionClass}
                  disabled={reportingPostId === post.id}
                  onClick={() => void handleReportMarketplacePost(post.id)}
                  variant="secondary"
                >
                  {reportingPostId === post.id ? 'Enviando...' : 'Reportar'}
                </AppButton>
                {buildWhatsappLink(post.whatsappNumber) ? (
                  <a
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200"
                    href={buildWhatsappLink(post.whatsappNumber) ?? '#'}
                    rel="noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <AppButton block disabled variant="secondary">
                    Sin WhatsApp
                  </AppButton>
                )}
              </div>
              {canManage(post.createdByUserId) ? (
                <div className="grid grid-cols-3 gap-2">
                  <AppButton block onClick={() => beginEdit(post.id)} variant="secondary">
                    Editar
                  </AppButton>
                  <AppButton block onClick={() => handleToggleSold(post.id)} variant="secondary">
                    {post.status === 'active' ? 'Marcar vendido' : 'Reactivar'}
                  </AppButton>
                  <AppButton block onClick={() => handleDeletePost(post.id)} variant="danger">
                    Eliminar
                  </AppButton>
                </div>
              ) : null}
            </AppCard>
          ))
        )}
      </div>

      {isPostFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-100">
                {editingPost ? 'Editar publicacion' : 'Nueva publicacion'}
              </p>
              <AppButton className="px-2 py-1 text-xs" onClick={resetForm} variant="secondary">
                Cerrar
              </AppButton>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titulo del articulo"
                value={title}
              />
              <textarea
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descripcion"
                rows={3}
                value={description}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  min="0"
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Precio MXN"
                  step="0.01"
                  type="number"
                  value={price}
                />
                <select
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  onChange={(event) => setCondition(event.target.value as 'new' | 'used')}
                  value={condition}
                >
                  <option value="used">Usado</option>
                  <option value="new">Nuevo</option>
                </select>
              </div>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setContactMessage(event.target.value)}
                placeholder="Mensaje de contacto (ej. WhatsApp 55...)"
                value={contactMessage}
              />
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="WhatsApp (ej. 5215512345678)"
                value={whatsappNumber}
              />
              <label className="space-y-1">
                <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Foto</span>
                <input
                  accept="image/*"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-100"
                  onChange={(event) => void handlePhotoUpload(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              {photoUploadProgress > 0 ? (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${photoUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {uploadingPhoto
                      ? `Procesando imagen ${photoUploadProgress}%`
                      : photoUploadProgress === 100
                        ? 'Foto lista.'
                        : ''}
                  </p>
                </div>
              ) : null}
              <AppButton block disabled={uploadingPhoto} onClick={handleSubmitPost}>
                {uploadingPhoto
                  ? 'Subiendo foto...'
                  : editingPost
                    ? 'Guardar cambios'
                    : 'Publicar en marketplace'}
              </AppButton>
              {editingPost ? (
                <AppButton block onClick={resetForm} variant="secondary">
                  Cancelar edicion
                </AppButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {selectedPost ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-zinc-100">{selectedPost.title}</p>
                <p className="text-xs text-zinc-400">
                  {selectedPost.condition === 'new' ? 'Nuevo' : 'Usado'} |{' '}
                  {selectedPost.status === 'active' ? 'Disponible' : 'Vendido'}
                </p>
              </div>
              <AppButton className="px-2 py-1 text-xs" onClick={() => setSelectedPostId(null)} variant="secondary">
                Cerrar
              </AppButton>
            </div>
            <MarketplacePhoto
              alt={`Producto ${selectedPost.title}`}
              className="mb-2 h-44 w-full rounded-xl border border-zinc-700 object-cover"
              pathOrUrl={selectedPost.photoUrl}
            />
            <p className="mb-1 text-xl font-bold text-white">${selectedPost.price.toFixed(2)}</p>
            <p className="mb-2 text-sm text-zinc-300">{selectedPost.description}</p>
            <p className="text-xs text-zinc-400">Vendedor: {selectedPost.createdByName}</p>
            {selectedPost.contactMessage ? (
              <p className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-300">
                Contacto: {selectedPost.contactMessage}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <AppButton
                block
                className={reportActionClass}
                disabled={reportingPostId === selectedPost.id}
                onClick={() => void handleReportMarketplacePost(selectedPost.id)}
                variant="secondary"
              >
                {reportingPostId === selectedPost.id ? 'Enviando...' : 'Reportar'}
              </AppButton>
              {buildWhatsappLink(selectedPost.whatsappNumber) ? (
                <a
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200"
                  href={buildWhatsappLink(selectedPost.whatsappNumber) ?? '#'}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir WhatsApp
                </a>
              ) : (
                <AppButton block disabled variant="secondary">
                  Sin WhatsApp
                </AppButton>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppFinancePage() {
  return (
    <ModulePlaceholder
      role="Residente / Comite"
      title="Finanzas"
      description="Estado de cuenta, cuotas y transparencia financiera."
    />
  )
}

export function AppProfilePage() {
  const { session } = useDemoData()
  const { language, setLanguage, t, tx } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [pushMessage, setPushMessage] = useState('')
  const [busyAction, setBusyAction] = useState<'enable' | 'disable' | 'test' | null>(null)
  const [permission, setPermission] = useState(getNotificationPermissionState())
  const [displayName, setDisplayName] = useState(session?.fullName ?? '')
  const [profileMessage, setProfileMessage] = useState('')
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const pushSupported = isWebPushSupported()
  const pushConfigured = isWebPushConfigured()

  function refreshPermission() {
    setPermission(getNotificationPermissionState())
  }

  useEffect(() => {
    refreshPermission()
  }, [])

  useEffect(() => {
    setDisplayName(session?.fullName ?? '')
  }, [session?.fullName])

  async function handleEnablePush() {
    if (!session?.userId) {
      setPushMessage(tx('No hay sesion activa.', 'There is no active session.'))
      return
    }
    setBusyAction('enable')
    setPushMessage('')
    try {
      const result = await subscribeThisDeviceToPush(session.userId)
      if (!result.ok) {
        setPushMessage(result.error ?? tx('No fue posible activar notificaciones.', 'Could not enable notifications.'))
      } else {
        setPushMessage(tx('Notificaciones activadas para este dispositivo.', 'Notifications enabled for this device.'))
      }
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : tx('Error inesperado al activar push.', 'Unexpected error enabling push.'))
    } finally {
      refreshPermission()
      setBusyAction(null)
    }
  }

  async function handleDisablePush() {
    if (!session?.userId) {
      setPushMessage(tx('No hay sesion activa.', 'There is no active session.'))
      return
    }
    setBusyAction('disable')
    setPushMessage('')
    try {
      const result = await unsubscribeThisDeviceFromPush(session.userId)
      if (!result.ok) {
        setPushMessage(result.error ?? tx('No fue posible desactivar notificaciones.', 'Could not disable notifications.'))
      } else {
        setPushMessage(tx('Notificaciones desactivadas en este dispositivo.', 'Notifications disabled on this device.'))
      }
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : tx('Error inesperado al desactivar push.', 'Unexpected error disabling push.'))
    } finally {
      refreshPermission()
      setBusyAction(null)
    }
  }

  async function handleSendPushTest() {
    if (!session?.userId) {
      setPushMessage(tx('No hay sesion activa.', 'There is no active session.'))
      return
    }
    setBusyAction('test')
    setPushMessage('')
    try {
      const result = await sendPushTestToUser({ userId: session.userId })
      if (!result.ok) {
        setPushMessage(result.error ?? tx('No fue posible enviar notificacion de prueba.', 'Could not send test notification.'))
      } else {
        setPushMessage(tx('Notificacion de prueba enviada. Revisa este dispositivo.', 'Test notification sent. Check this device.'))
      }
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : tx('Error inesperado al enviar prueba.', 'Unexpected error sending test.'))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleUpdateDisplayName() {
    if (!supabase || !session) {
      setProfileMessage(tx('Sesion no disponible para actualizar nombre.', 'Session unavailable to update name.'))
      return
    }
    if (!displayName.trim()) {
      setProfileMessage(tx('El nombre visible no puede estar vacio.', 'Display name cannot be empty.'))
      return
    }
    setSavingDisplayName(true)
    setProfileMessage('')
    const result = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim(),
      },
    })
    setSavingDisplayName(false)
    if (result.error) {
      setProfileMessage(result.error.message)
      return
    }
    setProfileMessage(tx('Nombre actualizado.', 'Name updated.'))
  }

  async function handleUpdatePassword() {
    if (!supabase || !session) {
      setPasswordMessage(tx('Sesion no disponible para actualizar contrasena.', 'Session unavailable to update password.'))
      return
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordMessage(tx('Completa nueva contrasena y confirmacion.', 'Enter a new password and confirmation.'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage(tx('La contrasena debe tener al menos 8 caracteres.', 'Password must be at least 8 characters.'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(tx('La confirmacion no coincide.', 'Confirmation does not match.'))
      return
    }
    setSavingPassword(true)
    setPasswordMessage('')
    const result = await supabase.auth.updateUser({
      password: newPassword,
    })
    setSavingPassword(false)
    if (result.error) {
      setPasswordMessage(result.error.message)
      return
    }
    setPasswordMessage(tx('Contrasena actualizada.', 'Password updated.'))
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title={t('profileTitle')}
        description={t('profileDescription')}
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{t('name')}</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.fullName ?? '-'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{t('email')}</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.email ?? '-'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{t('department')}</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.unitNumber ?? '-'}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{t('language')}</p>
          <div className="grid grid-cols-2 gap-2">
            <AppButton block onClick={() => setLanguage('es')} variant={language === 'es' ? 'primary' : 'secondary'}>
              {t('spanish')}
            </AppButton>
            <AppButton block onClick={() => setLanguage('en')} variant={language === 'en' ? 'primary' : 'secondary'}>
              {t('english')}
            </AppButton>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{tx('Tema', 'Theme')}</p>
          <div className="grid grid-cols-2 gap-2">
            <AppButton block onClick={() => setTheme('dark')} variant={theme === 'dark' ? 'primary' : 'secondary'}>
              {tx('Oscuro', 'Dark')}
            </AppButton>
            <AppButton block onClick={() => setTheme('light')} variant={theme === 'light' ? 'primary' : 'secondary'}>
              {tx('Claro', 'Light')}
            </AppButton>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{tx('Nombre visible', 'Display name')}</p>
          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={tx('Tu nombre para mostrar', 'Your display name')}
            value={displayName}
          />
          <AppButton block disabled={savingDisplayName} onClick={() => void handleUpdateDisplayName()}>
            {savingDisplayName ? tx('Guardando...', 'Saving...') : tx('Actualizar nombre', 'Update name')}
          </AppButton>
          {profileMessage ? <p className="text-xs text-zinc-300">{profileMessage}</p> : null}
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{tx('Cambiar contrasena', 'Change password')}</p>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 pr-16 text-sm text-zinc-100"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={tx('Nueva contrasena', 'New password')}
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-200"
              onClick={() => setShowNewPassword((previous) => !previous)}
              type="button"
            >
              {showNewPassword ? tx('Ocultar', 'Hide') : tx('Ver', 'Show')}
            </button>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 pr-16 text-sm text-zinc-100"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={tx('Confirmar nueva contrasena', 'Confirm new password')}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-200"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              type="button"
            >
              {showConfirmPassword ? tx('Ocultar', 'Hide') : tx('Ver', 'Show')}
            </button>
          </div>
          <AppButton block disabled={savingPassword} onClick={() => void handleUpdatePassword()}>
            {savingPassword ? tx('Guardando...', 'Saving...') : tx('Actualizar contrasena', 'Update password')}
          </AppButton>
          {passwordMessage ? <p className="text-xs text-zinc-300">{passwordMessage}</p> : null}
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{tx('Notificaciones push', 'Push notifications')}</p>
          <p className="text-xs text-zinc-300">
            {tx('Soporte', 'Support')}: {pushSupported ? tx('Si', 'Yes') : tx('No', 'No')} | {tx('Configuracion', 'Configuration')}:{' '}
            {pushConfigured ? tx('Lista', 'Ready') : tx('Falta clave', 'Missing key')} | {tx('Permiso', 'Permission')}: {permission}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <AppButton
              block
              disabled={!pushSupported || !pushConfigured || busyAction !== null}
              onClick={() => void handleEnablePush()}
              variant="secondary"
            >
              {busyAction === 'enable' ? tx('Activando...', 'Enabling...') : tx('Activar en este dispositivo', 'Enable on this device')}
            </AppButton>
            <AppButton
              block
              disabled={!pushSupported || busyAction !== null}
              onClick={() => void handleDisablePush()}
              variant="secondary"
            >
              {busyAction === 'disable' ? tx('Desactivando...', 'Disabling...') : tx('Desactivar en este dispositivo', 'Disable on this device')}
            </AppButton>
            <AppButton
              block
              disabled={!pushSupported || !pushConfigured || busyAction !== null}
              onClick={() => void handleSendPushTest()}
            >
              {busyAction === 'test' ? tx('Enviando...', 'Sending...') : tx('Enviar prueba', 'Send test')}
            </AppButton>
          </div>
          {pushMessage ? <p className="text-xs text-zinc-300">{pushMessage}</p> : null}
        </div>
      </AppCard>
    </div>
  )
}
