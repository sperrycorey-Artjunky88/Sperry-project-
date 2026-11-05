# Shared AI collaboration: implementation boundary

Current branch: stronger browser persistence, manual handoffs, verified backup/import. No server, sync, AI provider connection, deployment, billing, or access to existing consumer chats is enabled. Browser persistence is not a cloud backup. This document is a concrete integration design, not a claim that shared collaboration is working.

## Lowest-maintenance path

Keep this frontend and existing record schema. Add one authenticated service with a managed SQL database to hold the same tasks, lessons, append-only responses, job status, and revision history. Use a single owner account first; avoid custom multi-agent frameworks and multiple databases. The browser talks only to that service on its own origin. Official AI provider APIs read the same saved task through the service and append their responses directly, removing the brief/answer copy-and-paste steps. Keep the current manual route for subscriptions that have no authorized API integration.

Recommended first connection: OpenAI Responses API, using the official API documentation at https://platform.openai.com/docs/api-reference/responses. Gemini can be a later server adapter using https://ai.google.dev/gemini-api/docs. Confirm current model availability and pricing during setup, never hard-code assumed free quotas. Juniper and Joe are workspace labels; do not infer which provider, account, or model they represent. Consumer ChatGPT/Gemini subscriptions do not establish API access, shared chat history, or API billing entitlement. Never scrape their browser chats or pass consumer session cookies to this app.

## Concrete service contract

- `GET /api/workspace` returns `{state, revision}` for the authenticated owner. Send revision as ETag.
- `POST /api/import` accepts a verified backup plus `If-Match: revision`. Server validates and stores an immutable pre-import backup in the same transaction, then uses the existing conflict-preserving merge rules. Invalid files and stale revisions do not write anything. Return an import receipt with counts, checksum and revision; client reads it back before showing migration success. Keep local originals and downloadable backups. First upload must be an explicit owner action, never automatic on page load.
- `PATCH /api/tasks/:id` uses `If-Match`, validation and an atomic revision increment; stale edits return 409 without overwriting. Responses append using stable unique IDs, including original body/agent/time. Lessons edited or imported return to proposed; only owner approval makes them active guidance.
- `POST /api/tasks/:id/runs` accepts a provider/model allowlist key, task revision, `brief` or `review`, maximum output tokens and an idempotency key. Require explicit per-run confirmation showing which data is sent, chosen provider, and potential API charges. Reject unless the owner previously enabled that provider and configured a spending cap. Never start on page load, import, or task edit.
- `GET /api/runs/:id` reports queued/running/complete/failed/unknown. Server stores prompt snapshot, provider request ID, usage when reported, model, timestamps, and response ID. A timeout with unknown provider acceptance becomes `unknown`; never retry automatically and risk a second charge. Retries after confirmed failure are explicit. Poll while visible; background orchestration can wait until needed.
- Server constructs briefs with existing `handoff()` and approved lessons. Responses remain unverified evidence. Model output cannot approve lessons, overwrite owner decisions, modify permissions, trigger another billable run, or call tools by itself.

Use secure HttpOnly same-site session cookies, HTTPS, CSRF/origin checks on writes, owner authorization for every record, rate limits, request size limits, secret redaction and no prompt bodies in routine logs. Provider keys live only in a server secret store/environment; never browser storage, frontend bundles, build-time public variables, URLs, Git commits or backups. Spend limits must be enforced on the server; provider budget alerts alone may not be hard caps. Server backups need independent scheduled copies and a demonstrated restore; same-database history alone is insufficient.

## Credentials, approvals, and costs

| Item | Required input / approval | Potential cost |
|---|---|---|
| Shared hosting and SQL | Choose hosting/account, region and authentication; approve deployment and data upload | Hosting, database, backup storage, bandwidth; free tiers have limits |
| OpenAI or Gemini API | Identify provider(s), owner credentials stored server-side; explicitly approve billing and a hard budget | Usage-based tokens and potentially provider tools; consumer subscriptions are separate |
| Cross-device migration | Verify/download local backups on each existing browser; approve authenticated upload | Included in approved hosting; nothing uploaded by this branch |
| Existing chat history | User-authorized exports/manual response imports unless a documented integration supports it | No automatic access is assumed |

No credentials are needed to test the changes in this branch. No connection, service signup, paid dependency, or external API call has been made. Until the owner chooses the above, shared hosting and automatic AI response collection remain blocked. Implementing a speculative server tied to an unchosen service would create maintenance work without a usable connection.

## Acceptance tests before enabling live collaboration

Two devices see the same saved task; concurrent edits return conflict without loss; unauthorized users cannot read/write any record; backed-up imports restore with exact task/response/lesson counts and checksums; provider secrets are absent from static files and browser network payloads; one idempotency key creates at most one run; unapproved or over-budget requests make zero provider calls; unknown-outcome requests are not retried; provider replies never approve lessons; simulated database failure leaves original data and revisions intact. Run sandbox/mock tests before any user-approved live call.
