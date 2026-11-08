# Core AI Workspace — Project Memory

Last verified: 2026-11-08

Latest source checkpoint: feature/shared-storage-connection in the existing
GitHub repository. This memory accompanies the completed source integration;
read that branch's HEAD for the saved source revision. The dated branch
docs/project-memory-2026-11-07 is the original memory snapshot, not this
newer checkpoint. The live app remains version 2, browser-local and manual.
Shared storage is implemented and tested in source, but NOT deployed.

## Purpose and limits

This file records verified project history, decisions, unfinished work,
and the next steps for Corey, Codex, and ChatGPT.

It does not automatically synchronize conversations or give an AI access
to GitHub. A future conversation must actually read this file through
authorized repository access or a copy supplied by Corey.

Never treat proposed, locally prepared, tested, committed, published,
and deployed work as interchangeable.

## Project identity

Repository:
https://github.com/sperrycorey-Artjunky88/Sperry-project-

Live workspace:
https://core-ai-workspace.sperrycorey.chatgpt.site

Corey's principle: save Corey time; do not create maintenance work.

The existing application must be improved, not rebuilt from scratch.
Preserve source files, features, tasks, responses, lessons, and user data.

## Current confirmed status

- The live workspace is in MANUAL AI mode.
- Users copy prompts into AI chats and paste responses back.
- No AI providers are connected or running automatically.
- Live cross-browser and cross-device task synchronization is NOT enabled.
- The deployed repair stores records in the current browser's IndexedDB
  and retains original localStorage data during migration.
- Opening the workspace inside ChatGPT and opening it in another browser
  can use separate storage. Signing into the same account does not
  currently synchronize those records.
- The live Sites publication is version 2 and remains owner-private.
- Native deployment status was rechecked on 2026-11-07: succeeded.
- GitHub main still contains the original application. The deployed
  repair was published through the separate Sites source repository.

## Verified repository checkpoints

| Checkpoint | Branch or location | Commit |
| --- | --- | --- |
| Original application | GitHub main | 947535426beef7054285ac6aa1f95d987381f874 |
| Browser persistence repair | repair/core-ai-persistence-2026-11-05 | 78131e9c7da8c4433b44e7106e78e1042ce1ac80 |
| Shared-storage prototype | feature/shared-storage-preparation-2026-11-05 | d5d5b1a7cf11412b30f6bd34a99ddedcc5efc31a |
| Deployed repair | Separate Sites source repository, version 2 | 7ebfae4613999bb2570fcbfdafa7c82513d528e7 |

The local development checkout was initially reconstructed from verified
GitHub files because the first Git clone attempt failed. Its local
snapshot/commit hashes therefore differ from GitHub history. Do not
mistake that difference for a missing published change.

## History and completed work

### Original app

The repository contained a buildless HTML/CSS/JavaScript workspace with
tasks, AI response collection, review notes, decisions, outcomes, proposed
and approved lessons, handoff generation, and JSON export/import.

Records originally lived in localStorage. Eleven original tests passed.

### Browser persistence and usability repair

Implemented and saved on the repair branch:

- Transactional IndexedDB saves with revision checks.
- Migration that retains original localStorage and verifies an exact raw
  migration backup before committing.
- Retention of previous saved revisions.
- Checksum-verified exports and compatibility with original JSON backups.
- Offline recovery tooling.
- Protection against conflicting writes and lost form drafts.
- Task search, active/completed filters, mobile layout improvements, and
  a visible saving status.
- A user-initiated browser persistence request.

An independent review found two problems: stale tabs could export older
data, and imports could discard text entered while a file was being read.
Both were fixed and covered by browser regression checks.

Validation recorded in the conversation:
14 Node tests passed, including all 11 originals. Chromium checks passed
for migration, rollback, reloads, conflicts, backup/import, draft retention,
and layout widths of 320, 390, and 1440 pixels.

These checks used synthetic records. They do not establish compatibility
with every browser or a successful migration on Corey's actual device.

