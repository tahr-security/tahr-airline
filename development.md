# Tahr Air development

## Prerequisites

- Python 3.14
- uv 0.11.18 or compatible
- Bun 1.3.12 or compatible
- PostgreSQL 18, or Docker with Compose v2

Copy `.env.example` to `.env` and replace every `changethis` value. Local
configuration remains untracked.

## Full stack in containers

```bash
docker compose -f compose.production.yml up --build --wait
docker compose -f compose.production.yml logs -f app
```

The application is on <http://localhost:8000>. PostgreSQL has no published
host port.

## Live backend and frontend

Start a local PostgreSQL 18 service. Set `POSTGRES_SERVER=localhost` in `.env`
when the backend runs on the host.

```bash
uv sync --frozen --all-packages
cd backend
uv run bash scripts/prestart.sh
uv run fastapi dev app/main.py
```

In another terminal:

```bash
bun install --frozen-lockfile
bun run dev
```

Vite runs on <http://localhost:5173> and proxies API requests according to its
configuration.

## Generated client

The TypeScript client is generated from the application schema:

```bash
bash scripts/generate-client.sh
```

Commit `frontend/openapi.json` and `frontend/src/client` when an API change
alters them. CI regenerates both and fails on drift.

## Verification

```bash
cd backend
uv run bash scripts/lint.sh
uv run coverage run -m pytest tests
uv run coverage report --fail-under=85

cd ../frontend
bunx biome check --no-errors-on-unmatched --files-ignore-unknown=true ./
bun run build
bunx playwright test
```

Container verification uses the same immutable Compose definition as CI:

```bash
docker compose -f compose.production.yml config --quiet
docker compose -f compose.production.yml build app
docker compose -f compose.production.yml up -d --wait
curl --fail http://localhost:8000/api/v1/utils/health-check/
docker compose -f compose.production.yml down --volumes
```
