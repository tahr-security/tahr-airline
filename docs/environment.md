# Environment reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | yes | `local`, `staging`, or `production`; production rejects known placeholder secrets. |
| `PROJECT_NAME` | yes | FastAPI/OpenAPI title. Defaults to `Tahr Air` in Compose. |
| `SECRET_KEY` | yes | Random JWT signing secret. Never reuse another password. |
| `FIRST_SUPERUSER` | yes | Bootstrap administrator email; defaults to `demo-admin@tahr.ca`. |
| `FIRST_SUPERUSER_PASSWORD` | yes | Bootstrap password. Retry does not replace an existing user. |
| `POSTGRES_SERVER` | yes | PostgreSQL hostname; fixed to `db` in Compose. |
| `POSTGRES_PORT` | yes | PostgreSQL port; defaults to `5432`. |
| `POSTGRES_DB` | yes | Database name. |
| `POSTGRES_USER` | yes | Database role. |
| `POSTGRES_PASSWORD` | yes | Database password. |
| `FRONTEND_HOST` | yes | Canonical browser origin. |
| `BACKEND_CORS_ORIGINS` | no | Comma-separated or JSON-list allowed origins. |
| `APP_BIND_ADDRESS` | no | Host address for Compose; defaults to loopback. |
| `APP_PORT` | no | Host application port; defaults to `8000`. |
| `TAHR_AIR_IMAGE` | yes | Exact application image reference. The example uses `tahr-airline:local` only for an explicitly local build. |
| `POSTGRES_VOLUME` | no | Explicit named PostgreSQL volume. |
| `TAHR_AIR_NETWORK` | no | Explicit named target network. |

Generate secrets with a cryptographically secure generator:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Do not log, commit, place in build arguments, or send provider credentials to a
target container. `.env.example` documents names only; `.env` is ignored.
