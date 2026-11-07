# Core AI Workspace — Project Memory

Last verified: 2026-11-07

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

## Exactly where development stopped

Local checkout inspected on 2026-11-07:
/workspace/core-ai

Current local branch:
feature/shared-storage-connection

Last local commit:
f7c515a — shared-storage preparation

Uncommitted work:
- Modified: server/workspace-api.mjs
- Untracked: dist/shared-client.mjs
- Untracked: server/sites-handler.mjs
- Untracked: tests/shared-connection.test.mjs
- Untracked: docs/shared-storage-connection.md

The API modification adds a checksum to successful shared-state reads.
The new modules prepare an opt-in browser client and a guarded host
adapter. They are not wired into the live app.

Last completed connection test run:
12 of 13 tests passed. The test rejecting an older server revision failed.

The attempted follow-up correction and final validation were interrupted.
Inspection on 2026-11-07 confirmed that the intended guard against a
revision going backward was not present in the client.

Do NOT claim that correction is finished, that the complete latest suite
passes, or that this connection work is published or deployed.

The GitHub branch listing does not contain this local connection branch.
Preserve its uncommitted files; do not reset, clean, or overwrite them.

Separate deployed-source checkout:
/workspace/deploy-core-ai

Workspace paths may not survive a future environment replacement.
Verify availability before relying on them.

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

## Outstanding work, in order

1. Obtain approval for this memory file and add only the approved file.
2. Propose the next code changes before editing.
3. After approval, resume the uncommitted connection work: fix and test
   backward-revision rejection and complete the full validation.
4. Review and publish that work on a separate branch.
5. Complete the supported host integration and explicit migration flow,
   preserving all local originals and drafts.
6. Verify actual hosted authentication, database transactions, independent
   backup/restore, and two-device behavior before claiming live syncing.
7. Obtain applicable resource, upload, and deployment approvals before
   enabling shared storage.
8. Confirm intended AI providers and configurations; obtain credential
   and cost approvals before implementing or enabling provider access.
9. Address remaining browser/device testing and clearer storage wording.

## How to maintain this memory

- Read this file before substantive project work.
- Inspect the actual repository and deployment state; correct stale claims.
- Propose memory changes for approval under Corey's latest instruction.
- After approval, record new commits, deployments, decisions, problems,
  and test evidence.
- Label assumptions, proposals, and unverified results explicitly.
- Never include secrets or personal task contents.
- Do not claim this file creates automatic cross-chat memory.
