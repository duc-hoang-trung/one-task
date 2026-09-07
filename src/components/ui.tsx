import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-950 disabled:bg-stone-300',
  secondary: 'bg-stone-200 text-stone-900 hover:bg-stone-300 disabled:text-stone-400',
  ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 disabled:text-stone-300',
  danger: 'bg-transparent text-rose-700 hover:bg-rose-50',
}

export function Button({
  variant = 'primary', size = 'md', className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-base', lg: 'px-6 py-4 text-lg font-semibold w-full' }
  return (
    <button
      className={`rounded-xl transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '', tone = 'light' }: { children: ReactNode; className?: string; tone?: 'light' | 'dark' }) {
  const tones = {
    light: 'bg-white text-stone-900 ring-stone-200',
    dark: 'bg-stone-800 text-stone-100 ring-stone-700',
  }
  return <section className={`rounded-2xl p-5 shadow-sm ring-1 ${tones[tone]} ${className}`}>{children}</section>
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-rose-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-stone-500">{hint}</span>
      ) : null}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} min-h-20 resize-y`} {...props} />
}

export function Page({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pb-28 pt-6">
      {(title || subtitle) && (
        <header>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
          {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
        </header>
      )}
      {children}
    </div>
  )
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-stone-500 ${className}`}>{children}</p>
}
