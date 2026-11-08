# Shared-storage connection preparation

Authorized outcome: keep making useful progress without Corey at the screen. Prepare and test source on a separate branch. No further deployment, provisioned database, billing activation, AI credentials, model calls, or personal-data upload. Existing browser app and migration data must remain intact.

Scope: a guarded Sites API adapter and an opt-in browser client, with an end-to-end offline harness using real SQLite. No auto-upload, background retries, or automatic storage switching. Preserve current manual AI mode.

Plan:
1. Write failing tests for two client instances sharing data through API/store, explicit import confirmation, redirects/external URLs, checksums, conflict preservation, server identity and disabled configurations.
2. Implement a server adapter requiring a trusted identity resolver supplied by the official Sites host integration. Require a server-configured owner, explicit feature enablement and DB binding; fail closed before touching data if unavailable.
3. Implement an unreferenced browser module with same-origin requests, quoted revision ETags, verified replies, serialized client operations, explicit opt-in import, and no mutation of localStorage/IndexedDB. Failed/unknown saves require a read before retry; no automatic retries.
4. Run new and existing tests, source checks and review; save to a separate GitHub branch. Report prepared versus enabled plainly.

Hosting ruling: the Sites Worker ESM starter copies only one entry module and does not support the existing standalone asset files. Do not replace the existing app with that starter. Use the documented Sites framework identity helper in a later approved hosting conversion that preserves every asset and the Site ID. The adapter here is intentionally not a standalone deployable Worker.

Review focus: host-supplied identity versus spoofed browser headers; stale devices; local originals survive import; user authorization before upload; response checksum/ETag mismatch; requests with redirects; concurrent client clicks; failed writes with unknown outcome; service access token supplies no visitor identity.

## Approved follow-up and verified checkpoint — 2026-11-07

Corey approved a limited revision-guard fix, regression tests, and local memory/checkpoint updates. Commits and publication require a subsequent approval; original plan step 4 is not authorization to save or deploy this follow-up. No files were staged or committed and no remote project files were changed.

- Resumed `feature/shared-storage-connection` at local commit `f7c515a`, preserving the existing modified API and all four untracked connection files. The published shared-storage preparation remains at `d5d5b1a7cf11412b30f6bd34a99ddedcc5efc31a`.
- Reproduced the older-revision failure: 12 of 13 existing connection tests passed before editing.
- Strengthened snapshot-preservation checks and added a changed-content/same-revision regression plus positive checks for unchanged and newer revisions. Both rejection regressions failed before the guard was applied.
- The client now rejects an older revision or a changed checksum under an already-verified revision before replacing its snapshot. A failed read retains the verified snapshot and requires successful read-back before further saves; there is no automatic retry.
- Connection tests: `node tests/shared-connection.test.mjs` — 15/15 passed.
- Full Node suite: `node --test tests/*.test.mjs` — 44/44 passed with Node v24.22.1, using the sandbox permission needed for subprocess execution. The initial restricted run failed the unchanged recovery subprocess test; a separate spawn check reported `EPERM`. No recovery code was changed.
- Syntax checks passed for `dist/shared-client.mjs`, `server/sites-handler.mjs`, and `server/workspace-api.mjs`; `git diff --check` passed.
- Self-review checked the minimal guard, retained snapshot after failed reads, valid repeat/newer reads, preservation of prior unfinished code, and documentation accuracy. No additional feature implementation or workflow change was introduced.
- `PROJECT_MEMORY.md` is an uncommitted local update of the approved GitHub memory. The published memory still records the earlier checkpoint until a later approved publication.

Status: verified locally, uncommitted, unpublished, and not deployed. The live workspace remains manual. No hosted database, resource provisioning, credentials, AI calls, billing changes, or personal-data upload occurred. Real Sites authentication, hosted D1 behavior, browser UI wiring, and two-device syncing remain outside this completed fix.


## Approved integrated source phase — 2026-11-08

The earlier "local only, no commit" checkpoint above is historical. Corey subsequently approved completing/testing the shared-storage integration and saving the code plus updated project memory to a separate GitHub branch. The resulting source checkpoint is `feature/shared-storage-connection`; this phase does not authorize deployment or paid/hosted resource setup.

- Preserved all prior pending code; connected the existing interface to the session/client, owner API and SQL store.
- Added explicit local/shared storage selection, backup-before-upload confirmation, draft guards, shared refresh, remembered mode, remote import receipts and safe shared export/fallback.
- Added a Worker bundle and additive migration source, with the original frontend assets retained. Shared API routes require configured owner/site origin/DB and remain disabled by default. The current hosting config provisions no database.
- Independent review identified offline export fallback and independent-export rollback issues. Both were reproduced with browser regressions, fixed, and verified. No other important/critical findings were reported.
- Final checks: 56/56 Node tests; original browser suite and integrated shared-browser suite passed. The integrated test runs the built Worker with synthetic trusted-dispatch identity and SQLite, two isolated profiles, raw import retention, export/restore, conflicts, draft retention, failed writes, offline behavior and backend restart.
- No existing tracked file was deleted, no user record was used in fixtures, and no Sites source push, cloud database, migration, runtime secret, billing change, actual task upload, AI call or deployment was performed.

Read `docs/shared-storage-runbook.md` for operation, limits and exact deployment gates. The code is complete for this approved source phase; real Sites identity/D1 and production two-browser acceptance remain unperformed until approved hosting setup. The live workspace is still version 2 and manual.
