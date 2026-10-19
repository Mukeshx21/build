import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react"

export function Button({
  children,
  kind = "primary",
  className = "",
  loading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "ghost" | "danger"
  loading?: boolean
}) {
  return (
    <button
      className={`btn btn-${kind} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="spin" /> : null}
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode
  tone?: "green" | "amber" | "navy" | "red"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info" | "warning"
  children: ReactNode
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "info"
        ? Info
        : AlertCircle
  return (
    <div className={`alert alert-${tone}`} role="status">
      <Icon size={16} />
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function money(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  return `₹${(n / 100000).toFixed(1)} L`
}
