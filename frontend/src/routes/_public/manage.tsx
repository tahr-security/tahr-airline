import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle2, Search, TicketCheck, XCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FlightCard } from "@/components/FlightCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, api } from "@/lib/api"

const lookupSchema = z.object({
  booking_reference: z
    .string()
    .trim()
    .min(5, "Enter your booking reference")
    .transform((value) => value.toUpperCase()),
  passenger_email: z.email("Enter the email used to book"),
})
type LookupForm = z.infer<typeof lookupSchema>

export const Route = createFileRoute("/_public/manage")({
  component: ManageBookingPage,
  head: () => ({ meta: [{ title: "Manage booking — Tahr Air" }] }),
})

function ManageBookingPage() {
  const form = useForm<LookupForm>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { booking_reference: "", passenger_email: "" },
  })
  const lookup = useMutation({ mutationFn: api.lookupBooking })
  const cancellation = useMutation({
    mutationFn: api.cancelBooking,
  })
  const booking = cancellation.data ?? lookup.data
  const lookupError =
    lookup.error instanceof ApiError
      ? lookup.error.message
      : lookup.isError
        ? "We could not find a matching booking."
        : null

  return (
    <div className="page-container py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <TicketCheck
            className="mx-auto mb-4 size-11 text-sky-ink"
            aria-hidden="true"
          />
          <p className="eyebrow">Your trip, your way</p>
          <h1 className="text-4xl font-black sm:text-5xl">
            Manage your booking
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg font-semibold text-navy/70">
            Enter the reference and email from your booking. No account needed.
          </p>
        </div>
        <section
          className="surface mt-8 p-5 sm:p-8"
          aria-label="Find a booking"
        >
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => lookup.mutate(values))}
          >
            <div>
              <label className="field-label" htmlFor="booking_reference">
                Booking reference
              </label>
              <Input
                id="booking_reference"
                placeholder="TAH-XXXXXXXXXXXXX"
                autoCapitalize="characters"
                {...form.register("booking_reference")}
                aria-invalid={!!form.formState.errors.booking_reference}
              />
              {form.formState.errors.booking_reference && (
                <p className="field-error">
                  {form.formState.errors.booking_reference.message}
                </p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="passenger_email">
                Passenger email
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
            </div>
            <Button
              type="submit"
              size="lg"
              className="sm:col-span-2"
              disabled={lookup.isPending}
            >
              <Search aria-hidden="true" />{" "}
              {lookup.isPending ? "Finding booking…" : "Find booking"}
            </Button>
            {lookupError && (
              <p
                className="rounded-xl bg-destructive/10 p-3 text-center text-sm font-bold text-destructive sm:col-span-2"
                role="alert"
              >
                Booking details did not match. Check both fields and try again.
              </p>
            )}
          </form>
        </section>

        {booking && (
          <section
            className="mt-8"
            aria-labelledby="booking-heading"
            aria-live="polite"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-navy/70">
                  Booking reference
                </p>
                <h2
                  id="booking-heading"
                  className="text-2xl font-black tracking-wide"
                >
                  {booking.booking_reference}
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${booking.status === "confirmed" ? "bg-sky/15 text-navy" : "bg-navy/8 text-navy/70"}`}
              >
                {booking.status === "confirmed" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
              </span>
            </div>
            <FlightCard flight={booking.flight} preview />
            <div className="surface mt-5 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black">Passenger</p>
                <p className="text-navy/70">{booking.passenger_name}</p>
              </div>
              {booking.status === "confirmed" && (
                <Button
                  variant="destructive"
                  disabled={cancellation.isPending}
                  onClick={() =>
                    cancellation.mutate({
                      booking_reference: booking.booking_reference,
                      passenger_email: booking.passenger_email,
                    })
                  }
                >
                  {cancellation.isPending ? "Cancelling…" : "Cancel booking"}
                </Button>
              )}
            </div>
            {cancellation.isSuccess && (
              <p
                className="mt-4 rounded-xl bg-sky/12 p-4 text-center font-bold"
                role="status"
              >
                Booking cancelled. Your seat has been released.
              </p>
            )}
            {cancellation.isError && (
              <p
                className="mt-4 rounded-xl bg-destructive/10 p-4 text-center font-bold text-destructive"
                role="alert"
              >
                Cancellation failed. Please try again.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
