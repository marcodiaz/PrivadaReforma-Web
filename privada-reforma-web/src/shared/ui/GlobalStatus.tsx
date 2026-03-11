import { useEffect } from 'react'
import { useDemoData } from '../state/DemoDataContext'
import { DevProfileTools } from '../auth/DevProfileTools'
import { useLanguage } from '../i18n/LanguageContext'

export function GlobalStatus() {
  const { tx } = useLanguage()
  const { isOnline, syncToast, dismissSyncToast, offlineQueue } = useDemoData()
  const pendingOfflineEvents = offlineQueue.filter((event) => !event.synced).length

  useEffect(() => {
    if (!syncToast) {
      return
    }
    const timer = window.setTimeout(() => dismissSyncToast(), 2400)
    return () => window.clearTimeout(timer)
  }, [syncToast, dismissSyncToast])

  return (
    <>
      {!isOnline ? (
        <div className="fixed left-3 right-3 top-3 z-50 rounded-full border border-amber-300/30 bg-[linear-gradient(135deg,_rgba(251,191,36,0.92),_rgba(245,158,11,0.92))] px-3 py-2 text-center text-xs font-semibold text-amber-950 shadow-lg">
          {tx(
            'Modo offline activo: operaciones de guardia se encolan localmente.',
            'Offline mode active: guard operations are queued locally.',
          )}
        </div>
      ) : null}
      {isOnline && pendingOfflineEvents > 0 ? (
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-amber-950 shadow-lg">
          {tx(
            `${pendingOfflineEvents} eventos siguen pendientes de sincronizar.`,
            `${pendingOfflineEvents} events are still pending sync.`,
          )}
        </div>
      ) : null}
      {syncToast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-300/30 bg-[linear-gradient(135deg,_rgba(6,95,70,0.95),_rgba(16,185,129,0.95))] px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {syncToast}
        </div>
      ) : null}
      <DevProfileTools />
    </>
  )
}
