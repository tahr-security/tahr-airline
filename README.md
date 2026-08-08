# Tahr Air

Tahr Air is a clean, realistic airline booking application for disposable
security-testing environments. Travellers can search one-way flights, book one
passenger without an account, retrieve a booking by reference and email, and
cancel it. Staff use the preserved FastAPI administrator bootstrap to manage
flights, capacity, and bookings.

No payment, customer account, external airline API, or email delivery is part
of version 1.0.0.

## Stack

- FastAPI, SQLModel, Alembic, and PostgreSQL
- React 19, TypeScript, TanStack Router/Query, Tailwind, and Radix UI
- OpenAPI-generated TypeScript client
- Pytest and Playwright
- Hardened multi-stage Docker image serving frontend and API on port 8000

## Run with Docker

Requires Docker with Compose v2.

```bash
cp .env.example .env
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Put independent generated values in `.env` for `SECRET_KEY`,
`FIRST_SUPERUSER_PASSWORD`, and `POSTGRES_PASSWORD`, then start the stack:

```bash
docker compose -f compose.production.yml up --build --wait
```

Open:

- Application: <http://localhost:8000>
- OpenAPI document: <http://localhost:8000/api/v1/openapi.json>
- Swagger UI: <http://localhost:8000/docs>
- Database-aware health check: <http://localhost:8000/api/v1/utils/health-check/>

The initial administrator email defaults to `wardenn-admin@tahr.ca`. Stop and
remove local data with:

```bash
docker compose -f compose.production.yml down --volumes
```

## Application routes

Public pages are `/`, `/flights`, `/flights/:flightId`, and `/manage`. Staff
pages are `/login`, `/admin`, `/admin/flights`, and `/admin/bookings`.

Public API operations live under `/api/v1/airports`, `/api/v1/flights`, and
`/api/v1/bookings`. Administrator operations live under `/api/v1/admin` and
require an active superuser JWT. Booking references and passenger emails are
sent in request bodies, never URLs.

## Documentation

- [Development guide](development.md)
- [Architecture and API](docs/architecture.md)
- [Environment reference](docs/environment.md)
- [Container and release guide](deployment.md)
- [Contribution guide](CONTRIBUTING.md)

## Security and release boundary

The repository contains no deployment credentials. `.env` is ignored. A
release tag runs all verification before the `ghcr-production` protected
environment can publish a single `linux/amd64` image with provenance and SBOM
attestations. Creating a tag, approving publication, changing package
visibility, and consuming the digest in Wardenn are separate operator actions.

## Attribution and license

Tahr Air is based on Full Stack FastAPI Template commit
`d506ea4883c0f7bfcf5280921cfc407c46808711`. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
