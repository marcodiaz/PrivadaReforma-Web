import { useEffect } from 'react'
import { useDemoData } from '../state/DemoDataContext'
import { DevProfileTools } from '../auth/DevProfileTools'
import { useLanguage } from '../i18n/LanguageContext'

export function GlobalStatus() {
  const { tx } = useLanguage()
  const { isOnline, syncToast, dismissSyncToast } = useDemoData()

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
        <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-amber-950">
          {tx(
            'Modo offline activo: operaciones de guardia se encolan localmente.',
            'Offline mode active: guard operations are queued locally.',
          )}
        </div>
      ) : null}
      {syncToast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {syncToast}
        </div>
      ) : null}
      <DevProfileTools />
    </>
  )
}