Corey explicitly approved deployment of this repair. Version 2 deployed
successfully on 2026-11-05 at the existing URL, preserving private access.

### Backup and user clarification

Corey uploaded core-workspace-2026-11-05.json.
It was validated and passed a lossless conversion check.

It contained one task, zero responses, and zero lessons.
Corey explained that the task was an accidental, unwanted note created
inside the workspace opened within ChatGPT.

Do not treat that note as an important project requirement or permission
to delete it. The uploaded file was not added to GitHub.

Corey also reported:
"Browser did not grant persistent storage."

This means the browser declined extra protection from automatic storage
cleanup. It is distinct from "Not saved" or "Saving paused" and does not,
by itself, demonstrate an ordinary save failure.

### Shared-storage prototype

Prepared, tested, and published to the shared-storage preparation branch:

- Additive SQL schema.
- D1-compatible shared revision store.
- Owner-authorized HTTP API with origin checks, revision ETags, input
  limits, and explicit import confirmation.
- Atomic retention of exact raw imported backups.
- Checks against removing existing records or altering saved responses.
- SQLite tests covering rollback, conflicts, corruption, owner isolation,
  and persistence after closing and reopening the database.

The last verified full suite for this published checkpoint passed 29 tests.

This is preparation code. It is NOT connected to the live frontend.
No hosted database was provisioned or migrated for it.

Relevant files:
- server/schema.sql
- server/shared-store.mjs
- server/workspace-api.mjs
- docs/shared-storage-preparation.md
- docs/shared-ai-architecture.md
- docs/ai-connection-options.md

## Previous local checkpoint — 2026-11-07

Local checkout inspected on 2026-11-07:
/workspace/core-ai

Current local branch:
feature/shared-storage-connection

Last local commit:
f7c515a — shared-storage preparation

Uncommitted work:
- Untracked: PROJECT_MEMORY.md (this local update of the approved GitHub file)
- Modified: server/workspace-api.mjs
- Untracked: dist/shared-client.mjs
- Untracked: server/sites-handler.mjs
- Untracked: tests/shared-connection.test.mjs
- Untracked: docs/shared-storage-connection.md

The API modification adds a checksum to successful shared-state reads.
The new modules prepare an opt-in browser client and a guarded host
adapter. They are not wired into the live app.

Earlier stopping point: 12 of 13 connection tests passed; rejection of an
older server revision failed. The original attempted correction was
interrupted and inspection confirmed that it had not been applied.

Approved follow-up, verified on 2026-11-07:
- Reproduced the original failure without modifying existing work.
- Strengthened the old-revision test and added regression coverage for
  changed content under the same revision, plus positive checks for
  unchanged and newer verified revisions.
- Observed both rejection regressions fail before applying the guard.
- Added a guard rejecting revisions older than the last verified snapshot
  and changed checksums presented under the same revision.
- Confirmed that rejected replies retain the complete last verified
  snapshot, block further saves until a successful read, and do not
  automatically retry or upload data.
- Connection tests: 15 of 15 passed.
- Full Node suite: 44 of 44 passed with Node v24.22.1.
- Syntax checks for the client, host adapter, and API passed;
  git diff --check passed.
- The default sandbox initially blocked Node subprocesses with EPERM,
  breaking the unchanged recovery test. The full suite passed when rerun
  with the sandbox permission required for subprocess execution. No
  recovery implementation was changed to bypass the test.
- Self-review confirmed that only the guard, approved tests, and local
  documentation were edited in this follow-up; earlier API and host
  adapter work was preserved.

The correction is verified locally. The full current suite passes under
the tested execution permissions. This is not proof of deployed
cross-device syncing or actual Sites/D1 authentication behavior.

No files were staged or committed, and nothing was published or deployed.
No hosted resources, credentials, billing settings, or personal data were
changed. The live app remains in manual mode.

The verified GitHub branch listing did not contain this local connection
branch. This update did not publish it. Preserve its uncommitted files;
do not reset, clean, or overwrite them.

