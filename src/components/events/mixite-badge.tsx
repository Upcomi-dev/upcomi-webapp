interface MixiteBadgeProps {
  className?: string;
}

export function MixiteBadge({ className = "" }: MixiteBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border border-white/45 bg-[#315643]/88 px-2.5 py-1 text-[10px] font-semibold leading-none text-white shadow-[var(--shadow-sm)] backdrop-blur-sm ${className}`}
    >
      Mixité choisie
    </span>
  );
}
