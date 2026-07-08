# Implementation Evidence: stabilize-agent-facing-work-unit-contracts

## Scope Read Before Target-Code Edits

Read on 2026-07-08 before framework/test edits:

- `proposal.md`
- `design.md`
- `specs/subagent-node-contract/spec.md`
- `specs/agentic-queue/spec.md`
- `tasks.md`
- `_backlog/bugs/BUG-066-work-unit-result-schema-contradicts-strict-validator.md`
- `_backlog/bugs/BUG-067-phase-seed-topics-work-id-template-drift.md`
- non-gate portions of `_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md`
- `guidelines/project-charter.md`

Entrance-contract scope for this apply is limited to Agent-facing surfaces that are copied or obeyed before queue transition, non-delegated queue complete, `operate-work-unit submit`, or submitted-ledger append. Gate selector semantics, Wave1 path-to-role gate coverage, return-map reference policy, depth-review reference navigation, and historical submitted-ledger row amendment remain out of scope.

## Entrance-Contract Matrix

| Surface | Producer | Agent reader | Executable validator/check | Source of truth | Failure boundary | Guard to add/use |
| --- | --- | --- | --- | --- | --- | --- |
| Phase queue task-card JSON examples in active phase Markdown | `DPT_FRAMEWORK/workflows/nodes/phases/*.md` | Phase Agent copying task cards to `operate-queue enqueue` | `QueueDemandItemSchema` via queue CLI | `queue_item_id` queue demand identity; active queue contract | enqueue | Phase Markdown JSON extraction + queue schema parse hygiene/test |
| Non-delegated queue complete result examples in active phase Markdown | Phase Markdown prose/examples | Phase Agent writing `operate-queue complete --result` JSON | `QueueResultSchema` in `queue-manager-core.mjs` | `queue_item_id` result identity | `operate-queue complete` | Phase Markdown JSON extraction + queue result schema parse hygiene/test |
| Work-unit `manifest.json` | `writeWorkUnitEnvelope()` from `WorkUnitManifestSchema` | Phase Agent and Sub-agent | `readAndValidateManifest()` and work-unit index binding | `createWorkUnitInIndex()` manifest fields and kind contract | submit preparation | Envelope consistency tests |
| Work-unit `task.md` | `taskMarkdown()` | Sub-agent | Indirectly enforced by submit helpers and schemas | manifest identity, output contract, cache policy | submit preparation / ledger append | Envelope consistency tests |
| Spawn prompt | `spawnPromptForWorkUnit()` | Main Agent spawning Sub-agent | Indirectly enforced by submit helpers and schemas | parsed manifest identity and paths | submit preparation | Envelope consistency tests |
| Work-unit `_beacon.json` | `writeWorkUnitEnvelope()` / `WorkUnitBeaconSchema` | Sub-agent and Phase Agent | `readAndValidateBeacon()` | manifest identity, output contract, cache policy | submit preparation | Envelope consistency tests |
| Work-unit `result.schema.json` | `resultSchemaDocument()` | Sub-agent writing `result.json` | `WorkUnitResultSchema`, `validateOutputFiles()`, `validateCacheTrails()`, `validateSourceClaims()` | manifest identity and kind `output_contract` / `cache_policy` | submit preparation / ledger append | Generated schema + submit validator paired tests |
| Kind output/cache contracts in manifest/beacon/task | `DEFAULT_KIND_CONTRACTS`, queue-item overrides through `kindContractForQueueItem()` | Agent deciding output roles, fields, cache trails, source claims | submit helpers and ledger row schema | assigned `output_contract` and `cache_policy` | ledger append | Contract-vs-schema-vs-submit tests |
| Submit validators | `readAndValidateResult()`, `validateOutputFiles()`, `validateCacheTrails()`, `validateSourceClaims()` | Agent reads rejection and repairs same attempt | Engine submit path | `WorkUnitResultSchema` plus assigned kind contract | before ledger append | Submit regression tests |
| Submitted-ledger row preconditions | `buildLedgerRow()` / `WorkUnitLedgerRecordSchema` | Phase Agent relies on submit result as authority | `WorkUnitLedgerRecordSchema`, durable postcondition checks | submitted result and record identity | ledger append | Existing submit/inspect tests plus new role enum tests |

