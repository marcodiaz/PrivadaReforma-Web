import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

type AppButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    block?: boolean
  }
>

const baseClassName =
  'inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-brand)] text-white shadow-sm',
  secondary: 'bg-[var(--color-surface-muted)] text-[var(--color-text)]',
  danger: 'bg-[var(--color-danger)] text-white',
}

export function AppButton({
  variant = 'primary',
  block = false,
  children,
  className = '',
  ...props
}: AppButtonProps) {
  const widthClassName = block ? 'w-full' : ''

  return (
    <button
      className={`${baseClassName} ${variantClassName[variant]} ${widthClassName} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
