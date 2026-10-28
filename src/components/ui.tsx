import { Check, Loader2 } from 'lucide-react'
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section
      style={style}
      className={`animate-fade-up rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  )
}

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}) {
  const styles =
    variant === 'primary'
      ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110'
      : 'text-slate-600 hover:bg-slate-900/5'
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:active:scale-100 ${styles} ${className}`}
    />
  )
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-base transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
      />
    </label>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 text-slate-500"
    >
      <Loader2 className="animate-spin text-indigo-600" size={28} aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function InlineLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="animate-spin text-indigo-600" size={18} aria-hidden />
      {label}
    </div>
  )
}

/** The app mark: a white check on an indigo-violet tile. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"
    >
      <Check size={size * 0.55} strokeWidth={3} aria-hidden />
    </span>
  )
}
