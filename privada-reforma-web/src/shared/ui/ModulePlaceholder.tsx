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
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {role}
        </p>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{title}</h1>
      </header>
      <AppCard>
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </AppCard>
    </div>
  )
}
