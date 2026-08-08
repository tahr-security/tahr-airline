# Architecture and API

## Components

The React application is compiled into the FastAPI image and served from the
same origin. TanStack Query calls an OpenAPI-generated client. FastAPI validates
requests, SQLModel maps domain records, Alembic owns schema evolution, and
PostgreSQL stores users, airports, flights, and bookings.

The `prestart` command is safe to retry: it waits for PostgreSQL, upgrades to
the current schema, creates the configured first superuser if absent, upserts
the airport catalog, and seeds flights only into an empty flight table.

## Booking consistency

Capacity changes occur in one PostgreSQL transaction. Code locks the flight row
before any booking row. Booking decrements capacity exactly once. Cancellation
increments it only on the first confirmed-to-cancelled transition. Flight
cancellation cancels confirmed bookings and restores all capacity. Capacity
edits derive available seats from confirmed bookings.

This lock order and database constraints are part of the application contract.

## Public API

- `GET /api/v1/airports`
- `GET /api/v1/flights/search`
- `GET /api/v1/flights/{flight_id}`
- `POST /api/v1/bookings`
- `POST /api/v1/bookings/lookup`
- `POST /api/v1/bookings/cancel`

Booking lookup and cancellation accept reference plus normalized passenger
email in a JSON body. A mismatch returns one generic not-found response.

## Administrator API

All `/api/v1/admin` operations require an active superuser bearer token:

- statistics
- paginated flight list, detail, creation, update, cancellation, and deletion
- paginated booking list and booking status update

Login remains `POST /api/v1/login/access-token`; self read and password change
remain under `/api/v1/users/me`. Public signup and password recovery are not
available.

## State and error semantics

Lists return `{data, count}` and validate `skip` and `limit`. Missing resources
return 404. Capacity conflicts and invalid state transitions return 409.
FastAPI validation errors retain the standard 422 shape. A scheduled flight
whose departure time is past is presented as departed without a mutable
departed database state.
