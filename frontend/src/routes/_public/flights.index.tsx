import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FlightCard } from "@/components/FlightCard"
import { type FlightSearch, SearchForm } from "@/components/SearchForm"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { api } from "@/lib/api"
import { tomorrowISO } from "@/lib/format"

const readSearch = (search: Record<string, unknown>): FlightSearch => ({
  origin:
    typeof search.origin === "string" ? search.origin.toUpperCase() : "YUL",
  destination:
    typeof search.destination === "string"
      ? search.destination.toUpperCase()
      : "YYZ",
  departure_date:
    typeof search.departure_date === "string"
      ? search.departure_date
      : tomorrowISO(),
})

export const Route = createFileRoute("/_public/flights/")({
  validateSearch: readSearch,
  component: FlightResultsPage,
  head: () => ({ meta: [{ title: "Flight search — Tahr Air" }] }),
})

function FlightResultsPage() {
  const filters = Route.useSearch()
  const navigate = useNavigate()
  const flights = useQuery({
    queryKey: ["flights", filters],
    queryFn: () => api.searchFlights(filters),
  })

  const search = (values: FlightSearch) =>
    navigate({ to: "/flights", search: values })

  return (
    <div className="page-container py-10 sm:py-14">
      <p className="eyebrow">Choose your flight</p>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
        {filters.origin} to {filters.destination}
      </h1>
      <div className="surface my-8 p-5 sm:p-6">
        <SearchForm initialValues={filters} onSubmit={search} compact />
      </div>
      <div
        className="mb-5 flex items-center justify-between gap-4"
        aria-live="polite"
      >
        <h2 className="text-2xl font-black">Available flights</h2>
        {flights.data && (
          <p className="font-bold text-navy/70">
            {flights.data.count}{" "}
            {flights.data.count === 1 ? "option" : "options"}
          </p>
        )}
      </div>
      <div className="grid gap-5">
        {flights.isLoading && <LoadingPanel label="Finding the best flights" />}
        {flights.isError && <ErrorPanel retry={() => flights.refetch()} />}
        {flights.data?.data.map((flight) => (
          <FlightCard flight={flight} key={flight.id} />
        ))}
        {flights.data?.count === 0 && (
          <EmptyPanel title="No flights found">
            Try another date or route. Our small network flies on select days.
          </EmptyPanel>
        )}
      </div>
    </div>
  )
}
