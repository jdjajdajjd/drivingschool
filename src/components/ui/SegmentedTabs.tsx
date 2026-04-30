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
    <div
      className="grid gap-1 p-1"
      style={{
        background: '#F4F5F6',
        borderRadius: '999px',
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'min-h-9 rounded-full px-4 text-[13px] font-bold transition-all duration-150 active:scale-[0.97]',
              active
                ? 'bg-white text-[#111418] shadow-[0_8px_20px_rgba(0,0,0,0.08)]'
                : 'text-[#6F747A] hover:text-[#111418]',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}