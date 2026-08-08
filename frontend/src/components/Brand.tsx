import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50",
        className,
      )}
      aria-label="Tahr Air home"
    >
      <svg viewBox="0 0 44 44" aria-hidden="true" className="size-10 shrink-0">
        <circle cx="22" cy="22" r="21" fill="#3B9AD9" />
        <path d="M5 31 17 17l6 7 5-5 11 12H5Z" fill="#FFF8EA" />
        <path
          d="m12 13 7.5 1.4 10.8-5.2c1.6-.8 3.1 1.1 2 2.5l-7.1 7.9 8.8 4.2-2.2 2.6-12-2.2-4.4 5.1-3-.7 2.4-7.1-4.9-5.7 2.1-2.8Z"
          fill="#F47C6C"
        />
      </svg>
      <span className="text-xl font-black tracking-tight">Tahr Air</span>
    </Link>
  )
}
