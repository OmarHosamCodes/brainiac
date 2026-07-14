# Sentry Observability Setup

Orch sends frontend and backend errors into one Sentry project. Tracing is enabled; session replay and Sentry logs are intentionally off for the initial rollout.

## Create the Sentry project

1. Open [Sentry Projects](https://sentry.io/settings/projects/) for the `school-of-marketing` organization.
2. Create one JavaScript project named `orch` (or reuse an existing single shared project).
3. Copy the project DSN and Client Keys.

## Railway / deployment variables

Set these on the Railway service that builds and runs Orch:

| Variable                 | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `VITE_PUBLIC_SENTRY_DSN` | Browser SDK DSN (public)                                             |
| `SENTRY_DSN`             | Server SDK DSN (same project)                                        |
| `SENTRY_ORG`             | `school-of-marketing`                                                |
| `SENTRY_PROJECT`         | Project slug, e.g. `orch`                                            |
| `SENTRY_AUTH_TOKEN`      | Secret auth token with `project:releases` / source map upload scopes |
| `SENTRY_ENVIRONMENT`     | Optional override; defaults to `NODE_ENV` / production               |
| `SENTRY_RELEASE`         | Optional override; defaults to `RAILWAY_GIT_COMMIT_SHA`              |

`RAILWAY_GIT_COMMIT_SHA` is already used as the web build id and becomes the shared release identifier.

## Local development

Leave DSN values empty in `.env` files. The SDKs stay disabled without a DSN, and production builds skip source map upload without auth credentials.

## Verification checklist

1. Deploy with DSN + auth token configured.
2. Trigger one synthetic browser exception and one synthetic server exception.
3. Confirm both appear in the same Sentry project with the Railway release and readable frames.
4. Remove any temporary trigger routes/buttons after verification.
