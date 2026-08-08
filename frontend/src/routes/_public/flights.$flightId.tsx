import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Check,
  CheckCircle2,
  Clipboard,
  Plane,
  ShieldCheck,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FlightCard } from "@/components/FlightCard"
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, api } from "@/lib/api"
import { formatMoney } from "@/lib/format"

const bookingSchema = z.object({
  passenger_name: z
    .string()
    .trim()
    .min(2, "Enter the passenger's full name")
    .max(120),
  passenger_email: z.email("Enter a valid email address"),
})
type BookingForm = z.infer<typeof bookingSchema>

export const Route = createFileRoute("/_public/flights/$flightId")({
  component: FlightDetailPage,
  head: () => ({ meta: [{ title: "Complete your booking — Tahr Air" }] }),
})

function FlightDetailPage() {
  const { flightId } = Route.useParams()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const flight = useQuery({
    queryKey: ["flight", flightId],
    queryFn: () => api.flight(flightId),
  })
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { passenger_name: "", passenger_email: "" },
  })
  const booking = useMutation({
    mutationFn: (values: BookingForm) =>
      api.createBooking({ flight_id: flightId, ...values }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["flight", flightId] }),
  })

  if (flight.isLoading)
    return (
      <div className="page-container py-14">
        <LoadingPanel label="Loading your flight" />
      </div>
    )
  if (flight.isError || !flight.data)
    return (
      <div className="page-container py-14">
        <ErrorPanel retry={() => flight.refetch()} />
      </div>
    )

  if (booking.data) {
    const copyReference = async () => {
      await navigator.clipboard.writeText(booking.data.booking_reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
    return (
      <div className="page-container py-12 sm:py-16">
        <section
          className="surface mx-auto max-w-3xl overflow-hidden text-center"
          aria-labelledby="confirmed-heading"
        >
          <div className="bg-sky/12 px-6 py-10">
            <CheckCircle2
              className="mx-auto mb-4 size-14 text-sky-ink"
              aria-hidden="true"
            />
            <p className="eyebrow">Booking confirmed</p>
            <h1 id="confirmed-heading" className="text-4xl font-black">
              You're ready for takeoff!
            </h1>
            <p className="mt-3 text-navy/70">
              Save this reference. You’ll need it with your email to manage the
              booking.
            </p>
          </div>
          <div className="p-6 sm:p-9">
            <p className="text-sm font-black uppercase tracking-widest text-navy/70">
              Booking reference
            </p>
            <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sky bg-cream px-4 py-4">
              <strong
                className="text-2xl tracking-wider"
                data-testid="booking-reference"
              >
                {booking.data.booking_reference}
              </strong>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyReference}
                aria-label="Copy booking reference"
              >
                {copied ? <Check /> : <Clipboard />}
              </Button>
            </div>
            <div
              aria-live="polite"
              className="h-6 pt-1 text-sm font-bold text-sky-ink"
            >
              {copied ? "Copied" : ""}
            </div>
            <div className="my-7 text-left">
              <FlightCard flight={booking.data.flight} preview />
            </div>
            <Button asChild size="lg">
              <Link to="/manage">Manage this booking</Link>
            </Button>
          </div>
        </section>
      </div>
    )
  }

  const unavailable =
    flight.data.effective_status !== "scheduled" ||
    flight.data.available_capacity < 1
  const bookingError =
    booking.error instanceof ApiError
      ? booking.error.message
      : booking.isError
        ? "We could not complete this booking."
        : null

  return (
    <div className="page-container py-10 sm:py-14">
      <p className="eyebrow">One last step</p>
      <h1 className="text-4xl font-black sm:text-5xl">Confirm your flight</h1>
      <div className="mt-8 grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
        <FlightCard flight={flight.data} preview />
        <section
          className="surface p-5 sm:p-7"
          aria-labelledby="passenger-heading"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-coral/18">
              <Plane aria-hidden="true" />
            </div>
            <div>
              <h2 id="passenger-heading" className="text-2xl font-black">
                Passenger details
              </h2>
              <p className="text-sm text-navy/70">One passenger · one way</p>
            </div>
          </div>
          <form
            className="mt-6 grid gap-5"
            onSubmit={form.handleSubmit((values) => booking.mutate(values))}
          >
            <div>
              <label className="field-label" htmlFor="passenger_name">
                Full name
              </label>
              <Input
                id="passenger_name"
                autoComplete="name"
                {...form.register("passenger_name")}
                aria-invalid={!!form.formState.errors.passenger_name}
              />
              {form.formState.errors.passenger_name && (
                <p className="field-error">
                  {form.formState.errors.passenger_name.message}
                </p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="passenger_email">
                Email address
              </label>
              <Input
                id="passenger_email"
                type="email"
                autoComplete="email"
                {...form.register("passenger_email")}
                aria-invalid={!!form.formState.errors.passenger_email}
              />
              {form.formState.errors.passenger_email && (
                <p className="field-error">
                  {form.formState.errors.passenger_email.message}
                </p>
              )}
              <p className="mt-2 text-sm text-navy/70">
                Used only to retrieve this booking.
              </p>
            </div>
            <div className="flex items-center justify-between border-y border-navy/10 py-4">
              <span className="font-bold">Total</span>
              <strong className="text-2xl">
                {formatMoney(flight.data.price_cents)}
              </strong>
            </div>
            {bookingError && (
              <p
                className="rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive"
                role="alert"
              >
                {bookingError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={unavailable || booking.isPending}
              className="w-full bg-coral text-navy hover:bg-coral/90"
            >
              {booking.isPending
                ? "Confirming…"
                : unavailable
                  ? "Flight unavailable"
                  : "Confirm booking"}
            </Button>
            <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-navy/70">
              <ShieldCheck className="size-4" aria-hidden="true" /> No payment
              required. Confirmation is immediate.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
