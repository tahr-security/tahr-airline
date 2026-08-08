import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Flight, type FlightInput } from "@/lib/api"
import { toLocalInputValue } from "@/lib/format"

const flightSchema = z
  .object({
    flight_number: z
      .string()
      .trim()
      .min(3, "Flight number is required")
      .max(12)
      .transform((value) => value.toUpperCase()),
    origin_id: z.string().uuid("Choose an origin"),
    destination_id: z.string().uuid("Choose a destination"),
    departure_at: z.string().min(1, "Departure is required"),
    arrival_at: z.string().min(1, "Arrival is required"),
    price_cents: z.number().int().min(100, "Fare must be at least $1"),
    total_capacity: z
      .number()
      .int()
      .min(1, "Capacity must be positive")
      .max(500),
  })
  .refine((value) => value.origin_id !== value.destination_id, {
    message: "Airports must be different",
    path: ["destination_id"],
  })
  .refine(
    (value) => new Date(value.arrival_at) > new Date(value.departure_at),
    { message: "Arrival must be after departure", path: ["arrival_at"] },
  )

type FlightFormValues = z.infer<typeof flightSchema>

const blank: FlightFormValues = {
  flight_number: "TA",
  origin_id: "",
  destination_id: "",
  departure_at: "",
  arrival_at: "",
  price_cents: 12900,
  total_capacity: 36,
}

export function AdminFlightForm({
  flight,
  submitting,
  submitLabel,
  serverError,
  onSubmit,
}: {
  flight?: Flight
  submitting: boolean
  submitLabel: string
  serverError?: string
  onSubmit: (values: FlightInput) => void
}) {
  const airports = useQuery({
    queryKey: ["airports"],
    queryFn: () => api.airports(),
  })
  const form = useForm<FlightFormValues>({
    resolver: zodResolver(flightSchema),
    defaultValues: blank,
  })

  useEffect(() => {
    if (flight) {
      form.reset({
        flight_number: flight.flight_number,
        origin_id: flight.origin.id,
        destination_id: flight.destination.id,
        departure_at: toLocalInputValue(flight.departure_at),
        arrival_at: toLocalInputValue(flight.arrival_at),
        price_cents: flight.price_cents,
        total_capacity: flight.total_capacity,
      })
    } else if (airports.data?.data.length && !form.getValues("origin_id")) {
      form.setValue("origin_id", airports.data.data[0].id)
      form.setValue("destination_id", airports.data.data[1]?.id ?? "")
    }
  }, [airports.data, flight, form])

  const selectClass =
    "min-h-11 w-full rounded-xl border border-input bg-cloud px-3 text-sm font-bold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
  const submit = (values: FlightFormValues) =>
    onSubmit({
      ...values,
      departure_at: new Date(values.departure_at).toISOString(),
      arrival_at: new Date(values.arrival_at).toISOString(),
    })

  return (
    <form
      className="surface grid gap-6 p-5 sm:grid-cols-2 sm:p-7"
      onSubmit={form.handleSubmit(submit)}
    >
      <div>
        <label className="field-label" htmlFor="flight_number">
          Flight number
        </label>
        <Input
          id="flight_number"
          placeholder="TA601"
          {...form.register("flight_number")}
        />
        {form.formState.errors.flight_number && (
          <p className="field-error">
            {form.formState.errors.flight_number.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="total_capacity">
          Total capacity
        </label>
        <Input
          id="total_capacity"
          type="number"
          min={1}
          max={500}
          {...form.register("total_capacity", { valueAsNumber: true })}
        />
        {form.formState.errors.total_capacity && (
          <p className="field-error">
            {form.formState.errors.total_capacity.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="origin_id">
          Origin
        </label>
        <select
          id="origin_id"
          className={selectClass}
          {...form.register("origin_id")}
        >
          {airports.data?.data.map((airport) => (
            <option value={airport.id} key={airport.id}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </select>
        {form.formState.errors.origin_id && (
          <p className="field-error">
            {form.formState.errors.origin_id.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="destination_id">
          Destination
        </label>
        <select
          id="destination_id"
          className={selectClass}
          {...form.register("destination_id")}
        >
          {airports.data?.data.map((airport) => (
            <option value={airport.id} key={airport.id}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </select>
        {form.formState.errors.destination_id && (
          <p className="field-error">
            {form.formState.errors.destination_id.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="departure_at">
          Departure date and time
        </label>
        <Input
          id="departure_at"
          type="datetime-local"
          {...form.register("departure_at")}
        />
        {form.formState.errors.departure_at && (
          <p className="field-error">
            {form.formState.errors.departure_at.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="arrival_at">
          Arrival date and time
        </label>
        <Input
          id="arrival_at"
          type="datetime-local"
          {...form.register("arrival_at")}
        />
        {form.formState.errors.arrival_at && (
          <p className="field-error">
            {form.formState.errors.arrival_at.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="price_cents">
          Fare (CAD cents)
        </label>
        <Input
          id="price_cents"
          type="number"
          min={100}
          step={100}
          {...form.register("price_cents", { valueAsNumber: true })}
        />
        {form.formState.errors.price_cents && (
          <p className="field-error">
            {form.formState.errors.price_cents.message}
          </p>
        )}
      </div>
      <div className="flex items-end">
        <p className="pb-3 text-sm font-semibold text-navy/70">
          Times use your local device timezone and are stored as exact instants.
        </p>
      </div>
      {serverError && (
        <p
          className="rounded-xl bg-destructive/10 p-4 font-bold text-destructive sm:col-span-2"
          role="alert"
        >
          {serverError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={submitting || airports.isLoading}
        >
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
