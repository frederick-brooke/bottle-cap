'use client'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-900', text: 'text-emerald-300', label: 'Active' },
  completed: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: 'Completed' },
  paused: { bg: 'bg-amber-900', text: 'text-amber-300', label: 'Paused' },
  pending: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: 'Pending' },
  running: { bg: 'bg-blue-900', text: 'text-blue-300', label: 'Running' },
  failed: { bg: 'bg-red-900', text: 'text-red-300', label: 'Failed' },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { bg: 'bg-zinc-800', text: 'text-zinc-400', label: status }
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span className={`${config.bg} ${config.text} ${sizeClasses} rounded font-medium`}>
      {config.label}
    </span>
  )
}

interface ModeBadgeProps {
  mode: string
}

const MODE_CONFIG: Record<string, { bg: string; text: string }> = {
  paced: { bg: 'bg-cyan-900', text: 'text-cyan-300' },
  burst: { bg: 'bg-fuchsia-900', text: 'text-fuchsia-300' },
  throttled: { bg: 'bg-amber-900', text: 'text-amber-300' },
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  const config = MODE_CONFIG[mode] ?? { bg: 'bg-zinc-800', text: 'text-zinc-400' }
  return (
    <span className={`${config.bg} ${config.text} text-xs px-1.5 py-0.5 rounded font-medium`}>
      {mode}
    </span>
  )
}
