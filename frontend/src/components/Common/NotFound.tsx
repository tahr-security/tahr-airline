import { Link } from "@tanstack/react-router"
import { CloudSun } from "lucide-react"
import { Brand } from "@/components/Brand"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-cream p-5 text-navy"
      data-testid="not-found"
    >
      <div className="surface w-full max-w-xl p-8 text-center sm:p-12">
        <Brand className="mb-9 justify-center" />
        <CloudSun
          className="mx-auto mb-4 size-14 text-sky-ink"
          aria-hidden="true"
        />
        <p className="eyebrow">404 · Route not found</p>
        <h1 className="text-4xl font-black">This trip isn’t on our map.</h1>
        <p className="mt-4 text-navy/70">
          Head home and search for another destination.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link to="/">Back to booking</Link>
        </Button>
      </div>
    </main>
  )
}
