import { Link } from "@tanstack/react-router"
import { ArrowRight, Clock3, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Flight } from "@/lib/api"
import {
  flightDuration,
  formatFlightDate,
  formatFlightTime,
  formatMoney,
} from "@/lib/format"

export function FlightCard({
  flight,
  preview = false,
}: {
  flight: Flight
  preview?: boolean
}) {
  const available =
    flight.effective_status === "scheduled" && flight.available_capacity > 0
  return (
    <article className="surface overflow-hidden" data-testid="flight-card">
      <div className="border-b border-navy/10 bg-sky/8 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-black text-navy">
            Tahr Air {flight.flight_number}
          </p>
          <Badge variant={available ? "secondary" : "outline"}>
            {flight.effective_status === "departed"
              ? "Departed"
              : flight.status === "cancelled"
                ? "Cancelled"
                : flight.available_capacity === 0
                  ? "Sold out"
                  : `${flight.available_capacity} seats left`}
          </Badge>
        </div>
      </div>
      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-6">
        <div>
          <p className="text-3xl font-black">{flight.origin.code}</p>
          <p className="font-bold text-navy/70">{flight.origin.city}</p>
          <p className="mt-2 text-sm font-semibold">
            {formatFlightTime(flight.departure_at, flight.origin.timezone)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-navy/70 sm:flex-col">
          <Clock3 className="size-4" aria-hidden="true" />
          <span>{flightDuration(flight)}</span>
          <ArrowRight
            className="size-5 text-sky-ink sm:rotate-90"
            aria-hidden="true"
          />
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-black">{flight.destination.code}</p>
          <p className="font-bold text-navy/70">{flight.destination.city}</p>
          <p className="mt-2 text-sm font-semibold">
            {formatFlightTime(flight.arrival_at, flight.destination.timezone)}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-navy/10 bg-cloud px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-navy/70">
            {formatFlightDate(flight.departure_at, flight.origin.timezone)}
          </p>
          <p className="text-xl font-black">
            {formatMoney(flight.price_cents, flight.currency)}{" "}
            <span className="text-xs font-bold text-navy/70">one way</span>
          </p>
        </div>
        {!preview && (
          <Button asChild disabled={!available} className="sm:min-w-36">
            {available ? (
              <Link to="/flights/$flightId" params={{ flightId: flight.id }}>
                Select flight
              </Link>
            ) : (
              <span aria-disabled="true">
                <Users aria-hidden="true" /> Unavailable
              </span>
            )}
          </Button>
        )}
      </div>
    </article>
  )
}
