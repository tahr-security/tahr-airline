import { Link } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { Brand } from "@/components/Brand"
import { Button } from "@/components/ui/button"

export default function ErrorComponent() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-cream p-5 text-navy"
      data-testid="error-component"
    >
      <div className="surface w-full max-w-xl p-8 text-center sm:p-12">
        <Brand className="mb-9 justify-center" />
        <AlertCircle
          className="mx-auto mb-4 size-14 text-coral"
          aria-hidden="true"
        />
        <p className="eyebrow">Unexpected turbulence</p>
        <h1 className="text-4xl font-black">Something went off course.</h1>
        <p className="mt-4 text-navy/70">
          Try the page again or return to flight search.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link to="/">Back to booking</Link>
        </Button>
      </div>
    </main>
  )
}
