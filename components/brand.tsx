import Link from "next/link";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="Codex Skills home">
      <span className="relative grid size-10 place-items-center rounded-full border border-black/10 bg-white/70 shadow-[inset_0_1px_10px_rgba(255,255,255,.8),0_12px_30px_rgba(40,45,55,.09)] backdrop-blur-xl">
        <span className="absolute inset-[7px] rounded-full bg-[radial-gradient(circle_at_34%_24%,#fff_0_16%,#dfe5ef_36%,#8fb7ff_72%,#c9c2ff_100%)] opacity-90 transition-transform duration-500 group-hover:scale-110" />
        <span className="relative size-3 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,.9)]" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-semibold tracking-[0.01em]">Codex Skills</span>
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#7b8392]">
            Curated workflows
          </span>
        </span>
      )}
    </Link>
  );
}
