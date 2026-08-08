# Tahr Air container and release guide

Tahr Air ships as one application image plus PostgreSQL. FastAPI serves the
built frontend and `/api/v1` on port 8000. A one-shot prestart container waits
for PostgreSQL, applies migrations, creates the initial administrator, and
seeds airports and future flights before the application starts.

## Runtime contract

- Application and prestart run as UID/GID `10001:10001`.
- Root filesystems are read-only; bounded `/tmp` tmpfs is writable.
- All Linux capabilities are dropped and `no-new-privileges` is enabled.
- PostgreSQL is non-root, has a named data volume, and has no published port.
- Health is database-aware at `/api/v1/utils/health-check/`.
- The application listens on `0.0.0.0:8000` inside the container.

Validate rendered configuration before starting it:

```bash
docker compose -f compose.production.yml config --quiet
docker compose -f compose.production.yml up --build --wait
```

Supply real secrets through the operator's secret manager or environment.
Never bake an `.env` file into the image.
Production must set `TAHR_AIR_IMAGE` to a registry reference containing an
`@sha256:` digest. The Compose file pins PostgreSQL to its verified multi-arch
digest and has no mutable application-image default.

## Publication

`.github/workflows/publish.yml` accepts only `vMAJOR.MINOR.PATCH` tags. It calls
the complete CI workflow first. Publication then pauses at the protected
`ghcr-production` environment. An authorized reviewer must approve the job.

After approval, Buildx publishes only `linux/amd64` with two immutable tags:

- `ghcr.io/tahr-security/tahr-airline:MAJOR.MINOR.PATCH`
- `ghcr.io/tahr-security/tahr-airline:sha-COMMIT_SHA`

The build attaches maximum provenance and an SBOM in the registry. It records
the registry-returned digest in the workflow summary and retained metadata
artifact. It never publishes `latest`.

Creating or pushing a release tag, approving the protected environment,
changing GHCR visibility, and onboarding the returned digest into Wardenn each
require separate explicit approval. Do not invent or prefill an image digest.

## Release evidence

Before Wardenn onboarding, record:

- source commit and pinned upstream template commit
- application, prestart, and PostgreSQL exact image digests
- manifest hash and registry platform inspection
- provenance/SBOM and vulnerability scan summary
- license and NOTICE review
- prestart, health, restart-persistence, and browser smoke results
- clean classification and operator approvals

Wardenn deployment and catalog synchronization are outside this repository and
must not run from this release workflow.
