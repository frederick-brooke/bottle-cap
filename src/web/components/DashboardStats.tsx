'use client'

interface DashboardStatsProps {
  stats: {
    totalCaptures: number
    activeCaptures: number
    totalReplays: number
    completedReplays: number
    failedReplays: number
    successRate: number
  }
}

function StatCard({ label, value, color = 'text-zinc-100' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Total Captures" value={stats.totalCaptures} />
      <StatCard label="Active Captures" value={stats.activeCaptures} color="text-emerald-400" />
      <StatCard label="Total Replays" value={stats.totalReplays} />
      <StatCard label="Completed" value={stats.completedReplays} color="text-emerald-400" />
      <StatCard label="Failed" value={stats.failedReplays} color={stats.failedReplays > 0 ? 'text-red-400' : 'text-zinc-100'} />
      <StatCard label="Success Rate" value={`${stats.successRate}%`} color={
        stats.successRate >= 90 ? 'text-emerald-400' : stats.successRate >= 70 ? 'text-amber-400' : 'text-red-400'
      } />
    </div>
  )
}