## Drift Recorded Before Fixing

### Work-unit generated schema vs submit validation

- `result.schema.json` currently emits `output_files.items` as an unconstrained object, but `WorkUnitResultSchema` accepts only `path`, `role`, optional `source_url`, and optional `source_slug`.
- `result.schema.json` currently emits `source_claims.items` as an unconstrained object, but `WorkUnitSourceClaimSchema` is strict and allows only `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`.
- `result.schema.json` currently advertises `source_claims` and `accepted_source_urls` for every kind, but `validateSourceClaims()` rejects them unless `output_contract.source_claims.allowed === true`.
- `result.schema.json` currently does not advertise `output_contract.output_files.allowed_roles`, and submit also does not enforce the allowed role enum.
- `schema_version` is defaulted by `WorkUnitResultSchema`, while generated schema advertises it as optional; this is coherent as optional/defaulted metadata.

### Envelope surface consistency

- `manifest.json`, `_beacon.json`, `task.md`, and spawn prompt all expose the same identity values from the manifest.
- `task.md` and `_beacon.json` expose the assigned output/cache contract directly.
- Spawn prompt tells the Sub-agent to read the task, beacon, and result schema rather than restating output/cache fields. This is acceptable if those three generated surfaces are truthful.
- `task.md` currently includes Wave1-specific prose requiring `source_claims[]` and `accepted_source_urls[]`, matching the Wave1 contract. Wave0/Wave2 do not receive that special source-claim prose.
- The current contradiction is concentrated in `result.schema.json`, plus role enum not being enforced at submit.

### Required/default result-field semantics

- `DEFAULT_KIND_CONTRACTS.*.output_contract.required_result_fields` currently includes `summary`.
- `WorkUnitResultSchema` defaults `summary` to `''`; submit therefore does not require the Agent to provide it.
- Chosen semantics for this change: `summary` is optional/defaulted submit metadata, not an output-contract required result field. The kind contracts should stop listing `summary` in `required_result_fields`; generated schema should not mark it required.
- Identity fields, `output_files`, and `cache_trails` remain required in the generated schema because the assigned output/cache contracts use them as entrance requirements. Submit currently defaults empty arrays, then contract helpers reject empty `output_files`/`cache_trails` when required.

### Phase Markdown queue examples vs queue schemas

- `phase-seed-topics.md` task-card example uses `"work_id": "seed-topic-{topic.slug}"`, but `QueueDemandItemSchema` requires `queue_item_id` and rejects `work_id` as queue demand identity.
- `phase-seed-topics.md` non-delegated completion example uses `/tmp/wfq-seed-result-{work_id}.json` and `{ "work_id": "..." }`, but `QueueResultSchema` requires `queue_item_id`.
- Other active wave task-card examples found by the initial audit use `queue_item_id` for queue demand identity; `work_id` occurrences in delegated work-unit contexts are legitimate Engine-allocated attempt identity.

### Static hygiene drift

- `validate-work-unit-hygiene.mjs` checks `rb_templates/rb_queue.json.tmpl` for old queue identity tokens but does not parse active phase Markdown task-card/result examples against queue schemas.
- Token-only hygiene is insufficient for Agent-copyable JSON examples because a bad example can avoid retired wording while still violating `QueueDemandItemSchema` or `QueueResultSchema`.

## Scope Classification

Fix in this change:

- Narrow generated `result.schema.json` to the submit-visible result shape and assigned kind contract.
- Enforce `output_contract.output_files.allowed_roles` before ledger append.
- Reconcile `required_result_fields` by removing intentionally defaulted `summary` from kind output-contract required metadata.
- Update `phase-seed-topics.md` queue examples to use `queue_item_id`.
- Extend static hygiene/tests to parse active phase queue examples and reject retired queue demand identity.

Record for `align-gate-contracts-and-reference-navigation`:

