import { AppCard } from './AppCard'

type ModulePlaceholderProps = {
  title: string
  description: string
  role: string
}

export function ModulePlaceholder({
  title,
  description,
  role,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-3">
      <header className="space-y-2">
        <p className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {role}
        </p>
        <h1 className="text-[1.4rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          {title}
        </h1>
      </header>
      <AppCard className="bg-[linear-gradient(180deg,_#171717,_#121212)]">
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </AppCard>
    </div>
  )
}
