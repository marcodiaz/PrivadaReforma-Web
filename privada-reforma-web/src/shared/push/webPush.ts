import { removePushSubscriptionByEndpoint, upsertPushSubscription } from '../supabase/data'

const PUBLIC_VAPID_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() ?? ''
const SERVICE_WORKER_READY_TIMEOUT_MS = 8000

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index)
  }
  return output
}

function getSubscriptionKeys(subscription: PushSubscription) {
  const p256dh = subscription.getKey('p256dh')
  const auth = subscription.getKey('auth')
  if (!p256dh || !auth) {
    return null
  }
  return {
    p256dh: window.btoa(String.fromCharCode(...new Uint8Array(p256dh))),
    auth: window.btoa(String.fromCharCode(...new Uint8Array(auth))),
  }
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isWebPushConfigured() {
  return PUBLIC_VAPID_KEY.length > 0
}

export function getNotificationPermissionState() {
  if (!isWebPushSupported()) {
    return 'unsupported' as const
  }
  return Notification.permission
}

async function getServiceWorkerReadyWithTimeout() {
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('Timeout esperando Service Worker.')), SERVICE_WORKER_READY_TIMEOUT_MS)
  })
  return (await Promise.race([navigator.serviceWorker.ready, timeoutPromise])) as ServiceWorkerRegistration
}

export async function hasDevicePushSubscription() {
  if (!isWebPushSupported()) {
    return false
  }
  try {
    const registration = await getServiceWorkerReadyWithTimeout()
    const subscription = await registration.pushManager.getSubscription()
    return Boolean(subscription)
  } catch {
    return false
  }
}

export async function subscribeThisDeviceToPush(userId: string) {
  if (!isWebPushSupported()) {
    return { ok: false, error: 'Push no soportado en este navegador.' }
  }
  if (!isWebPushConfigured()) {
    return { ok: false, error: 'Falta VITE_WEB_PUSH_PUBLIC_KEY en frontend.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Permiso de notificaciones no concedido.' }
  }

  let registration: ServiceWorkerRegistration
  try {
    registration = await getServiceWorkerReadyWithTimeout()
  } catch {
    return { ok: false, error: 'Service Worker no disponible. Recarga la app e intenta de nuevo.' }
  }
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(PUBLIC_VAPID_KEY) as BufferSource,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al suscribir push.'
      return { ok: false, error: `No fue posible crear suscripcion push: ${message}` }
    }
  }

  const keys = getSubscriptionKeys(subscription)
  if (!keys) {
    return { ok: false, error: 'No fue posible leer llaves de suscripcion.' }
  }

  const saved = await upsertPushSubscription({
    userId,
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    expirationTime:
      subscription.expirationTime !== null ? new Date(subscription.expirationTime).toISOString() : null,
    userAgent: navigator.userAgent,
  })
  if (!saved) {
    return { ok: false, error: 'No fue posible guardar la suscripcion en Supabase.' }
  }

  return { ok: true }
}

export async function unsubscribeThisDeviceFromPush(userId: string) {
  if (!isWebPushSupported()) {
    return { ok: false, error: 'Push no soportado en este navegador.' }
  }
  let registration: ServiceWorkerRegistration
  try {
    registration = await getServiceWorkerReadyWithTimeout()
  } catch {
    return { ok: false, error: 'Service Worker no disponible. Recarga la app e intenta de nuevo.' }
  }
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    return { ok: true }
  }

  const endpoint = subscription.endpoint
  const unsubscribed = await subscription.unsubscribe()
  if (!unsubscribed) {
    return { ok: false, error: 'No fue posible desuscribir este dispositivo.' }
  }

  const deleted = await removePushSubscriptionByEndpoint({ endpoint, userId })
  if (!deleted) {
    return { ok: false, error: 'Dispositivo desuscrito localmente, pero no se elimino en Supabase.' }
  }

  return { ok: true }
}
