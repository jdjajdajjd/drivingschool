import { cn } from '../../lib/utils'

export interface FilterChip {
  value: string
  label: string
}

export function FilterChipsBar({
  items,
  value,
  onChange,
  allLabel = 'Все',
}: {
  items: FilterChip[]
  value: string
  onChange: (value: string) => void
  allLabel?: string
}) {
  const allItems = [{ value: '', label: allLabel }, ...items]
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-1.5">
        {allItems.map((item) => {
          const active = item.value === value
          return (
            <button
              key={`${item.value}-${item.label}`}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                'min-h-9 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium transition-all duration-150 active:scale-[0.97]',
                active
                  ? 'border-[#111827] bg-[#111827] text-white'
                  : 'border-[rgba(17,24,39,0.07)] bg-white text-[#687381] hover:border-[rgba(17,24,39,0.14)]',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
