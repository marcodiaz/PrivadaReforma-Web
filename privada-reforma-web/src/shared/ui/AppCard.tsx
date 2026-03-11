import type { PropsWithChildren } from 'react'

type AppCardProps = PropsWithChildren<{
  className?: string
}>

export function AppCard({ children, className = '' }: AppCardProps) {
  return (
    <section
      className={`app-glass-panel rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(180deg,_var(--color-surface),_var(--color-surface-muted))] p-4 shadow-[var(--color-shadow)] ring-1 ring-white/4 animate-[card-enter_320ms_ease-out] ${className}`.trim()}
    >
      {children}
    </section>
  )
}
