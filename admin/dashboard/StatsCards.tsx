"use client";

export function StatsCards({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg bg-white/5 p-5">
          <p className="text-2xl font-semibold text-gold">{s.value}</p>
          <p className="text-sm text-white/60">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
