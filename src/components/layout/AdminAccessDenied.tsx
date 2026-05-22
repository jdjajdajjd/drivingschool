import { ShieldAlert } from '@/components/icons/lucide'
import { Link } from 'react-router-dom'

export function AdminAccessDenied({ to }: { to: string }) {
  return (
    <div className="grid min-h-full place-items-center bg-[#F3F7FB] p-4">
      <div className="w-full max-w-[460px] rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.76)] p-6 text-center shadow-[var(--shadow-card)] backdrop-blur-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[18px] bg-[#EAF3FF] text-[#315A7C]">
          <ShieldAlert width={24} height={24} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-[#111315]">Недостаточно прав</h1>
        <p className="mt-2 text-sm leading-6 text-[#687381]">
          Этот раздел недоступен для вашей роли. Откройте доступный раздел кабинета или обратитесь к директору школы.
        </p>
        <Link to={to} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111827] px-4 text-sm font-medium text-white">
          В доступный раздел
        </Link>
      </div>
    </div>
  )
}
