import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface CalendarDay {
  date: Date
  slotCount: number
  isBooked: boolean
}

interface CalendarPickerProps {
  days: CalendarDay[]
  selectedDate: Date | null
  onSelect: (date: Date) => void
}

export function CalendarPicker({ days, selectedDate, onSelect }: CalendarPickerProps) {
  const today = startOfDay(new Date())
  const [viewMonth, setViewMonth] = useState(startOfMonth(today))

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  function getDayInfo(date: Date) {
    return days.find((d) => isSameDay(d.date, date)) ?? { slotCount: 0, isBooked: false }
  }

  function prevMonth() {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }

  function nextMonth() {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <div className="card-section p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="btn btn-sm btn-secondary"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <h3 className="t-subheading" style={{ textTransform: 'capitalize' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: ru })}
        </h3>
        <button
          onClick={nextMonth}
          className="btn btn-sm btn-secondary"
          aria-label="Следующий месяц"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="cal-grid mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-grid" role="grid" aria-label="Выбор даты">
        {calDays.map((day) => {
          const info = getDayInfo(day)
          const inMonth = isSameMonth(day, viewMonth)
          const isPast = isBefore(day, today)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isTodayDay = isToday(day)
          const hasSlots = info.slotCount > 0 && !info.isBooked

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth || isPast || (!hasSlots && !isSelected)}
              onClick={() => onSelect(day)}
              className={[
                'cal-day',
                inMonth ? '' : '!opacity-0 pointer-events-none',
                isSelected ? 'selected' : '',
                isTodayDay && !isSelected ? 'today' : '',
                hasSlots && !isSelected ? 'has-slots' : '',
              ].filter(Boolean).join(' ')}
              style={{ position: 'relative' }}
              aria-label={format(day, 'd MMMM', { locale: ru })}
              aria-selected={isSelected}
            >
              <span>{format(day, 'd')}</span>
              {hasSlots && !isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#C4935A',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4935A', display: 'inline-block' }} />
          <span className="t-micro">Есть окна</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6F747A', opacity: 0.4, display: 'inline-block' }} />
          <span className="t-micro">Нет окон</span>
        </div>
      </div>
    </div>
  )
}