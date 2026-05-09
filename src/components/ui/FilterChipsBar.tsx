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
                'min-h-9 whitespace-nowrap rounded-full border px-4 text-[13px] font-bold transition-all duration-150 active:scale-[0.97]',
                active
                  ? 'border-[#C4935A] bg-[rgba(246,184,77,0.12)] text-[#C97F10]'
                  : 'border-[rgba(0,0,0,0.06)] bg-white text-[#6F747A] hover:border-[rgba(0,0,0,0.10)]',
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