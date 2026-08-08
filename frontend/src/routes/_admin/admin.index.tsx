import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { CalendarClock, Gauge, PlaneTakeoff, TicketCheck } from "lucide-react"
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminOverview,
  head: () => ({ meta: [{ title: "Operations overview — Tahr Air" }] }),
})

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: api.admin.stats,
  })
  if (stats.isLoading) return <LoadingPanel label="Loading operations" />
  if (stats.isError || !stats.data)
    return <ErrorPanel retry={() => stats.refetch()} />
  const cards = [
    [PlaneTakeoff, "Upcoming flights", stats.data.scheduled_future_flights],
    [TicketCheck, "Confirmed bookings", stats.data.confirmed_bookings],
    [CalendarClock, "Seats available", stats.data.seats_available],
    [Gauge, "Load factor", `${Math.round(stats.data.load_factor)}%`],
  ]
  return (
    <div>
      <p className="eyebrow">Staff operations</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Good day, crew.</h1>
          <p className="mt-2 text-navy/70">
            Here’s how the network is looking.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/flights/new">Add flight</Link>
        </Button>
      </div>
      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Operations statistics"
      >
        {cards.map(([Icon, label, value]) => {
          const StatIcon = Icon as typeof PlaneTakeoff
          return (
            <article className="surface p-5" key={String(label)}>
              <StatIcon
                className="mb-6 size-7 text-sky-ink"
                aria-hidden="true"
              />
              <p className="text-3xl font-black">{String(value)}</p>
              <p className="mt-1 text-sm font-bold text-navy/70">
                {String(label)}
              </p>
            </article>
          )
        })}
      </section>
      <section className="surface mt-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Capacity snapshot</h2>
          <p className="mt-1 text-navy/70">
            {stats.data.seats_sold} seats sold across upcoming flights.
          </p>
        </div>
        <div
          className="h-4 w-full max-w-md overflow-hidden rounded-full bg-navy/10"
          role="progressbar"
          aria-label="Network load factor"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(stats.data.load_factor)}
        >
          <div
            className="h-full rounded-full bg-coral"
            style={{ width: `${Math.min(100, stats.data.load_factor)}%` }}
          />
        </div>
      </section>
    </div>
  )
}
