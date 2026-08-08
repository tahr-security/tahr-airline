import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
const airports = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    code: "YUL",
    city: "Montréal",
    country: "Canada",
    name: "Montréal–Trudeau",
    timezone: "America/Toronto",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    code: "YYZ",
    city: "Toronto",
    country: "Canada",
    name: "Toronto Pearson",
    timezone: "America/Toronto",
  },
]
const flight = {
  id: "20000000-0000-4000-8000-000000000001",
  flight_number: "TA101",
  origin: airports[0],
  destination: airports[1],
  departure_at: `${tomorrow}T13:00:00Z`,
  arrival_at: `${tomorrow}T14:20:00Z`,
  price_cents: 12900,
  currency: "CAD",
  total_capacity: 36,
  available_capacity: 12,
  status: "scheduled",
  effective_status: "scheduled",
}
const booking = {
  id: "30000000-0000-4000-8000-000000000001",
  booking_reference: "TAH-7C8D9E2F3G4H5",
  flight,
  passenger_name: "Avery Tahr",
  passenger_email: "avery@example.com",
  status: "confirmed",
  booked_price_cents: 12900,
  currency: "CAD",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

async function mockApi(page: Page) {
  let currentFlight = { ...flight }
  let currentBooking = { ...booking }
  let flightDeleted = false
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()
    let body: unknown = {}
    if (path.endsWith("/airports"))
      body = { data: airports, count: airports.length }
    else if (path.endsWith("/flights/search"))
      body = { data: [currentFlight], count: 1 }
    else if (path === `/api/v1/flights/${flight.id}`) body = currentFlight
    else if (path.endsWith("/bookings") && method === "POST")
      body = currentBooking
    else if (path.endsWith("/bookings/lookup")) body = currentBooking
    else if (path.endsWith("/bookings/cancel")) {
      currentBooking = { ...currentBooking, status: "cancelled" }
      body = currentBooking
    } else if (path.endsWith("/login/access-token"))
      body = { access_token: "test-token", token_type: "bearer" }
    else if (path.endsWith("/users/me"))
      body = {
        id: "40000000-0000-4000-8000-000000000001",
        email: "wardenn-admin@tahr.ca",
        full_name: "Wardenn Admin",
        is_active: true,
        is_superuser: true,
      }
    else if (path.endsWith("/admin/stats"))
      body = {
        scheduled_future_flights: 12,
        confirmed_bookings: 8,
        seats_sold: 8,
        seats_available: 424,
        load_factor: 1.85,
      }
    else if (path.endsWith("/admin/flights") && method === "POST") {
      const input = route.request().postDataJSON()
      currentFlight = {
        ...currentFlight,
        ...input,
        origin:
          airports.find((airport) => airport.id === input.origin_id) ??
          currentFlight.origin,
        destination:
          airports.find((airport) => airport.id === input.destination_id) ??
          currentFlight.destination,
        available_capacity: input.total_capacity,
        status: "scheduled",
        effective_status: "scheduled",
      }
      flightDeleted = false
      body = currentFlight
    } else if (path.endsWith("/admin/flights") && method === "GET")
      body = flightDeleted
        ? { data: [], count: 0 }
        : { data: [currentFlight], count: 1 }
    else if (
      path.endsWith(`/admin/flights/${flight.id}/cancel`) &&
      method === "POST"
    ) {
      currentFlight = {
        ...currentFlight,
        status: "cancelled",
        effective_status: "cancelled",
        available_capacity: currentFlight.total_capacity,
      }
      body = currentFlight
    } else if (path.endsWith(`/admin/flights/${flight.id}`)) {
      if (method === "PATCH") {
        const input = route.request().postDataJSON()
        currentFlight = { ...currentFlight, ...input }
        body = currentFlight
      } else if (method === "DELETE") {
        flightDeleted = true
        body = { message: "Flight deleted" }
      } else body = currentFlight
    } else if (path.endsWith("/admin/bookings") && method === "GET")
      body = { data: [currentBooking], count: 1 }
    else if (
      path.endsWith(`/admin/bookings/${booking.id}`) &&
      method === "PATCH"
    ) {
      const input = route.request().postDataJSON()
      currentBooking = { ...currentBooking, status: input.status }
      body = currentBooking
    } else return route.fulfill({ status: 404, json: { detail: "Not found" } })
    return route.fulfill({
      status: path.endsWith("/bookings") ? 201 : 200,
      json: body,
    })
  })
}

test.beforeEach(async ({ page }) => mockApi(page))

