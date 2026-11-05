# Core AI Workspace repair plan

Goal: preserve the existing app and records while improving persistence, collaboration readiness, phone navigation, and validation.

Constraints: separate branch; no data deletion, deployment, paid services, credentials in frontend, or live API calls. Upstream snapshot: 947535426beef7054285ac6aa1f95d987381f874. Git network unavailable; files retrieved unchanged through GitHub connector. Local history records that snapshot; GitHub commits will retain actual upstream ancestry.

1. Add tests for lossless localStorage migration, raw backup verification, transaction failure, corruption, stale revisions, restore, and reload. Implement IndexedDB storage with atomic state/revision/backup writes; retain original localStorage forever. Block unsafe saves instead of resetting. Export portable verified JSON; never claim downloads are durable backups.
2. Wire asynchronous saves without losing form drafts or falsely reporting success. Add task search/status filters, mobile navigation, visible save status, and persistent-storage request initiated by user.
3. Document a supported shared architecture: authenticated central task API/database, official provider APIs behind server-side secrets, revision checks, append-only responses, explicit cost approval, and no assumption of access to consumer chat histories. Keep manual fallback. No live integration is enabled.
4. Run original and new tests, real Chromium persistence/migration/mobile checks, syntax checks, and branch diff review. Save changes to a separate GitHub branch without workflows or deployment. Report verified behavior and remaining approval gates.

Review focus: corrupt legacy payloads; transaction/quota failures; two tabs; reload during migration; preserving approvals and unknown fields; mobile accessibility; no external calls or secrets.

Progress: baseline snapshot saved; original tests inspected. Browser data is unavailable in this environment; only synthetic fixtures will be used.

## Final evidence

- All original source paths remain; `dist/core.mjs`, original tests and `.gitignore` were not changed. No personal browser data was available. Only synthetic fixtures were migrated in isolated Chromium profiles.
- Node: 14/14 tests pass (11 originals plus verified-backup and offline-recovery tests). Syntax and whitespace checks pass.
- Chromium: lossless migration with exact raw backup; original localStorage unchanged; interrupted migration leaves no partial records and retries safely; stale writers rejected; stale-tab export includes latest committed data; failed transactions roll back state and snapshots; failed UI save retains draft; delayed import asks again before discarding newly typed text; verified download/import; task/response/status/search flows; lessons and extra fields preserved; corrupt legacy and primary records block unsafe startup. Layout overflow checked at 320px, 390px and 1440px.
- Independent review found stale-tab export and import-draft races; both were fixed with browser regression checks. Stale export test was observed failing before the fix. Core storage transaction, conflict and approval design otherwise passed review.
- Ruling: implement and verify the local persistence/UI changes now; keep shared services as a specific documented design until the owner chooses hosting/authentication and authorizes data upload and any costs. Building an unconfigured provider-specific server would increase maintenance without establishing a usable connection.
- Retained snapshots deliberately have no pruning; quota growth is documented. No data deletion, deployment, service signup, AI calls, paid services or credentials added. No GitHub Actions configured or run.
- Automatic collaboration and cross-device sync are designed, not implemented or connected. Real-browser storage behavior is verified in Chromium; Safari/iOS/Android-device and real-user-data migration remain unverified. An HTTPS origin or localhost and modern IndexedDB/Web Crypto support are required.
