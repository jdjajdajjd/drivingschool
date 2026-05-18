interface KpiStripProps {
  items: {
    label: string
    value: string | number
    delta?: string
    trend?: 'up' | 'down' | 'neutral'
  }[]
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-[14px] border border-border bg-surface p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{item.label}</p>
          <p className="mt-1 text-[22px] font-black tracking-tight text-ink">{item.value}</p>
          {item.delta && (
            <p className={`mt-0.5 text-[11px] font-bold ${
              item.trend === 'up' ? 'text-success' : item.trend === 'down' ? 'text-error' : 'text-text-muted'
            }`}>
              {item.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
