# Martin Fowler Run Bugfix Change Split Plan

> Status: active | Created: 2026-07-08 | Source run: `dpt_rb_martin-fowler-ai-sdlc-retreats` | Purpose: split BUG-066 through BUG-070 into focused OpenSpec changes

## Summary

Use **2 OpenSpec changes**:

1. `stabilize-agent-facing-work-unit-contracts`
2. `align-gate-contracts-and-reference-navigation`

This split follows the failing boundary, not the bug count.

- BUG-066 and BUG-067 are **Agent-facing contract surfaces**: generated result schemas and phase templates tell the Agent what to submit or enqueue.
- BUG-068 and BUG-070 are **gate judgment / navigation-contract failures**: gate definitions, helper logic, phase docs, and return-map/reference expectations disagree.
- BUG-069 is the systemic umbrella: silent autonomous execution is unreachable until both the Agent-facing contract layer and the gate judgment layer become self-sufficient.

Recommended order:

```text
1. stabilize-agent-facing-work-unit-contracts
        |
        v
2. align-gate-contracts-and-reference-navigation
```

BUG-069 is considered fixed only after both changes land and the second change completes an explicit gate-alignment audit.

## Why Two Changes

Do not make five bug-sized changes. The bugs are symptoms of two contracts drifting:

- what the Agent is told to produce before submit;
- what gates actually require after submit.

Do not make one giant change either. The first change is a narrower contract-surface fix that should land quickly and reduce first-submit failures. The second change is intentionally larger and more careful because all gate-related alignment should be handled together. Splitting the gate work would risk repeating the current problem: gate definition updated in one place, helper logic in another, and phase docs still describing a third shape.

Do not make a separate BUG-069 change. BUG-069 is not one implementation surface. It is the acceptance condition across both changes: a stop:no run should not require reading Engine source to infer hidden contracts.

## Change 1: `stabilize-agent-facing-work-unit-contracts`

Covers:

- BUG-066
- BUG-067
- The non-gate contract-surface portion of BUG-069

Goal:

Make the contract visible to the Agent truthful enough that a compliant first submit can pass without reading Engine source.

Implementation intent:

- Make generated `_work_units/.../result.schema.json` match submit-time validation.
- When `output_contract.source_claims.allowed !== true`, generated result schemas must omit `source_claims` and `accepted_source_urls`.
- When source claims are allowed, generated schemas must expose the exact accepted `source_claims[]` item shape: `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`, with `additionalProperties: false`.
- Generated schemas must expose the real `output_files[]` item shape: `path`, `role`, optional `source_url`, optional `source_slug`, with `role` constrained to the work-unit output contract's allowed roles.
- Use local JavaScript helper functions only. Do not add `zod-to-json-schema` or any new dependency.
- Fix `phase-seed-topics.md` task-card and result examples to use `queue_item_id` for queue demand identity, not retired `work_id`.
- Extend hygiene/static checks so phase Markdown task-card/result examples are scanned for retired queue identity fields and obvious contract drift.

Tests:

- A wave0 generated result schema does not advertise `source_claims` or `accepted_source_urls`.
- A wave1 generated result schema advertises strict `source_claims[]` item keys and rejects extra keys at the schema-contract level.
- A generated result schema's `output_files[].role` enum matches the work-unit output contract.
- Phase Markdown hygiene fails if a queue-demand task card uses `work_id` instead of `queue_item_id`.
- Existing submit-normalization tests continue to pass.

Out of scope:

- Gate selector semantics.
- Return-map reference policy.
- Submitted-ledger metadata amendment for historical bad rows.

Version target:

- `DPT_FRAMEWORK v0.12`

## Change 2: `align-gate-contracts-and-reference-navigation`

Covers:

- BUG-068
- BUG-070
- The gate/systemic portion of BUG-069

Goal:

Make gate definitions, helper implementations, phase instructions, inspect CLIs, and accepted specs line up as one coherent judgment layer.

This change is intentionally broader than the named bug symptoms. Its first task is a gate-alignment audit, and any discovered mismatch that affects pass/fail semantics is in scope for this change.

Implementation intent:

- Start with a gate audit artifact in `design.md`.
- Inventory every gate rule by:
  - gate definition rule id;
  - helper/check implementation;
  - artifact shape actually checked;
  - phase/subagent instruction that tells the Agent to produce that shape;
  - pass/fail consequence.
- Fix every discovered "gate declares X, helper checks Y, phase docs ask for Z" mismatch that affects gate pass/fail.
- Keep advisory-only research-quality desires out of this change unless they are already active gate requirements.

Wave1 output coverage:

- Required `artifacts/wave1/{topic}/evidence-summary.md` outputs must enter the submitted ledger as role `evidence_summary`.
- Required `artifacts/wave1/{topic}/question-list.md` outputs must enter the submitted ledger as role `question_list`.
- If a submitted result labels those required paths as `other`, submit should deterministically normalize the role before ledger append and record submit normalization.
- Keep `other` only for genuinely extra, non-blocking outputs.
- Do not add a general submitted-ledger amend path for historical bad rows in this change.

Depth-review refs:

- Update phase examples to use `_work_units/wave1/<work_id>` without a trailing slash.
- Canonicalize reviewed work-unit refs before exact submitted-ledger comparison, so harmless trailing slashes do not fail the gate.
- Continue rejecting unsafe refs and refs that do not point to submitted work-unit rows.

Seed-topic return-map refs:

- Evidence-bearing seed-topic return-map entries must include at least one concrete existing `reference/*.md` file.
- `artifacts/`, `_cache/`, and `_work_units/` refs may appear as secondary provenance, but they cannot be the only evidence navigation target.
- Reject glob/count summaries such as `reference/topic-*.md (8 files)` or non-ASCII count variants such as `reference/topic-*.md（8 个）`.
- Validate that concrete `reference/*.md` refs exist under the active bundle root.
- Update phase docs so the Agent is told that `reference/` is the primary consumer navigation layer and internal build surfaces are secondary provenance.
- Add explicit gate/helper coverage for this policy rather than relying on misleading diagnostic-only wording.

Diagnostic wording:

- Rename or remove `diagnosticOnly` labels where failures already affect pass/fail.
- Gate and inspect output should describe whether a return-map issue is blocking, advisory, or diagnostic-only.

Tests:

- Gate helper unit tests cover Wave1 role normalization, depth-review ref canonicalization, concrete reference ref extraction, glob rejection, and missing-file rejection.
- Fixture-level gate tests prove:
  - `role: other` on required Wave1 outputs no longer reaches gate as a silent downstream failure;
  - trailing slash depth refs pass after canonicalization;
  - seed-topic refs with only `artifacts/` / `_cache/` / `_work_units/` fail;
  - seed-topic refs with globbed `reference/` fail;
  - seed-topic refs with concrete existing `reference/*.md` pass.
- Static audit test proves every active gate rule has a known helper/check implementation and an artifact contract documented in the change design.
- Run OpenSpec governance checks before archive.

Version target:

- `DPT_FRAMEWORK v0.13`

## Implementation Order

1. Propose and apply `stabilize-agent-facing-work-unit-contracts`.
2. Propose and apply `align-gate-contracts-and-reference-navigation`.
3. After both changes pass regression/governance checks, move BUG-066 through BUG-070 to `_done/_fixed_bugs/` and close this plan.

## Acceptance Criteria

- A new wave0/wave1 work-unit can rely on its generated `result.schema.json` without reading Engine source.
- Seed-topic queue examples enqueue with `queue_item_id` on first try.
- Wave1 required outputs cannot be submitted with gate-invisible roles.
- Depth-review examples and validators agree on work-unit ref shape.
- Seed-topic return-map refs point to concrete consumer-facing `reference/*.md` files for evidence-bearing entries.
- The gate audit finds no active pass/fail rule whose definition, helper logic, and phase instruction disagree.
- `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` version banner are updated for each framework behavior change.

## Assumptions

- No Python and no new npm dependencies.
- Existing historical bad submitted rows do not need in-place ledger amend; the fix prevents future bad rows from being accepted.
- Any newly discovered gate mismatch found during Change 2 is in scope if it affects pass/fail semantics.
- Pure research-quality desires that are not current gate contracts become separate backlog items.
