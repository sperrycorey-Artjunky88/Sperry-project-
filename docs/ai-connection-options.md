# AI connections and shared storage — checked 2026-11-05

## Recommendation

Prepare shared task storage using the existing Sites identity and managed D1 support before connecting models. This avoids a separate hosting account and custom login system. Preparation code is now in `server/`; it is not wired into the static frontend or deployed. It makes no AI calls, provisions no keys or database, and uploads no personal data.

Keep Juniper and Joe as labels until Corey identifies the assistants behind those names. Connecting an API model does not import a custom assistant's instructions, memories, tools, subscription or existing chat history. Do not promise that existing consumer assistants can all talk inside this app without separate integrations.

## Supported options and cost boundaries

| Connection | Supported route | Credentials / owner action | Costs and cautions |
|---|---|---|---|
| OpenAI | Server-side Responses API | Secure OpenAI Platform key flow and explicit choice of API account/model/budget | API billing is separate from ChatGPT. Some eligible subscriptions may offer promotional API credits; eligibility/balance must be confirmed, never assumed. Tokens and tools have model-specific rates. |
| Gemini | Server-side Gemini Developer API | Google AI Studio project/key and explicit decision on data-sharing terms | Certain models have a limited free tier. Official pricing says free-tier content may be used to improve products; paid-tier content is treated differently. Do not select free mode automatically for personal task text. |
| Claude | Server-side Messages API | Claude Console key/account/model/budget | API usage is billed separately from paid consumer chat plans; eligible subscription credits, if any, require account verification. Token, caching and tool charges depend on selected features. |
| Storage | Existing Sites identity + logical D1 binding | Approve shared-storage deployment and initial upload, verify actual Sites account resource limits/billing first | D1 has free and paid usage limits, but direct Cloudflare pricing does not establish the billing of this managed Sites account. Do not promise cost-free hosting from vendor free-tier figures alone. |

No model is selected and no dollar estimate is presented without a model and token budget. Before enabling paid inference, show a sample-run estimate based on selected model's current input/output rates, including any tools, and enforce an approved ceiling on the server. Never auto-enable paid fallback, auto-recharge, or background AI loops. No credential provisioning, chargeable API request, billing activation or data upload occurred in this task.

## Sources checked

- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [OpenAI: ChatGPT and API billing are separate](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)
- [Gemini official pricing and free/paid data-use distinction](https://ai.google.dev/gemini-api/docs/pricing)
- [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude subscription versus API billing](https://support.claude.com/en/articles/9876003-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

Prices, quotas, models and promotions can change. Recheck the chosen provider during setup; no current-account entitlements were inspected or modified.

## Prepared code and remaining integration

`server/shared-store.mjs` uses prepared SQL statements and atomic D1 batch semantics. Every save adds a revision instead of overwriting earlier state. `server/schema.sql` only creates new tables; it is not registered as a hosted migration. `server/workspace-api.mjs` supplies same-origin owner-only HTTP handling with revision ETags, bounded input, safe imports and raw-backup retention. Its identity argument MUST be supplied by trusted server code. Never pass a request body, query string, unverified header, or client-chosen owner into it.

The SQLite test adapter runs the same SQL and emulates D1 batch transaction rollback. These are useful offline tests; they do not prove Cloudflare runtime compatibility or the Sites authentication boundary. No fake model response is presented as a connected AI.

To enable cross-device storage later:

1. Prepare a Worker wrapper from the official Sites starter, preserving all existing static assets, Site ID and private audience. Integrate platform-provided identity, a configured owner identity and same-origin asset routing. A service bypass token supplies no visitor identity and must not be accepted as a user-owned-record identity.
2. Register the additive schema in the starter's supported migration system and bind D1 only after resource/cost approval. Never run schema creation in request handlers. An approved test deployment must exercise actual D1 rollback, conditional writes, auth and two signed-in devices before claiming sync works.
3. Add an explicit frontend connection/migration screen showing record counts and a verified export. Upload only after owner confirmation. Existing IndexedDB and original localStorage remain untouched. Empty cloud state must never replace non-empty local data automatically; switching storage modes must retain drafts.
4. Add independent backup/restore and storage quota monitoring. Revision history is useful but is not an independent backup. The prototype keeps every revision, so storage usage grows; pruning requires a separate decision and is not implemented.
5. Only then choose the first AI provider and complete secure credentials/cost approval. No API adapter has been implemented in this branch.

## Contract

- `GET /api/workspace`: authenticated owner only; returns `{revision,state}`, `Cache-Control: no-store`, and a quoted revision ETag. Missing cloud data is virtual empty state at revision 0.
- `PUT /api/workspace`: same-origin JSON, `If-Match`, `{state}`. Saves a new revision; rejects deleting existing tasks/lessons, editing/removing saved responses, changing original creation identities, or dropping/changing existing unknown fields. Explicit known owner-editable task/lesson fields remain editable. This route is for owner UI only, not model output.
- `POST /api/import`: same-origin JSON, `If-Match`, `{confirmed:true,backupRaw:"exact file contents"}`. Verifies old JSON or checksum envelope, uses existing conflict-preserving merge, demotes imported approvals, retains exact raw import and digest in the same transaction, and returns verified revision/counts.
- Stale revision: 409; missing revision: 428; invalid record/body: 400; wrong origin: 403; wrong/missing identity: 401; excessive body: 413; unexpected storage/verification failure: 503 with no sensitive details. A 503 may occur after commit if read-back verification fails: read shared state before retrying.

Prototype limits: serialized workspace and each raw backup are capped at 1 MiB; HTTP JSON body is capped at 2 MiB. Oversized local data stays local and must be handled deliberately during integration. No automatic data deletion, pagination, cost-incurring AI calls, background scheduling, or live routes were added. Tests use Node 22.13+ (or Node 24) built-in SQLite; production frontend remains buildless and has no new dependency.