Separate deployed-source checkout:
/workspace/deploy-core-ai

Workspace paths may not survive a future environment replacement.
Verify availability before relying on them.

## Completed shared-storage source phase — 2026-11-08

Corey explicitly approved completing and testing shared-storage integration
and saving the code and updated memory to a separate GitHub branch.
This approval did not enable cloud resources, paid services, credentials,
AI calls, actual task upload or deployment.

Implemented without rebuilding or removing the existing app:
- A Storage dialog with local/shared selection, read-only availability
  checks, verified pre-upload backup and explicit upload confirmation.
- The original localStorage/IndexedDB data remains intact. Selecting
  shared storage without upload does not copy local work. Returning to
  local mode does not delete shared data.
- Shared selection is remembered per browser. Fresh browsers must choose
  shared mode once. Refresh shared loads other sessions' changes after
  saving/copying drafts. No silent fallback to local saves on failure.
- Draft guards and locked controls protect text during storage changes;
  conflicts and failed writes retain the current view and drafts.
- Shared imports retain the exact raw backup in SQL, merge conflicting
  versions, and demote imported lessons without changing local approvals.
- Shared exports verify remote state without advancing the active save
  revision behind the UI. They reject replies older than the current
  verified snapshot or changed content under the same revision.
- Offline/invalid shared export falls back only to this tab's verified
  shared snapshot, with a last-verified filename and explicit warning.
  A fresh tab with no verified shared snapshot cannot export a misleading
  empty shared backup. Local originals are never substituted silently.
- A Worker routes the retained frontend assets and owner API. It pins the
  configured site origin and relies on Sites dispatch identity. Shared
  routes default to disabled; owner, origin and DB are required runtime
  configuration. It is not an independently authenticated public Worker.
- A reproducible esbuild bundle preserves all existing frontend assets.
  esbuild 0.28.2 is the only new pinned development dependency. Original
  dist files remain editable source; generated build output is ignored.
- Reviewed additive SQL is provided in migrations/0001_shared_workspace.sql.
  No hosted migration ran and no database was provisioned. The minimal
  Worker hosting config preserves the existing Site ID and intentionally
  does not provision a database.

Verification:
- npm test: 56/56 Node tests passed, including the original tests, disk
  persistence, rollback, concurrent writes, revision guards, migration
  safety and checking every frontend asset in the built Worker.
- python tests/browser_test.py: original real-Chromium regressions passed.
- python tests/shared_browser_test.py: full UI-to-built-Worker-to-SQL flow
  passed using two isolated synthetic browser profiles and test identity.
  Checked explicit upload, raw receipts, reload, independent exports and
  restore, local approvals/extension fields, conflicts, failed writes,
  draft retention, mobile layout, offline startup, denied/forged identity,
  and persistence after restarting the backend process.
- Independent review found two important shared-export issues: inaccessible
  last-verified export while offline, and bypassing the active revision
  floor during independent export. Browser regressions were observed
  failing before fixes and passing afterward. No other important or
  critical findings were reported by the reviewer.
- Syntax and git diff whitespace checks passed. No existing tracked files
  were deleted. No real user data was used in fixtures or added to Git.

These tests establish a working local integration, not real hosted D1
behavior, the production Sites identity boundary, physical-device browser
compatibility or live cross-device syncing. Those remain deployment gates.

Runbook: docs/shared-storage-runbook.md
Build: npm ci --no-audit --no-fund; npm run build:sites
Artifact: build/sites/dist/server/index.js (ignored, not committed)
GitHub source branch: feature/shared-storage-connection
Prior local checkpoints and their unfinished-file descriptions above are
historical; that preserved work is included in this source checkpoint.
The separate Sites source repository and live version were not changed.

## Important decisions and constraints

- Keep all existing features and records.
- Work on separate branches; do not silently merge into main.
- No deletion, deployment, charges, paid services, credential creation,
  or AI-provider activation without the applicable explicit approval.
