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
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-[var(--color-border)] bg-[linear-gradient(135deg,_rgba(210,182,134,0.12),_rgba(125,147,181,0.08))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {role}
        </p>
        <h1 className="max-w-[18ch] text-[1.55rem] font-semibold tracking-[-0.03em] text-[var(--color-text)]">
          {title}
        </h1>
      </header>
      <AppCard className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_var(--color-panel-glow),_transparent_45%),linear-gradient(180deg,_var(--color-surface),_var(--color-surface-muted))]">
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </AppCard>
    </div>
  )
}
