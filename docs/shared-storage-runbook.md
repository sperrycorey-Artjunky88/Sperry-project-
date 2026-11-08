# Shared storage: operation and deployment gates

## Source status

This phase connects the retained interface, revision-checked client, authenticated API and SQL store into a working flow. It is tested through the built Worker using synthetic identity and SQLite. It is not deployed. Production still runs Sites version 2 with browser-local records and manual AI handoffs.

## What the owner sees after an approved shared deployment

- Storage defaults to **This browser**. Opening the app makes no task upload and no shared request until the owner chooses shared storage. Existing localStorage migration and recovery remain available.
- **Storage → Check shared storage** reads availability and counts. **Use shared workspace without uploading** selects existing shared work and leaves all local records untouched.
- To move local work, **Download local backup**, check that the JSON file was saved, then explicitly confirm the upload. **Upload and use shared storage** verifies that local data still matches the backup, merges conflicts, retains the exact imported file in SQL, and keeps the local originals. Imported lessons become proposals; the browser's original approved lessons remain unchanged.
- Choose shared storage once in each browser. That browser remembers the choice. **Refresh shared** loads changes from other sessions after drafts are saved or copied. Concurrent writes return a conflict rather than overwrite newer work.
- Changing or refreshing storage is blocked while task, response, or review drafts are unsaved. Controls are disabled while a storage operation is running.
- When shared storage is unavailable, saving pauses. There is no silent fallback to local saving. If this tab has a verified shared snapshot, Export can download that snapshot with an explicit last-verified filename and warning that newer remote changes may be missing. A fresh tab without a verified snapshot does not generate a misleading empty shared backup.
- Normal shared exports read the current remote state independently, verify its checksum, and compare its revision/checksum against the active verified session. Export does not advance the active save revision behind the UI's back.
- **Use this browser’s originals** returns to the retained local records. It never deletes shared data. Neither storage mode contacts AI providers.

## Build and tests

Node >=22.13 (Node 24 used for verification). Only esbuild is added as a pinned development dependency; no runtime package, account, paid service or custom login framework was introduced.

```sh
npm ci --no-audit --no-fund
npm test
npm run build:sites
python tests/browser_test.py
python tests/shared_browser_test.py
```

The Python browser checks require Playwright and Chromium. They use separate synthetic profiles, loopback servers and temporary SQL files. The shared test runs the actual built Worker, with test-only identity injection in `tests/helpers/shared-server.mjs`. That helper strips incoming identity headers before simulating the trusted host; it is never bundled or deployed. Test account IDs are synthetic. These tests do not establish real Sites identity-header behavior or hosted D1 behavior.

The source `dist/` directory remains the editable frontend. The build bundles it and the Worker into `build/sites/dist/server/index.js`, meeting the Sites server-backed Worker ES-module contract. `build/sites/.openai/hosting.json` preserves the existing Site ID and omits static mode. Every retained HTML/CSS/module asset is checked against the built Worker output. No existing source, tasks, lessons or historical plans were removed. Build output is ignored by Git.

## Required deployment review (NOT performed in this phase)

1. Confirm private access and owner account, the actual managed database limits/billing, and obtain explicit database/resource and deployment approval. The GitHub save approval is not deployment approval.
2. Use the existing Site `appgprj_6acad225d5ec81918aa041c500fdc3e4`; preserve its URL and private access. Do not create another Site or change its audience.
3. Declare the logical D1 binding `DB` in the supported Sites hosting manifest and register/review `migrations/0001_shared_workspace.sql` with the supported migration workflow before publishing. The current minimal Worker config intentionally does not provision any database. No schema is created in request handlers. Do not replay or modify migrations whose hosted application status is uncertain.
4. Configure server-side runtime values using native Sites tools: `WORKSPACE_SITE_ORIGIN=https://core-ai-workspace.sperrycorey.chatgpt.site`, the verified Site-scoped signed-in owner's `WORKSPACE_OWNER_ID`, and `WORKSPACE_SHARED_ENABLED=true` only after the database and identity checks are ready. The owner is not learned from the first request or supplied by the client. Do not embed values or credentials in frontend code.
5. Deploy ONLY behind Sites dispatch, which owns sign-in and identity header injection. Keep direct Worker routes/workers.dev access disabled. The Worker pins its API origin and rejects other origins; it requires the configured owner identity. A service bypass token supplies no visitor identity and is not sufficient to read/write these records. Reserved sign-in routes remain platform-owned. The Worker relies on the documented trusted dispatch boundary, not self-verified browser headers.
6. Preserve all static assets and reviewed schema when packaging the source-matching artifact. Use the existing Sites source repository and supported save/deploy workflow. No live source push, hosted migration or publication was performed here.
7. Verify actual signed-in owner access, denial of anonymous/wrong-owner/forged-header requests, two real browser sessions, conditional writes, schema persistence and a backup/restore against the hosted service before claiming production sync works. Start with an empty synthetic task, not personal records. Real task upload remains an explicit owner action.
8. Establish an independent backup/restore procedure and monitor storage use. Retained revision history grows without pruning and is not an independent backup. The owner can export a portable verified JSON file; no scheduled cloud backup or paid storage has been enabled.

Rollback: keep existing browser records and external exports. Returning to local mode does not delete cloud records. A live rollback to version 2 would restore the old browser-only UI, not undo already-applied database migrations; preserve the database and verify migration state before any future forward deployment.

## Limits and remaining scope

Workspace snapshots and raw imports are capped at 1 MiB each; request bodies at 2 MiB. Larger local records are retained and rejected safely rather than truncated. No pruning, task deletion, provider keys, automatic AI responses, background agents or paid fallback was added. AI integrations remain a later approved phase. Consumer chat histories and memories are not imported automatically.