- Approval for the deployed browser repair was not blanket approval for
  later shared-storage or AI deployments.
- Never put API keys, service tokens, raw personal backups, or task text
  into frontend code or GitHub.
- Do not silently fall back to empty state after corruption.
- Do not automatically retry a request whose commit or billing outcome
  is unknown.
- Keep approved guidance distinct from unverified AI responses.
- Preserve the manual workflow while preparing integrations.
- Clearly state whether the app is manual or connected.
- Corey requested useful work without needing him physically involved.
  That does not authorize paid services or remove approval requirements.

LATEST INSTRUCTION, 2026-11-07:
Show proposed updates for approval before making any other project
changes. This supersedes earlier general permission to continue changing
the project autonomously.

Corey subsequently approved the limited revision-guard fix, regression
tests, and memory/checkpoint documentation update. That approval did not
authorize commits, publication, deployment, provisioning, AI connections,
billing changes, or task-data upload. Those actions remained separate gates for that limited fix. Corey later
approved finishing/testing the shared-storage phase and saving code and
memory to a separate GitHub branch. That later approval covers this source
checkpoint only. Live deployment, database provisioning, actual data upload,
provider credentials and costs still require explicit applicable approvals.
Show proposed future project changes before editing, as already instructed.

## Proposed architecture — not yet enabled

Prefer the existing Sites identity and managed D1 support over adding
another hosting account and custom login system.

A trusted server integration must resolve the signed-in owner. Never
accept a browser-supplied owner ID as proof of authorization. A Sites
service-access token does not supply a visitor identity.

The simple Sites Worker ESM starter does not preserve this app's
standalone assets automatically. Do not replace the app with that starter.

For AI integration, supported server-side provider APIs are candidates.
Juniper and Joe are existing labels; their actual providers and assistant
configurations have not been confirmed.

An API connection does not automatically transfer a consumer assistant's
conversation history, memories, personality, tools, or subscription.

Provider/model selection, credentials, account entitlements, data-use
terms, and spending limits remain unresolved. Pricing research is
documented, but must be rechecked before activation. No free quota,
promotional credit, or cost-free hosting entitlement should be assumed.

## Completed checkpoints and outstanding work

Completed:
- The original approved memory file was added as the only change on
  docs/project-memory-2026-11-07 at commit
  65994b162fabde06cd69a870ac97480fa9502f8b.
- Preserved/resumed the local connection branch and fixed its revision
  guard. The limited follow-up passed 44 Node tests.
- Completed the later approved UI/server/SQL integration and its source
  build, migration safeguards and browser regression checks. The current
  source phase passes 56 Node tests and both browser suites. Code and this
  updated memory are saved together on feature/shared-storage-connection.

Outstanding, in order:
1. Propose the concrete live setup and verify actual managed-resource
   costs/limits, owner identity and private audience. Obtain explicit
   provisioning and deployment approval before changing hosted resources.
2. Follow docs/shared-storage-runbook.md to declare the DB binding,
   register/apply the reviewed migration through the supported workflow,
   configure server owner/origin flags, and deploy the exact saved source
   to the EXISTING Site after approval. Keep its URL/private access.
3. Validate hosted owner authorization, D1 transactions, independent backup
   and restore, and two real browser sessions using synthetic records
   before declaring production sync complete. Actual user-data upload
   remains an explicit action with verified backups and local originals.
4. Confirm AI providers and assistant configurations; obtain credential,
   data-use and spending approvals before provider implementation or use.
5. Complete the provider-connected task/response/lesson workflow and final
   usability/device checks. No AI provider is currently connected.

## How to maintain this memory

- Read this file before substantive project work.
- Inspect the actual repository and deployment state; correct stale claims.
- Propose memory changes for approval under Corey's latest instruction.
- After approval, record new commits, deployments, decisions, problems,
  and test evidence.
- Label assumptions, proposals, and unverified results explicitly.
- Never include secrets or personal task contents.
- Do not claim this file creates automatic cross-chat memory.