- Wave1 required path-to-role policy, such as required `evidence-summary.md` needing canonical role `evidence_summary`, is gate alignment unless encoded in the assigned kind output contract.
- Depth-review reference trailing slash policy is gate/reference navigation.
- Seed-topic return-map concrete `reference/*.md` policy is gate/reference navigation.
- Any `diagnosticOnly` label that actually affects pass/fail belongs to gate alignment.

## Implementation Log

- `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`
  - Added local JSON Schema projection helpers with no new dependency.
  - Generated `result.schema.json` now const-binds `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
  - Generated `output_files[]` items now expose only `path`, `role`, optional `source_url`, optional `source_slug`, with `additionalProperties: false` and role enum from the assigned output contract.
  - Generated `source_claims` and `accepted_source_urls` now appear only when `output_contract.source_claims.allowed === true`.
  - Generated source claim items now expose the submit-accepted strict key set.
- `DPT_FRAMEWORK/engine/work-unit-validation.mjs` and `DPT_FRAMEWORK/engine/work-unit-submit.mjs`
  - Submit now checks `output_contract.required_result_fields` against the raw Agent result before parser defaults.
  - Submit now rejects `output_files[].role` outside `output_contract.output_files.allowed_roles` before ledger append.
  - Submit fails closed when a result declares output files but the assigned output contract has no allowed role set.
- `DPT_FRAMEWORK/engine/work-unit-constants.mjs` and `DPT_FRAMEWORK/engine/work-unit-utils.mjs`
  - Removed defaulted `summary` from default/fallback `required_result_fields`; it remains optional/defaulted result metadata.
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`
  - Replaced task-card and non-delegated queue complete examples with `queue_item_id`.
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`, `phase-wave1.md`, `phase-wave2.md`
  - Completed Agent-copyable queue task-card JSON examples so they parse against `QueueDemandItemSchema`.
  - Removed Wave2 targeted-evidence wording that implied source claims in a kind contract that does not allow them.
- `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`
  - Added active phase Markdown JSON extraction and schema parsing against `QueueDemandItemSchema` and `QueueResultSchema`.
  - Added explicit diagnostics for queue complete examples using `work_id`.
  - Kept work-unit attempt `work_id` contexts allowed.
- `tests/engine/work-unit-lifecycle.test.mjs`
  - Added wave0/wave1/wave2 generated schema and envelope consistency coverage.
- `tests/engine/work-unit-submit.test.mjs`
  - Added source-claim extra-key rejection, unsupported source fields rejection coverage, invalid role rejection, valid role acceptance, and raw required-field coverage.
- `tests/integration/cli/validate-work-unit-hygiene.test.mjs`
  - Added phase task-card/result schema parsing positive and negative cases.
- `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md`
  - Published framework `v0.12`.

No gate selector semantics, Wave1 required path-to-role policy, return-map reference policy, depth-review reference navigation, or historical submitted-ledger rows were changed.

## Verification Log

- PASS: `node --check DPT_FRAMEWORK/engine/work-unit-envelope.mjs`
- PASS: `node --check DPT_FRAMEWORK/engine/work-unit-validation.mjs`
- PASS: `node --check DPT_FRAMEWORK/engine/work-unit-submit.mjs`
- PASS: `node --check DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`
- PASS: `node --check tests/engine/work-unit-lifecycle.test.mjs && node --check tests/engine/work-unit-submit.test.mjs && node --check tests/integration/cli/validate-work-unit-hygiene.test.mjs`
- PASS: `node --test tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-submit.test.mjs tests/integration/cli/operate-work-unit.test.mjs`
- PASS: `node --test tests/schema/contracts/queue.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs`
- PASS: `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`
- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- PASS: `openspec validate stabilize-agent-facing-work-unit-contracts --strict`
- PASS: `git diff --check`

## Residual Risks

- Historical bad submitted-ledger rows were not amended by design.
- Gate-level drift remains intentionally deferred to `align-gate-contracts-and-reference-navigation`, especially Wave1 required path-to-role policy, depth-review ref canonicalization, and seed-topic return-map reference policy.
- No new dependencies were added; JSON Schema projection is hand-written and protected by paired generated-schema/submit tests.
