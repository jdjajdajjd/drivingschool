import { useState } from 'react'
import { BottomSheet } from './BottomSheet'

interface FilterOption {
  value: string
  label: string
}

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  filters: {
    key: string
    label: string
    options: FilterOption[]
    selected: string[]
    onChange: (key: string, values: string[]) => void
  }[]
  onApply?: () => void
  onReset?: () => void
}

export function FilterSheet({ open, onClose, title = 'Фильтры', filters, onApply, onReset }: FilterSheetProps) {
  const [local, setLocal] = useState(() =>
    filters.reduce((acc, f) => ({ ...acc, [f.key]: f.selected }), {} as Record<string, string[]>)
  )

  const toggle = (key: string, value: string) => {
    setLocal((prev) => {
      const cur = prev[key] || []
      return { ...prev, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })
  }

  const handleApply = () => {
    filters.forEach((f) => f.onChange(f.key, local[f.key] || []))
    onApply?.()
    onClose()
  }

  const handleReset = () => {
    const reset = filters.reduce((acc, f) => ({ ...acc, [f.key]: [] }), {} as Record<string, string[]>)
    setLocal(reset)
    onReset?.()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-6">
        {filters.map((filter) => (
          <div key={filter.key}>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-muted">{filter.label}</p>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((opt) => (
                <button key={opt.value} type="button" onClick={() => toggle(filter.key, opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                    (local[filter.key] || []).includes(opt.value)
                      ? 'border-ink bg-ink text-white' : 'border-border bg-surface text-ink hover:border-border-strong'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={handleReset}
            className="flex-1 rounded-[12px] border border-border py-2.5 text-[13px] font-bold text-ink">Сбросить</button>
          <button type="button" onClick={handleApply}
            className="flex-1 rounded-[12px] bg-ink py-2.5 text-[13px] font-bold text-white">Применить</button>
        </div>
      </div>
    </BottomSheet>
  )
}
