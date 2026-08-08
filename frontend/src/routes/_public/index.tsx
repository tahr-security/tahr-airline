import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Leaf, MapPin, ShieldCheck } from "lucide-react"
import { FlightCard } from "@/components/FlightCard"
import { type FlightSearch, SearchForm } from "@/components/SearchForm"
import { api } from "@/lib/api"
import { tomorrowISO } from "@/lib/format"

export const Route = createFileRoute("/_public/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Tahr Air — Friendly Canadian flights" },
      {
        name: "description",
        content:
          "Search and book simple one-way flights across Canada and to New York.",
      },
    ],
  }),
})

function HomePage() {
  const navigate = useNavigate()
  const defaults = {
    origin: "YUL",
    destination: "YYZ",
    departure_date: tomorrowISO(),
  }
  const preview = useQuery({
    queryKey: ["flight-preview", defaults],
    queryFn: () => api.searchFlights(defaults),
  })
  const search = (values: FlightSearch) =>
    navigate({ to: "/flights", search: values })

  return (
    <>
      <section className="relative isolate overflow-hidden bg-cloud">
        <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-[linear-gradient(150deg,transparent_35%,rgba(59,154,217,.16)_35%,rgba(59,154,217,.16)_55%,rgba(22,50,79,.10)_55%)]" />
        <div className="page-container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow">Small airline. Big-hearted journeys.</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Fly easy, <span className="text-sky-ink">land happy.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-navy/70">
              Straightforward fares and warm Canadian service, with no account
              needed.
            </p>
          </div>
          <svg
            viewBox="0 0 560 360"
            className="w-full"
            role="img"
            aria-label="A Tahr Air plane flying over mountains"
          >
            <path
              d="M0 310 95 165l62 85 60-103 55 87 72-130 84 131 55-73 77 148H0Z"
              fill="#DCEFFA"
            />
            <path
              d="M0 326 102 229l47 44 68-89 66 86 64-94 72 77 61-55 80 128H0Z"
              fill="#3B9AD9"
              opacity=".6"
            />
            <path
              d="M125 128 251 104 354 44c21-12 42 12 26 31l-62 73 97 35-17 27-134-17-53 63-33-3 25-78-88-22 10-25Z"
              fill="#F47C6C"
            />
            <path
              d="m217 260 20-17 21 3 12 19-11 25-13 3-8-18-21 10-14-7 14-18Z"
              fill="#16324F"
            />
            <path d="m229 246-7-18 11 5 8-9 4 22" fill="#16324F" />
          </svg>
        </div>
      </section>

      <section
        className="page-container -mt-2"
        aria-labelledby="search-heading"
      >
        <div className="surface p-5 sm:p-7">
          <h2 id="search-heading" className="mb-5 text-2xl font-black">
            Where are you headed?
          </h2>
          <SearchForm initialValues={defaults} onSubmit={search} />
        </div>
      </section>

      <section
        className="page-container py-16"
        aria-labelledby="upcoming-heading"
      >
        <p className="eyebrow">Taking off tomorrow</p>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 id="upcoming-heading" className="text-3xl font-black sm:text-4xl">
            Montréal to Toronto
          </h2>
          <button
            type="button"
            onClick={() => search(defaults)}
            className="min-h-11 rounded-lg px-3 font-extrabold text-sky-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50"
          >
            See all flights
          </button>
        </div>
        <div className="grid gap-5 lg:grid-cols-2" aria-live="polite">
          {preview.data?.data.slice(0, 2).map((flight) => (
            <FlightCard flight={flight} preview key={flight.id} />
          ))}
          {!preview.isLoading && preview.data?.count === 0 && (
            <p className="surface p-6 font-semibold text-navy/70">
              More flights are on their way. Search another date to keep
              exploring.
            </p>
          )}
        </div>
      </section>

      <section
        className="bg-navy py-16 text-white"
        aria-labelledby="why-heading"
      >
        <div className="page-container">
          <p className="eyebrow !text-coral">The Tahr Air way</p>
          <h2 id="why-heading" className="text-3xl font-black sm:text-4xl">
            Less fuss. More sky.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              [
                MapPin,
                "Clear choices",
                "A small network with flight details that make sense.",
              ],
              [
                ShieldCheck,
                "Book with confidence",
                "Immediate confirmation and simple self-service cancellation.",
              ],
              [
                Leaf,
                "Human-sized travel",
                "Friendly routes connecting communities across Canada.",
              ],
            ].map(([Icon, title, copy]) => {
              const TileIcon = Icon as typeof MapPin
              return (
                <article
                  className="rounded-2xl bg-white/8 p-6"
                  key={String(title)}
                >
                  <TileIcon
                    className="mb-4 size-8 text-coral"
                    aria-hidden="true"
                  />
                  <h3 className="text-xl font-black">{String(title)}</h3>
                  <p className="mt-2 leading-7 text-white/75">{String(copy)}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
