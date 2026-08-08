import { AxiosError } from "axios"
import type {
  AirportPublic,
  BookingCreate,
  BookingLookup,
  BookingPublic,
  FlightCreate,
  FlightPublic,
  FlightUpdate,
  AdminStats as GeneratedAdminStats,
  BookingStatus as GeneratedBookingStatus,
  EffectiveFlightStatus as GeneratedEffectiveFlightStatus,
  FlightStatus as GeneratedFlightStatus,
} from "@/client"
import {
  AdminService,
  AirportsService,
  BookingsService,
  FlightsService,
} from "@/client"

export type Airport = AirportPublic
export type Flight = FlightPublic
export type Booking = BookingPublic
export type AdminStats = GeneratedAdminStats
export type BookingStatus = GeneratedBookingStatus
export type FlightStatus = GeneratedFlightStatus
export type EffectiveFlightStatus = GeneratedEffectiveFlightStatus
export type FlightInput = FlightCreate

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type GeneratedResponse<T> = { data: T }

function apiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)
      ?.detail
    return new ApiError(
      typeof detail === "string"
        ? detail
        : "Something went wrong. Please try again.",
      error.response?.status ?? 0,
    )
  }
  return new ApiError("Something went wrong. Please try again.", 0)
}

async function dataOf<T>(
  response: PromiseLike<GeneratedResponse<T>>,
): Promise<T> {
  try {
    return (await response).data
  } catch (error) {
    throw apiError(error)
  }
}

export const api = {
  airports: (skip = 0, limit = 100) =>
    dataOf(AirportsService.listAirports({ query: { skip, limit } })),
  searchFlights: (filters: {
    origin: string
    destination: string
    departure_date: string
  }) => dataOf(FlightsService.searchFlights({ query: filters })),
  flight: (id: string) =>
    dataOf(FlightsService.getFlight({ path: { flight_id: id } })),
  createBooking: (body: BookingCreate) =>
    dataOf(BookingsService.createBooking({ body })),
  lookupBooking: (body: BookingLookup) =>
    dataOf(BookingsService.lookupBooking({ body })),
  cancelBooking: (body: BookingLookup) =>
    dataOf(BookingsService.cancelPublicBooking({ body })),
  admin: {
    stats: () => dataOf(AdminService.getStats()),
    flights: (skip = 0, limit = 100) =>
      dataOf(AdminService.listFlights({ query: { skip, limit } })),
    flight: (id: string) =>
      dataOf(AdminService.getAdminFlight({ path: { flight_id: id } })),
    createFlight: (body: FlightCreate) =>
      dataOf(AdminService.createFlight({ body })),
    updateFlight: (id: string, body: FlightUpdate) =>
      dataOf(AdminService.updateFlight({ path: { flight_id: id }, body })),
    cancelFlight: (id: string) =>
      dataOf(AdminService.cancelAdminFlight({ path: { flight_id: id } })),
    deleteFlight: (id: string) =>
      dataOf(AdminService.deleteFlight({ path: { flight_id: id } })),
    bookings: (skip = 0, limit = 100) =>
      dataOf(AdminService.listBookings({ query: { skip, limit } })),
    updateBooking: (id: string, status: GeneratedBookingStatus) =>
      dataOf(
        AdminService.updateBookingStatus({
          path: { booking_id: id },
          body: { status },
        }),
      ),
  },
}
