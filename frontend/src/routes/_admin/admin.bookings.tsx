import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle2, XCircle } from "lucide-react"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { Button } from "@/components/ui/button"
import { api, type BookingStatus } from "@/lib/api"
import { formatFlightDate, formatMoney } from "@/lib/format"

export const Route = createFileRoute("/_admin/admin/bookings")({
  component: BookingsAdminPage,
  head: () => ({ meta: [{ title: "Bookings — Tahr Air staff" }] }),
})

function BookingsAdminPage() {
  const queryClient = useQueryClient()
  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.admin.bookings(),
  })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      api.admin.updateBooking(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["admin-flights"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    },
  })
  return (
    <div>
      <p className="eyebrow">Passenger service</p>
      <h1 className="text-4xl font-black">Bookings</h1>
      <p className="mt-2 text-navy/70">
        Review reservations and manage confirmation status.
      </p>
      <div className="mt-8" aria-live="polite">
        {bookings.isLoading && <LoadingPanel label="Loading bookings" />}
        {bookings.isError && <ErrorPanel retry={() => bookings.refetch()} />}
        {bookings.data?.count === 0 && (
          <EmptyPanel title="No bookings yet">
            Confirmed trips will appear here.
          </EmptyPanel>
        )}
        {update.isError && (
          <p
            className="mb-4 rounded-xl bg-destructive/10 p-4 font-bold text-destructive"
            role="alert"
          >
            Booking status could not be changed. Reconfirmation requires a
            future scheduled flight with capacity.
          </p>
        )}
        {bookings.data && bookings.data.count > 0 && (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-navy/10 bg-sky/8 text-xs uppercase tracking-wide text-navy/70">
                <tr>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Passenger</th>
                  <th className="px-5 py-4">Flight</th>
                  <th className="px-5 py-4">Fare</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/10">
                {bookings.data.data.map((booking) => (
                  <tr key={booking.id} className="hover:bg-sky/5">
                    <td className="px-5 py-4 font-black tracking-wide">
                      {booking.booking_reference}
                    </td>
                    <td className="px-5 py-4">
                      <strong>{booking.passenger_name}</strong>
                      <p className="text-sm text-navy/70">
                        {booking.passenger_email}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <strong>
                        {booking.flight.flight_number} ·{" "}
                        {booking.flight.origin.code} →{" "}
                        {booking.flight.destination.code}
                      </strong>
                      <p className="text-sm text-navy/70">
                        {formatFlightDate(
                          booking.flight.departure_at,
                          booking.flight.origin.timezone,
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {formatMoney(booking.booked_price_cents)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${booking.status === "confirmed" ? "bg-sky/15" : "bg-navy/8 text-navy/70"}`}
                      >
                        {booking.status === "confirmed" ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: booking.id,
                            status:
                              booking.status === "confirmed"
                                ? "cancelled"
                                : "confirmed",
                          })
                        }
                      >
                        {booking.status === "confirmed"
                          ? "Cancel"
                          : "Reconfirm"}
                      </Button>
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
