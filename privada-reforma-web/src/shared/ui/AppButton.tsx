import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

type AppButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    block?: boolean
  }
>

const baseClassName =
  'inline-flex items-center justify-center rounded-[18px] px-4 py-3 text-sm font-semibold tracking-[0.01em] transition duration-200 active:scale-[0.98] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60'

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    'border border-[rgba(255,255,255,0.18)] bg-[linear-gradient(135deg,_var(--color-brand),_#f1e4c9)] text-[#1c1408] shadow-[0_14px_30px_rgba(210,182,134,0.24)]',
  secondary:
    'border border-[var(--color-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.01))] text-[var(--color-text)] backdrop-blur',
  danger:
    'border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,_var(--color-danger),_#f0b1ab)] text-white shadow-[0_14px_30px_rgba(214,111,108,0.2)]',
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
