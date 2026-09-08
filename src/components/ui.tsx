import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:opacity-90 disabled:opacity-40',
  accent: 'bg-accent text-white hover:bg-accent-2 disabled:opacity-40',
  secondary: 'bg-paper-3/70 text-ink hover:bg-paper-3 disabled:opacity-40',
  ghost: 'bg-transparent text-ink-2 hover:bg-paper-3/60 disabled:opacity-40',
  danger: 'bg-transparent text-bad hover:bg-bad/10',
}

export function Button({
  variant = 'primary', size = 'md', className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-[15px] rounded-xl',
    lg: 'px-6 py-4 text-lg font-medium w-full rounded-2xl',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-[background-color,opacity,transform] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '', tone = 'light' }: { children: ReactNode; className?: string; tone?: 'light' | 'dark' | 'accent' }) {
  const tones = {
    light: 'bg-paper-2/70 text-ink ring-line shadow-card',
    accent: 'bg-accent-soft text-ink ring-accent/20',
    dark: 'bg-night-2 text-night-text ring-white/10',
  }
  return <section className={`rounded-2xl p-5 ring-1 backdrop-blur-sm ${tones[tone]} ${className}`}>{children}</section>
}

/** Nhãn nhỏ, chữ hoa, tracking rộng. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 ${className}`}>{children}</p>
}

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-ink-3 ${className}`}>{children}</p>
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-bad">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] leading-snug text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} min-h-20 resize-y leading-relaxed`} {...props} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />
}

export function Page({ title, subtitle, children, className = '' }: { title?: ReactNode; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`animate-rise mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-5 pb-28 pt-7 ${className}`}>
      {(title || subtitle) && (
        <header className="mb-1">
          {subtitle && <Eyebrow className="mb-1">{subtitle}</Eyebrow>}
          {title && <h1 className="font-display text-[34px] leading-[1.05] tracking-tight">{title}</h1>}
        </header>
      )}
      {children}
    </div>
  )
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div className="animate-rise w-full max-w-md rounded-3xl bg-paper p-5 shadow-2xl ring-1 ring-line" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/** Ô số liệu nhỏ cho review. */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-paper/70 p-3 ring-1 ring-line">
      <p className="text-[12px] leading-snug text-ink-3">{label}</p>
      <p className="font-display mt-1 text-2xl tabular-nums leading-none">{value}</p>
      {note && <p className="mt-1 text-[12px] text-ink-3">{note}</p>}
    </div>
  )
}
