import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Search } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { tomorrowISO } from "@/lib/format"

const searchSchema = z
  .object({
    origin: z.string().length(3, "Choose an origin"),
    destination: z.string().length(3, "Choose a destination"),
    departure_date: z.string().min(1, "Choose a departure date"),
  })
  .refine((value) => value.origin !== value.destination, {
    message: "Origin and destination must be different",
    path: ["destination"],
  })

export type FlightSearch = z.infer<typeof searchSchema>

export function SearchForm({
  initialValues,
  onSubmit,
  compact = false,
}: {
  initialValues?: FlightSearch
  onSubmit: (values: FlightSearch) => void
  compact?: boolean
}) {
  const airports = useQuery({
    queryKey: ["airports"],
    queryFn: () => api.airports(),
  })
  const form = useForm<FlightSearch>({
    resolver: zodResolver(searchSchema),
    defaultValues: initialValues ?? {
      origin: "YUL",
      destination: "YYZ",
      departure_date: tomorrowISO(),
    },
  })

  useEffect(() => {
    if (!airports.data?.data.length) return
    form.reset(
      initialValues ?? {
        origin: "YUL",
        destination: "YYZ",
        departure_date: tomorrowISO(),
      },
    )
  }, [airports.data, form, initialValues])

  const selectClass =
    "min-h-11 w-full rounded-xl border border-input bg-cloud px-3 text-sm font-bold shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  return (
    <form
      aria-label="Search flights"
      onSubmit={form.handleSubmit(onSubmit)}
      className={`grid items-end gap-4 ${compact ? "md:grid-cols-[1fr_auto_1fr_1fr_auto]" : "lg:grid-cols-[1fr_auto_1fr_1.15fr_auto]"}`}
    >
      <div>
        <label className="field-label" htmlFor="origin">
          From
        </label>
        <select
          id="origin"
          className={selectClass}
          {...form.register("origin")}
        >
          {airports.data?.data.map((airport) => (
            <option value={airport.code} key={airport.id}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </select>
        {form.formState.errors.origin && (
          <p className="field-error">{form.formState.errors.origin.message}</p>
        )}
      </div>
      <ArrowRight
        className="mb-3 hidden text-sky-ink md:block"
        aria-hidden="true"
      />
      <div>
        <label className="field-label" htmlFor="destination">
          To
        </label>
        <select
          id="destination"
          className={selectClass}
          {...form.register("destination")}
        >
          {airports.data?.data.map((airport) => (
            <option value={airport.code} key={airport.id}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </select>
        {form.formState.errors.destination && (
          <p className="field-error">
            {form.formState.errors.destination.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="departure_date">
          Depart
        </label>
        <Input
          id="departure_date"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          {...form.register("departure_date")}
        />
        {form.formState.errors.departure_date && (
          <p className="field-error">
            {form.formState.errors.departure_date.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full bg-coral text-navy hover:bg-coral/90 lg:w-auto"
      >
        <Search aria-hidden="true" /> Search flights
      </Button>
      {airports.isError && (
        <p className="field-error md:col-span-full" role="alert">
          Airports could not be loaded. Refresh and try again.
        </p>
      )}
    </form>
  )
}
