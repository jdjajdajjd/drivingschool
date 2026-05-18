import { cn } from '../../lib/utils'

type LoaderTone = 'student' | 'admin' | 'dark'

interface LoaderProps {
  className?: string
  tone?: LoaderTone
}

const toneClass: Record<LoaderTone, string> = {
  student: 'border-[#35485A]',
  admin: 'border-[#111827]',
  dark: 'border-[#111827]',
}

const screenTone: Record<LoaderTone, { bg: string; text: string; soft: string }> = {
  student: { bg: 'bg-[#F3F7FB]', text: 'text-[#15202B]', soft: 'text-[#6D7A88]' },
  admin: { bg: 'bg-[var(--admin-bg,#F3F7FB)]', text: 'text-[#111315]', soft: 'text-[#687381]' },
  dark: { bg: 'bg-[#F3F7FB]', text: 'text-[#111315]', soft: 'text-[#667085]' },
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
  const outer = tone === 'admin' ? 'border-t-[#111827] text-[#111827]' : 'border-t-[#111315] text-[#111315]'
  const inner = tone === 'admin' ? 'border-t-[#687381]' : 'border-t-[#8B91F0]'

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
      <div className="flex flex-col items-center rounded-[28px] border border-white/70 bg-[rgba(255,255,255,0.62)] px-7 py-6 text-center shadow-[0_18px_46px_rgba(32,45,62,0.07)] backdrop-blur-2xl">
        <ClassicLoader tone={tone} />
        <p className={cn('mt-4 text-[15px] font-medium leading-5', colors.text)}>{label}</p>
        <p className={cn('mt-1 text-[13px] font-normal leading-5', colors.soft)}>Подготавливаем экран</p>
      </div>
    </div>
  )
}

export function AdminContentLoader() {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-4 py-10">
      <div className="rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.76)] px-8 py-7 shadow-[var(--shadow-card)] backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <ConcentricLoader tone="admin" />
          <p className="text-[14px] font-medium text-[#111315]">Загрузка раздела</p>
        </div>
      </div>
    </div>
  )
}
