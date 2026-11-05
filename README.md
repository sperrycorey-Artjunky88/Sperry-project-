# Core AI Workspace

A manual collaboration workspace for collecting AI responses, comparing claims, recording decisions and outcomes, and carrying user-approved lessons into future prompts.

## Use

Serve `dist/` using any static web host. The deployed Sites version is owner-private.

1. Create a task with a goal and constraints.
2. Copy the brief into your existing AI chats.
3. Paste each response into the workspace.
4. Copy the cross-review prompt to another chat for checking.
5. Save your review, decision, and real outcome.
6. Propose a lesson with evidence and a test. Explicitly approve it to include it in future prompts.

No AI API connections, secrets, subscriptions, or background agents are configured. This app organizes manually supplied text; it does not train models or automatically verify claims.

## Data

Records are stored in this browser's IndexedDB after a verified, non-destructive localStorage migration. Export JSON backups regularly. Data does not sync between devices or chats. Imports preserve conflicting task versions as separate copies; imported lessons return to proposed status. Responses are append-only. No personal records or backups belong in the source repository.

## Checks

`node --test tests/core.test.mjs`

`node --check dist/app.mjs`

The frontend uses standard browser modules and native dialogs. No build or dependency installation is required. Fonts have system-font fallbacks. Browser visual QA was unavailable during the initial build.


## Repair branch: persistence and recovery

The existing files and manual collaboration workflow are retained. IndexedDB now saves validated state, revision and previous-state snapshot in one transaction. First use validates the original localStorage payload, stores and reads back an exact raw migration copy, and keeps the original localStorage key untouched. Failure blocks saving and retains form text. Other writers are rejected using revision checks; a changed legacy key also pauses saves. There is no silent empty-state fallback for unreadable data.

Export produces a schema-validated SHA-256 backup envelope. Import accepts both that format and original version-1 JSON. A checksum detects accidental changes, not malicious edits. Import keeps conflicting versions and never grants imported lesson approval. Keep the downloaded file outside browser storage and check that it exists. A download-start message cannot verify your filesystem or a cloud copy.

Use the SAME origin (scheme, hostname and port) and original browser profile when migrating existing data. A different host or device cannot read its localStorage. Before approving any deployment or changing the URL, export a backup from every browser that holds work. No real user data was available or migrated during development.

Browser storage can be cleared, evicted or lost with the device. The optional **Protect browser storage** button requests persistence; the browser may refuse. Private mode can discard data. Revision snapshots are retained without automatic pruning to meet the no-deletion constraint; storage usage grows with edits. If quota is reached, saves stop safely: export backups before moving to an approved shared service. No backups, task text, credentials, or user data belong in Git.

If startup reports unreadable data, **Export backup** downloads a recovery bundle containing raw legacy data and IndexedDB records. Normal imports deliberately reject this recovery bundle. Offline recovery:

```sh
node tools/recover.mjs recovery.json
node tools/recover.mjs recovery.json 2 recovered-state.json
```

The first command lists readable records; choose a valid index from that output. The second creates a NEW file (refuses overwrite) that normal Import can merge into a healthy browser/profile. Keep the original recovery file; do not clear or manually replace the damaged browser store. If IndexedDB itself cannot open, Export attempts the untouched legacy raw copy instead. Form text that has never saved is not included in backups; copy it before reloading.

## Shared collaboration

See [the supported integration design and approval gates](docs/shared-ai-architecture.md). Automatic AI calls and cross-device sync remain unconfigured pending hosting, authentication, credentials, data-upload consent, and cost approval. The current manual features continue to work without any API keys.

## Repeatable validation

No production dependencies or build step were added. Run on Node 20+:

```sh
node tests/core.test.mjs
node tests/storage.test.mjs
node tests/recovery.test.mjs
node --check dist/app.mjs
node --check dist/storage.mjs
node --check tools/recover.mjs
```

Real-browser tests use Python Playwright and Chromium (already available in the development environment):

```sh
python tests/browser_test.py
```

They create synthetic tasks only and run a local HTTP server on port 8765. They do not use or access your existing browser profile. No GitHub Actions workflow was added or run, avoiding unapproved automation charges or deployment triggers.
