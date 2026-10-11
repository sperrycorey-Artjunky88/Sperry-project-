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

Records are stored in this browser's localStorage. Export JSON backups regularly. Data does not sync between devices or chats. Imports preserve conflicting task versions as separate copies; imported lessons return to proposed status. Responses are append-only. No personal records or backups belong in the source repository.

## Checks

`node --test tests/core.test.mjs`

`node --check dist/app.mjs`

The frontend uses standard browser modules and native dialogs. No build or dependency installation is required. Fonts have system-font fallbacks. Browser visual QA was unavailable during the initial build.
