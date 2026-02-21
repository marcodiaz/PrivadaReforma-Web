import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { getSignedMaintenancePhotoUrl, isStorageObjectPath } from '../supabase/data'

type MaintenancePhotoProps = {
  pathOrUrl: string
  alt: string
  className?: string
}

export function MaintenancePhoto({ pathOrUrl, alt, className = '' }: MaintenancePhotoProps) {
  const { tx } = useLanguage()
  const [signedSrcByPath, setSignedSrcByPath] = useState<Record<string, string>>({})
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

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
        {tx('Foto no disponible offline.', 'Photo unavailable offline.')}
      </div>
    )
  }

  return (
    <>
      <img
        alt={alt}
        className={`${className} cursor-zoom-in`.trim()}
        onClick={() => setPreviewOpen(true)}
        onError={() => setErroredSrc(src)}
        src={src}
      />
      {previewOpen ? (
        <button
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewOpen(false)}
          type="button"
        >
          <img
            alt={alt}
            className="max-h-[92vh] max-w-[96vw] rounded-xl border border-zinc-700 bg-zinc-950 object-contain"
            onClick={(event) => event.stopPropagation()}
            src={src}
          />
          <span className="absolute right-4 top-4 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200">
            {tx('Cerrar', 'Close')}
          </span>
        </button>
      ) : null}
    </>
  )
}
