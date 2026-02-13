export const schemaVersion = 2

const VERSION_KEY = 'schemaVersion'

export const storageKeys = {
  session: 'session',
  incidents: 'incidents',
  qrPasses: 'qrPasses',
  auditLog: 'auditLog',
  offlineQueue: 'offlineQueue',
} as const

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getItem<T>(key: string): T | null {
  if (!hasStorage()) {
    return null
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setItem<T>(key: string, value: T) {
  if (!hasStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key: string) {
  if (!hasStorage()) {
    return
  }

  window.localStorage.removeItem(key)
}

export function migrateIfNeeded() {
  const storedVersion = getItem<number>(VERSION_KEY)

  if (storedVersion === schemaVersion) {
    return
  }

  if (storedVersion !== null && storedVersion !== schemaVersion) {
    Object.values(storageKeys).forEach((key) => removeItem(key))
  }

  setItem(VERSION_KEY, schemaVersion)
}
