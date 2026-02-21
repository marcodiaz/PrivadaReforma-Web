import { useEffect, useMemo, useState } from 'react'
import { getSignedMaintenancePhotoUrl, isStorageObjectPath } from '../supabase/data'

const FALLBACK_MESSAGE = 'Foto no disponible offline.'

type MaintenancePhotoProps = {
  pathOrUrl: string
  alt: string
  className?: string
}

export function MaintenancePhoto({ pathOrUrl, alt, className = '' }: MaintenancePhotoProps) {
  const [signedSrcByPath, setSignedSrcByPath] = useState<Record<string, string>>({})
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)

  const directSrc = useMemo(
    () => (isStorageObjectPath(pathOrUrl) ? null : pathOrUrl || null),
    [pathOrUrl]
  )

  useEffect(() => {
    if (!pathOrUrl || directSrc || !navigator.onLine) {
      return () => {}
    }

    let canceled = false
    void (async () => {
      try {
        const nextSignedUrl = await getSignedMaintenancePhotoUrl(pathOrUrl)
        if (canceled) {
          return
        }
        setSignedSrcByPath((previous) => {
          if (previous[pathOrUrl] === nextSignedUrl) {
            return previous
          }
          return { ...previous, [pathOrUrl]: nextSignedUrl }
        })
      } catch {
        if (!canceled) {
          setSignedSrcByPath((previous) => ({ ...previous, [pathOrUrl]: '' }))
        }
      }
    })()

    return () => {
      canceled = true
    }
  }, [pathOrUrl, directSrc])

  const src = directSrc ?? signedSrcByPath[pathOrUrl] ?? null
  if (!src || erroredSrc === src) {
    return (
      <div
        className={`flex h-24 w-full items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)] ${className}`.trim()}
      >
        {FALLBACK_MESSAGE}
      </div>
    )
  }

  return <img alt={alt} className={className} onError={() => setErroredSrc(src)} src={src} />
}
