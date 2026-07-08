## 1. Entrance Contract Audit

- [ ] 1.1 @impl SNC-006, AGQ-023: Read `proposal.md`, `design.md`, delta specs, `_backlog/bugs/BUG-066*`, `_backlog/bugs/BUG-067*`, and the non-gate portions of `_backlog/bugs/BUG-069*`; record the entrance-contract audit scope in implementation evidence before target-code edits.
- [ ] 1.2 @impl SNC-006, AGQ-023: Build an entrance-contract matrix for every Agent-facing entrance surface: phase queue task-card examples, non-delegated queue complete result examples, work-unit `manifest.json`, `task.md`, spawn prompt, `_beacon.json`, `result.schema.json`, kind output/cache contracts, submit validators, and ledger append preconditions.
- [ ] 1.3 @impl SNC-006, AGQ-023: For each matrix row, record producer, Agent reader, executable schema/helper validator, source-of-truth contract field, failure boundary, and regression/static guard before fixing.
- [ ] 1.4 @impl SNC-006: Compare generated work-unit schema shape against submit-time validation for registered wave0/wave1/wave2 work-unit kinds; record every drift in implementation evidence before fixing.
- [ ] 1.5 @impl SNC-006: Compare generated `manifest.json`, `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json` for the same claimed work unit; record contradictions in identity, output/cache contract, source-claim capability, and required/default wording before fixing.
- [ ] 1.6 @impl SNC-006: Compare `output_contract.required_result_fields`, generated JSON Schema `required`, and `WorkUnitResultSchema` default/required behavior; choose and record one consistent semantics for each field: schema+submit require it, or the output contract stops calling it required.
- [ ] 1.7 @impl AGQ-023: Compare phase Markdown queue task-card/result examples against `QueueDemandItemSchema` and `QueueResultSchema`; record every drift before fixing.
- [ ] 1.8 @impl SNC-006, AGQ-023: Classify any discovered mismatch as entrance-contract scope or gate-alignment scope; fix entrance-contract mismatches in this change and record gate-only findings for `align-gate-contracts-and-reference-navigation`.
- [ ] 1.9 @impl SNC-006, AGQ-023: Do not change gate selector semantics, Wave1 required path-to-role policy, return-map reference policy, depth-review reference navigation, or historical submitted-ledger rows in this change.

## 2. Work-Unit Result Schema Projection

