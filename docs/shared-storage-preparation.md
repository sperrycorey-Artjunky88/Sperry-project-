# Shared storage preparation — 2026-11-05

Corey asked for useful work that does not require him at the screen. Existing authorization: prepare safe code on a separate branch; preserve all source/data/features; no new deployment, credentials, live AI calls, paid services, or data upload. The earlier repair was deployed with separate explicit approval; this follow-up remains undeployed.

Scope: implement a provider-independent shared store and HTTP handler, tested against SQLite using the D1 prepared-statement/batch contract. Keep the deployed static frontend and hosting manifest unchanged. Do not build an API-backed AI artifact or provision keys in this task. There is no credential decision to interrupt Corey for while doing independent storage work.

Files: `server/schema.sql` (additive schema, never run against production), `server/shared-store.mjs` (revision ledger and exact raw import retention), `server/workspace-api.mjs` (owner authorization, origin checks, limits, ETags, safe imports), `tests/shared-store.test.mjs` plus SQLite test adapter.

Plan:
1. Write tests for shared reads, cross-session stale edits, exact import receipts, immutable previous revisions, schema validation, unauthorized access, hostile origins, lost/deleted records, corruption and database failure. Observe failure before implementation.
2. Add SQL and shared store with atomic conditional inserts; verify checksum/schema on reads; retain every committed revision and raw import; no destructive SQL or request-time schema changes.
3. Add HTTP handler with identity supplied by a trusted server wrapper, not JSON/client headers. Reject missing/wrong owner before touching storage. Accept same-origin writes only and compare expected revision. Import requires explicit confirmation; never auto-upload on page load. Existing tasks, lessons, response prefixes and unknown fields survive.
4. Run new/original tests and review. Save to a new GitHub branch. Document exact next integration steps and approvals. No frontend wiring, live database binding, Worker conversion, or production migration in this step.

Host integration decision: prefer the existing Sites identity + D1 binding over another account/session system. Sites docs say the identity header is stable within one Site and that service bypass tokens supply no user identity. The future Worker wrapper must use the trusted Sites identity, enforce owner authorization, and preserve private audience; never infer ownership from the first request. No owner identity is embedded in public source.

Review focus: two sessions writing the same revision; rollback during import receipt creation; corrupt latest revision must not silently fall back; missing or forged owner; body size limits; requests cannot delete old records; backups contain personal text and must never enter Git.

## Completion evidence

- Implemented the isolated shared store, schema and owner-only HTTP handler. No Worker entrypoint, hosting binding, production migration, frontend storage switch, or AI adapter added.
- 29/29 Node tests pass: 14 existing tests plus 15 shared-storage tests using real SQLite, including disk close/reopen, exact raw receipt retention, rollback, a deliberately interleaved writer between read and insert, unknown-field preservation, append-only responses, origin/auth checks and corrupt-head rejection.
- Initial shared-storage test run failed on the absent implementation. Strict media-type regression was observed failing (200 instead of 415), then fixed and verified with the full suite.
- Self-review checked SQL parameterization, per-owner revision queries, atomic receipt writes, sanitized storage errors, input byte limits and the trusted-identity boundary. Actual hosted D1 semantics and Sites identity integration remain unverified until the Worker wrapper and approved deployment are completed.
- Original `dist/` files are unchanged in this follow-up. Live site, uploaded personal backup, private audience, credentials, billing, scheduled tasks and user data were not changed.
- Official provider and D1 pricing/billing sources checked; summary saved in `docs/ai-connection-options.md`. No account entitlements were assumed and no model/budget selected on Corey's behalf.
- Next autonomous implementation work can prepare the trusted Sites Worker wrapper and opt-in frontend storage adapter; do not provision D1, upload tasks, deploy, or connect models without the applicable explicit approvals. Existing deployment approval applied to the earlier reviewed browser-storage repair only.