test("searches and books a flight without an account", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /fly easy/i })).toBeVisible()
  await page.getByRole("button", { name: "Search flights" }).click()
  await expect(page).toHaveURL(/\/flights\?/)
  await page.getByRole("link", { name: "Select flight" }).click()
  await page.getByLabel("Full name").fill("Avery Tahr")
  await page.getByLabel("Email address").fill("avery@example.com")
  await page.getByRole("button", { name: "Confirm booking" }).click()
  await expect(
    page.getByRole("heading", { name: /ready for takeoff/i }),
  ).toBeVisible()
  await expect(page.getByTestId("booking-reference")).toHaveText(
    booking.booking_reference,
  )
  await expect(page).not.toHaveURL(/avery|TAH-/i)
})

test("looks up and cancels a booking", async ({ page }) => {
  await page.goto("/manage")
  await page.getByLabel("Booking reference").fill(booking.booking_reference)
  await page.getByLabel("Passenger email").fill(booking.passenger_email)
  await page.getByRole("button", { name: "Find booking" }).click()
  await expect(page.getByText(booking.passenger_name)).toBeVisible()
  await page.getByRole("button", { name: "Cancel booking" }).click()
  await expect(
    page.getByText("Booking cancelled. Your seat has been released."),
  ).toBeVisible()
})

test("shows sold-out and generic lookup failure states", async ({ page }) => {
  await page.route(`**/api/v1/flights/${flight.id}`, (route) =>
    route.fulfill({
      status: 200,
      json: { ...flight, available_capacity: 0 },
    }),
  )
  await page.goto(`/flights/${flight.id}`)
  await expect(
    page.getByRole("button", { name: "Flight unavailable" }),
  ).toBeDisabled()

  await page.route("**/api/v1/bookings/lookup", (route) =>
    route.fulfill({ status: 404, json: { detail: "Booking not found" } }),
  )
  await page.goto("/manage")
  await page.getByLabel("Booking reference").fill(booking.booking_reference)
  await page.getByLabel("Passenger email").fill(booking.passenger_email)
  await page.getByRole("button", { name: "Find booking" }).click()
  await expect(
    page.getByText(
      "Booking details did not match. Check both fields and try again.",
    ),
  ).toBeVisible()
})

test("staff login opens protected operations dashboard", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("wardenn-admin@tahr.ca")
  await page.getByTestId("password-input").fill("correct-horse-battery-staple")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/admin/)
  await expect(
    page.getByRole("heading", { name: "Good day, crew." }),
  ).toBeVisible()
  await expect(
    page.getByText("Upcoming flights", { exact: true }),
  ).toBeVisible()
})

test("staff creates, edits, cancels, and deletes a flight", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("access_token", "test-token"),
  )
  await page.goto("/admin/flights/new")
  await page.getByLabel("Flight number").fill("TA777")
  await page.getByLabel("Departure date and time").fill("2030-06-10T09:00")
  await page.getByLabel("Arrival date and time").fill("2030-06-10T10:15")
  await page.getByRole("button", { name: "Create flight" }).click()
  await expect(page).toHaveURL(/\/admin\/flights$/)
  await expect(page.getByText("TA777", { exact: true })).toBeVisible()

  await page.getByRole("link", { name: "Edit TA777" }).click()
  await page.getByLabel("Fare (CAD cents)").fill("19900")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page).toHaveURL(/\/admin\/flights$/)
  await expect(page.getByText("$199", { exact: true })).toBeVisible()

  page.on("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Cancel TA777" }).click()
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Delete TA777" }).click()
  await expect(
    page.getByRole("heading", { name: "No flights yet" }),
  ).toBeVisible()
})

test("staff cancels and reconfirms a booking", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("access_token", "test-token"),
  )
  await page.goto("/admin/bookings")
  await expect(page.getByText(booking.booking_reference)).toBeVisible()
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByRole("button", { name: "Reconfirm" })).toBeVisible()
  await page.getByRole("button", { name: "Reconfirm" }).click()
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
})

test("keyboard users can skip to main content", async ({ page }) => {
  await page.goto("/")
  const skipLink = page.getByRole("link", { name: "Skip to content" })
  await expect(skipLink).toBeAttached()
  await page.keyboard.press("Tab")
  await expect(skipLink).toBeFocused()
})

test("major public pages have no automated accessibility violations", async ({
  page,
}) => {
  const pages = [
    ["/", /fly easy/i],
    [
      `/flights?origin=YUL&destination=YYZ&departure_date=${tomorrow}`,
      /YUL to YYZ/i,
    ],
    ["/manage", /manage your booking/i],
    ["/login", /staff login/i],
  ] as const

  for (const [path, heading] of pages) {
    await page.goto(path)
    await expect(page.getByRole("heading", { name: heading })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, `${path} accessibility violations`).toEqual([])
  }
})

test("staff overview has no automated accessibility violations", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("access_token", "test-token"),
  )
  await page.goto("/admin")
  await expect(
    page.getByRole("heading", { name: "Good day, crew." }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
