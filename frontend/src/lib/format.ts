import type { Flight } from "@/lib/api"

export const formatMoney = (cents: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)

export const formatFlightTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso))

export const formatFlightDate = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(iso))

export const flightDuration = (flight: Flight) => {
  const totalMinutes = Math.round(
    (new Date(flight.arrival_at).getTime() -
      new Date(flight.departure_at).getTime()) /
      60_000,
  )
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours ? `${hours}h ` : ""}${minutes}m`
}

export const tomorrowISO = () => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export const toLocalInputValue = (iso: string) => {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
