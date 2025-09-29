# Stage 1 – Environment & Credential Checklist

This document captures the mandatory prerequisites for running the Stage 1 services.
Keep private values (API keys, secrets) out of version control and load them through
Devvit Secrets in production or `.env.local` during local development.

## 1. Platform Tooling

- **Node.js**: v22.x (matches Devvit runtime).
- **npm**: v10.x ( ships with Node 22 ).
- **Devvit CLI**: `npm install -g devvit` and run `devvit login --copy-paste`.
- **Redis**: No local instance required; use Devvit-provided `redis` binding.

## 2. Environment Variables

| Variable | Description | Required | Notes |
| --- | --- | --- | --- |
| `GOOGLE_SHEETS_API_KEY` | API key with read access to the content spreadsheet. | ✅ | Generate in Google Cloud Console → Credentials. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Spreadsheet ID that hosts the spectrum prompts. | ✅ | Copy from the sheet URL (`/spreadsheets/d/<id>/`). |
| `GOOGLE_SHEETS_RANGE` | A1 range to fetch. | ✅ | Example: `Content!A:D` for `<Left_Label, Right_Label, Difficulty, Category>`. |
| `GOOGLE_SHEETS_CACHE_TTL_MINUTES` | Minutes between refreshes of cached spectra. | ⛔️ (defaults to 15) | Optional override for rapid testing. |

### Local Development

Create a `.env.local` file at the repo root (git-ignored) and add the variables:

```
GOOGLE_SHEETS_API_KEY="<temp dev api key>"
GOOGLE_SHEETS_SPREADSHEET_ID="<sheet id>"
GOOGLE_SHEETS_RANGE="Content!A:D"
GOOGLE_SHEETS_CACHE_TTL_MINUTES="15"
```

Load them for local runs (e.g., `dotenv -e .env.local -- npm run dev`).

### Devvit Deployment

- Open the app in `devvit.dev → Secrets` and add the same variables.
- Avoid storing secrets in `devvit.json`; rely on secrets manager for production keys.
- Rotate keys when contributors leave the project.

## 3. Credential Handling Guidelines

- Store Google credentials in the secrets manager, never in repository files.
- Audit secret usage quarterly; revoke unused keys.
- Document incidents/changes in `docs/Bug_tracking.md` when credential issues appear.

## 4. Redis Usage Notes

- Redis commands must be called within Devvit request context (`@devvit/web/server`).
- Supported command set: strings, hashes, sorted sets, counters. Sets/Lists are not available.
- All Stage 1 services rely on hash keys defined in `src/server/core/redis/keys.ts`.

## 5. Google Sheets Access Policies

- Spreadsheet must be shared with the API key/service account in read-only mode.
- Ensure column order: `Left_Label`, `Right_Label`, `Difficulty`, `Category`.
- Missing or malformed rows are ignored and logged by the content loader.

## 6. Verification Checklist

- [ ] Devvit CLI authenticated (`devvit whoami`).
- [ ] `.env.local` populated and excluded from git.
- [ ] Secrets configured in Devvit dashboard.
- [ ] Google Sheets access verified with a curl request.
- [ ] Redis operations verified via `npm run test` (Stage 1 test suite calls mock Redis).


