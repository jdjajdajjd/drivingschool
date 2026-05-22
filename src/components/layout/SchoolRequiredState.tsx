import { LogOut } from '@/components/icons/lucide'

export function SchoolRequiredState({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F3F7FB] px-4 text-[#111315]">
      <div className="w-full max-w-[520px] rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.76)] p-6 shadow-[var(--shadow-card)] backdrop-blur-2xl">
        <p className="text-[12px] font-medium text-[#687381]">Кабинет школы</p>
        <h1 className="mt-2 text-2xl font-semibold">Доступ не привязан к автошколе</h1>
        <p className="mt-3 text-sm leading-6 text-[#687381]">
          Для рабочего кабинета нужен отдельный доступ, созданный в операторской панели на странице конкретной автошколы.
          Демо-школа здесь не подставляется автоматически.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111827] px-4 text-sm font-medium text-white"
        >
          <LogOut width={17} height={17} />
          Выйти
        </button>
      </div>
    </div>
  )
}
