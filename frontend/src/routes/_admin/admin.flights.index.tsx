import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Ban, Pencil, Plus, Trash2 } from "lucide-react"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { formatFlightDate, formatFlightTime, formatMoney } from "@/lib/format"

export const Route = createFileRoute("/_admin/admin/flights/")({
  component: FlightsAdminPage,
  head: () => ({ meta: [{ title: "Flights — Tahr Air staff" }] }),
})

function FlightsAdminPage() {
  const queryClient = useQueryClient()
  const flights = useQuery({
    queryKey: ["admin-flights"],
    queryFn: () => api.admin.flights(),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-flights"] })
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
  }
  const cancel = useMutation({
    mutationFn: api.admin.cancelFlight,
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: api.admin.deleteFlight,
    onSuccess: refresh,
  })
  const error = cancel.error ?? remove.error

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Network schedule</p>
          <h1 className="text-4xl font-black">Flights</h1>
          <p className="mt-2 text-navy/70">
            Manage times, fares, capacity, and service status.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/flights/new">
            <Plus /> Add flight
          </Link>
        </Button>
      </div>
      <div className="mt-8" aria-live="polite">
        {flights.isLoading && <LoadingPanel label="Loading flights" />}
        {flights.isError && <ErrorPanel retry={() => flights.refetch()} />}
        {flights.data?.count === 0 && (
          <EmptyPanel title="No flights yet">
            Create a flight to start building the schedule.
          </EmptyPanel>
        )}
        {error && (
          <p
            className="mb-4 rounded-xl bg-destructive/10 p-4 font-bold text-destructive"
            role="alert"
          >
            The flight could not be changed. Flights with booking history cannot
            be deleted.
          </p>
        )}
        {flights.data && flights.data.count > 0 && (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead className="border-b border-navy/10 bg-sky/8 text-xs uppercase tracking-wide text-navy/70">
                <tr>
                  <th className="px-5 py-4">Flight</th>
                  <th className="px-5 py-4">Departure</th>
                  <th className="px-5 py-4">Capacity</th>
                  <th className="px-5 py-4">Fare</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/10">
                {flights.data.data.map((flight) => (
                  <tr key={flight.id} className="hover:bg-sky/5">
                    <td className="px-5 py-4">
                      <strong>{flight.flight_number}</strong>
                      <p className="text-sm text-navy/70">
                        {flight.origin.code} → {flight.destination.code}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <strong>
                        {formatFlightDate(
                          flight.departure_at,
                          flight.origin.timezone,
                        )}
                      </strong>
                      <p className="text-navy/70">
                        {formatFlightTime(
                          flight.departure_at,
                          flight.origin.timezone,
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <strong>{flight.available_capacity}</strong>
                      <span className="text-navy/70">
                        {" "}
                        / {flight.total_capacity}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {formatMoney(flight.price_cents)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${flight.effective_status === "scheduled" ? "bg-sky/15" : "bg-navy/8 text-navy/70"}`}
                      >
                        {flight.effective_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            to="/admin/flights/$flightId/edit"
                            params={{ flightId: flight.id }}
                            aria-label={`Edit ${flight.flight_number}`}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Cancel ${flight.flight_number}`}
                          disabled={
                            flight.status === "cancelled" || cancel.isPending
                          }
                          onClick={() =>
                            window.confirm(
                              `Cancel ${flight.flight_number} and all confirmed bookings?`,
                            ) && cancel.mutate(flight.id)
                          }
                        >
                          <Ban />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${flight.flight_number}`}
                          disabled={remove.isPending}
                          onClick={() =>
                            window.confirm(
                              `Permanently delete ${flight.flight_number}?`,
                            ) && remove.mutate(flight.id)
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
