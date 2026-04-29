import { cn } from '../../lib/utils'

export interface SegmentedTab<T extends string> {
  value: T
  label: string
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<SegmentedTab<T>>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="grid rounded-2xl border border-product-border bg-product-alt p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'min-h-11 rounded-xl px-3 text-sm font-semibold transition',
              active ? 'bg-white text-product-main shadow-soft' : 'text-product-secondary hover:text-product-main',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
