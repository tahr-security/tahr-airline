# Contributing to Tahr Air

Keep changes focused, tested, and free of secrets. Open an issue before a
large product, schema, authentication, or deployment change.

## Development

Follow [development.md](development.md). Do not commit `.env`, database dumps,
browser artifacts, coverage output, credentials, SBOM output, or private keys.

Before opening a pull request, run:

```bash
cd backend
uv run bash scripts/lint.sh
uv run coverage run -m pytest tests
uv run coverage report --fail-under=85
cd ../frontend
bunx biome check --no-errors-on-unmatched --files-ignore-unknown=true ./
bun run build
```

Run `bash scripts/generate-client.sh` after API changes and commit the resulting
OpenAPI document and generated client. Run Playwright for user-facing changes.

## Pull requests

- Explain user-visible behavior and important design decisions.
- Add tests for success, failure, authorization, and concurrency behavior.
- Keep public request and response validators explicit.
- Preserve the initial-superuser login contract used by Wardenn.
- Preserve lock order for capacity transitions: flight first, booking second.
- Never weaken container restrictions or expose PostgreSQL.
- Update docs when an interface, environment variable, or operator step changes.

Publishing images, changing GitHub settings, and deploying infrastructure are
maintainer-only actions performed after explicit approval.
