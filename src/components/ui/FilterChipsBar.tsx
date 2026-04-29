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
      <div className="flex min-w-max gap-2">
        {allItems.map((item) => {
          const active = item.value === value
          return (
            <button
              key={`${item.value}-${item.label}`}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                'min-h-11 rounded-2xl border px-4 text-sm font-semibold transition',
                active ? 'border-product-primary bg-product-primary-soft text-product-primary' : 'border-product-border bg-white text-product-secondary',
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
