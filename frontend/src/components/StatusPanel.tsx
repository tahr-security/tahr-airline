import { AlertCircle, CloudSun } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="surface flex min-h-44 items-center justify-center p-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <CloudSun
          className="mx-auto mb-3 size-8 text-sky-ink"
          aria-hidden="true"
        />
        <p className="font-bold">{label}…</p>
      </div>
    </div>
  )
}

export function EmptyPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="surface p-8 text-center" role="status">
      <CloudSun
        className="mx-auto mb-3 size-10 text-sky-ink"
        aria-hidden="true"
      />
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mx-auto mt-2 max-w-lg text-navy/70">{children}</div>
    </div>
  )
}

export function ErrorPanel({ retry }: { retry?: () => void }) {
  return (
    <div className="surface p-8 text-center" role="alert">
      <AlertCircle
        className="mx-auto mb-3 size-10 text-coral"
        aria-hidden="true"
      />
      <h2 className="text-xl font-black">We hit some turbulence</h2>
      <p className="mt-2 text-navy/70">
        This information could not be loaded. Please try again.
      </p>
      {retry && (
        <Button onClick={retry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  )
}