- [ ] 2.1 @impl SNC-006: Add local JavaScript helper(s), without new dependencies, for emitting work-unit result JSON Schema from manifest identity, kind output contract, and submit-visible result shape.
- [ ] 2.2 @impl SNC-006: Make generated `result.schema.json` const-bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` for each claimed work unit.
- [ ] 2.3 @impl SNC-006: Emit strict `output_files[]` item schema with required `path` and `role`, optional `source_url` and `source_slug`, `additionalProperties: false`, and `role` enum from `output_contract.output_files.allowed_roles`.
- [ ] 2.4 @impl SNC-006: Omit `source_claims` and `accepted_source_urls` from generated schemas when the output contract does not allow source claims.
- [ ] 2.5 @impl SNC-006: Emit strict `source_claims[]` item schema and `accepted_source_urls[]` only when the output contract allows source claims.
- [ ] 2.6 @impl SNC-006: Reconcile generated schema required fields with `output_contract.required_result_fields` and submit parser behavior; if a field is intentionally defaulted, update output contract metadata so the Agent-facing contract no longer calls it required.
- [ ] 2.7 @impl SNC-006: Ensure generated `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json` expose the same identity, output/cache contract, source-claim capability, and required/default semantics for the same claimed work unit.

## 3. Submit-Time Entrance Enforcement

- [ ] 3.1 @impl SNC-006: Enforce `output_contract.output_files.allowed_roles` in `operate-work-unit submit` before ledger append, with diagnostics naming the invalid role or allowed role set.
- [ ] 3.2 @impl SNC-006: Keep existing output path, reference `source_url`, cache leaf, source claim, and identity validation behavior intact while adding the role enum check.
- [ ] 3.3 @impl SNC-006: Add or update submit normalization diagnostics only where current behavior intentionally canonicalizes an Agent-shaped result; do not silently broaden the accepted contract.
- [ ] 3.4 @impl SNC-006: Do not add Wave1 required path-to-role binding to submit unless the current kind output contract already encodes that rule; otherwise record it for the gate alignment change.

## 4. Queue Phase Template And Hygiene

- [ ] 4.1 @impl AGQ-023: Update `phase-seed-topics.md` enqueue task-card example from `work_id` to `queue_item_id`.
- [ ] 4.2 @impl AGQ-023: Update `phase-seed-topics.md` non-delegated `operate-queue complete --result` example to use `queue_item_id`, including temporary filename prose if it implies `work_id`.
- [ ] 4.3 @impl AGQ-023: Extend static hygiene to scan active phase Markdown queue task-card/result JSON examples for queue demand `work_id` drift.
- [ ] 4.4 @impl AGQ-023: Extend static hygiene or tests so queue task-card examples parse against queue demand schema and non-delegated complete result examples parse against queue result schema, while allowing legitimate work-unit attempt `work_id` contexts.
- [ ] 4.5 @impl AGQ-023: Update CLI docs or diagnostics if they currently overclaim hygiene coverage without scanning the phase Markdown surfaces now covered.
- [ ] 4.6 @impl AGQ-023: Make token-only hygiene insufficient for Agent-copyable JSON examples; schema-invalid queue examples must fail even when they avoid retired wording.

## 5. Regression Tests

- [ ] 5.1 @impl SNC-006: Add generated schema regression tests for wave0, wave1, and wave2 work-unit kinds covering unsupported source fields, strict source claim keys, output file item shape, role enum, and const-bound identity fields.
- [ ] 5.2 @impl SNC-006: Add submit validator regression tests proving source claim extra keys fail, unsupported source claim fields fail, invalid output roles fail, and valid roles still pass.
- [ ] 5.3 @impl SNC-006: Add regression coverage for `required_result_fields` versus generated schema required list and submit default/required behavior.
- [ ] 5.4 @impl AGQ-023: Add phase template hygiene tests proving seed-topic task-card/result examples use `queue_item_id` and that a queue-demand `work_id` example fails hygiene.
- [ ] 5.5 @impl SNC-006, AGQ-023: Add a regression guard that fails if a generated schema advertises an output role enum that submit does not enforce for the same kind contract.
- [ ] 5.6 @impl SNC-006: Add generated envelope consistency tests proving `manifest.json`, `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json` agree for one representative wave0, wave1, and wave2 work unit.
- [ ] 5.7 @impl AGQ-023: Add queue example schema-parse tests for Agent-copyable task-card and non-delegated complete result examples.
- [ ] 5.8 @impl SNC-006, AGQ-023: Run focused tests for work-unit lifecycle/envelope/submit and queue hygiene; fix failures instead of weakening contracts.

## 6. Release And Governance

- [ ] 6.1 @impl SNC-006, AGQ-023: Update root `CHANGELOG.md` with framework `v0.12` and a concise entrance-contract stabilization summary.
- [ ] 6.2 @impl SNC-006, AGQ-023: Sync `DPT_FRAMEWORK/RUN.md` version banner with the `v0.12` changelog entry.
- [ ] 6.3 @impl SNC-006, AGQ-023: Run `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` and required focused regression tests; record commands and PASS/FAIL.
- [ ] 6.4 @impl SNC-006, AGQ-023: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [ ] 6.5 @impl SNC-006, AGQ-023: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [ ] 6.6 @impl SNC-006, AGQ-023: Run OpenSpec validation for `stabilize-agent-facing-work-unit-contracts` if available; record the command and outcome.
