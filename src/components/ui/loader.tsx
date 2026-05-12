import { cn } from '../../lib/utils'

type LoaderTone = 'student' | 'admin' | 'dark'

interface LoaderProps {
  className?: string
  tone?: LoaderTone
}

const toneClass: Record<LoaderTone, string> = {
  student: 'border-[#1F2BD8]',
  admin: 'border-[#0E7C66]',
  dark: 'border-[#10201F]',
}

const screenTone: Record<LoaderTone, { bg: string; text: string; soft: string }> = {
  student: { bg: 'bg-[#F6F7FA]', text: 'text-[#1F2BD8]', soft: 'text-[#8B8D94]' },
  admin: { bg: 'bg-[var(--admin-bg,#EEF4F2)]', text: 'text-[#0E7C66]', soft: 'text-[#5D6D70]' },
  dark: { bg: 'bg-[#F6F7FA]', text: 'text-[#10201F]', soft: 'text-[#667085]' },
}

export default function ClassicLoader({ className, tone = 'student' }: LoaderProps) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-t-transparent',
        toneClass[tone],
        className,
      )}
      role="status"
      aria-label="Загрузка"
    />
  )
}

export function ConcentricLoader({ className, tone = 'student' }: LoaderProps) {
  const outer = tone === 'admin' ? 'border-t-[#0E7C66] text-[#0E7C66]' : 'border-t-[#1F2BD8] text-[#1F2BD8]'
  const inner = tone === 'admin' ? 'border-t-[#10201F]' : 'border-t-[#8B91F0]'

  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-4', className)} role="status" aria-label="Загрузка">
      <div className={cn('flex h-16 w-16 animate-spin items-center justify-center rounded-full border-4 border-transparent', outer)}>
        <div className={cn('flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-transparent', inner)} />
      </div>
    </div>
  )
}

export function LoadingScreen({
  tone = 'student',
  label = 'Загрузка',
  className,
}: LoaderProps & { label?: string }) {
  const colors = screenTone[tone]

  return (
    <div className={cn('flex min-h-dvh items-center justify-center px-4', colors.bg, className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <ClassicLoader tone={tone} />
        <p className={cn('text-[13px] font-black uppercase tracking-[0.08em]', colors.text)}>{label}</p>
        <p className={cn('text-[12px] font-bold', colors.soft)}>Подготавливаем экран</p>
      </div>
    </div>
  )
}

export function AdminContentLoader() {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-4 py-10">
      <div className="rounded-[16px] border border-[var(--admin-line,#D7E3DF)] bg-white px-8 py-7 shadow-[0_12px_34px_rgba(16,32,31,0.07)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <ConcentricLoader tone="admin" />
          <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#0E7C66]">Загрузка раздела</p>
        </div>
      </div>
    </div>
  )
}
