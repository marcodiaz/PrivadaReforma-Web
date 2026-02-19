import type { PropsWithChildren } from 'react'

type AppCardProps = PropsWithChildren<{
  className?: string
}>

export function AppCard({ children, className = '' }: AppCardProps) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.28)] ${className}`.trim()}
    >
      {children}
    </section>
  )
}
