---
bug_id: BUG-162
title: Wave1 inspect applies Seed return-map parser to evidence artifacts
severity: P1
phase: wave1
source: current Codex run, OpenSpec evolution/popularity/user-demands bundle
surfaced_at: 2026-07-29
status: resolved
resolved: 2026-07-30
resolved_by: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators
verification: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators/apply-evidence.md
---

# BUG-162: Wave1 artifact contract collides with Seed return-map inspection

## C1 Disposition (2026-07-30)

Resolved by OpenSpec change `converge-artifact-contract-evaluators` (v0.61).
Wave1 evidence-summary and question-list files retain their declared artifact
contracts; only Seed Topic projection slots are return-map inputs. The recorded
real bundle passed `inspect-wave1-output` with 68 checks and no failed rule
IDs, while the focused production-CLI regression retains malformed Seed Topic
findings as an independent failure. Deterministic verification coordinates are
retained in the change's `apply-evidence.md`.

C1 does not weaken any independently applicable artifact, submitted-backing,
depth-review, or reference-convergence rule. A future failure in those direct
contracts remains outside this resolved parser collision.

## What happened

After two Wave1 work units passed dry-submit and formal submit, the normal
`inspect-wave1-output.mjs` checkpoint inspected their standard delegated files:

- `artifacts/wave1/01_openspec-evolution-problem/evidence-summary.md`
- `artifacts/wave1/01_openspec-evolution-problem/question-list.md`
- `artifacts/wave1/02_peer-influence-derivative-ecosystem/evidence-summary.md`
- `artifacts/wave1/02_peer-influence-derivative-ecosystem/question-list.md`

The inspect returned blocking roots including:

- `return_map_missing_fields`
- `return_map_naked_evidence_list`
- `return_map_unsupported_prose`

It required `evidence_meaning`, `relationship`, `refs`, `status`, and
`next_hop` in these files. The files otherwise follow the loaded Wave1 role
contract: Source URLs, Key Findings, Open Questions, and the four required
question-list sections. The canonical `dpt-evidence-extractor` role says the
Phase Agent owns Seed Topic projection and does not require a delegated
evidence summary or question list to be a return-map document.

## Impact

Valid delegated Wave1 artifacts can be submitted and ledger-covered yet remain
blocked at the same Wave1 inspect because a different artifact grammar is
applied to them. Adding return-map fields mechanically would mix reader-facing
evidence/question content with Seed projection semantics and could hide the
actual boundary error. It also creates a second repair loop after the already
required Phase-owned reference, depth-review, and Seed projection steps.

## Expected behavior

Wave1 inspect should validate `evidence-summary.md` and `question-list.md`
against their accepted artifact contracts, while validating return-map fields
only on the Seed Topic projection surface (or another explicitly declared
return-map output). The two parsers should not share a blocking path merely
because both files contain URLs or evidence prose.

## Direct evidence

Bundle:
`dpt_rb_openspec-evolution-popularity-user-demands`

Submitted work units:

- `wu-w1-b000-deep-i0001`
- `wu-w1-b000-deep-i0002`

Checkpoint:
`node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle <bundle>`

Observed result: `passed: false`; the return-map roots above were listed as
blocking even though the files were the exact declared `evidence_summary` and
`question_list` outputs of submitted Wave1 work units.

## Current-head follow-up after legal data closeout

The same bundle was continued through the existing legal data-only path:

- all five Wave1 work units reached formal `submitted`;
- Phase-owned references, depth reviews, and all three Wave1 Seed projection
  slots were materialized from submitted backing;
- `reference/_INDEX.md` synchronized to 66 rows;
- `inspect-bundle`, `validate-bundle`, and `operate-topic-state inspect` passed.

Rerunning the same inspect still returned `passed: false` with 78 blocking
findings. The only failed rule families were:

- `return_map_missing_fields`;
- `return_map_naked_evidence_list`;
- `return_map_unsupported_prose`.

The findings covered ordinary `evidence-summary.md`, `question-list.md`, and
normal rich `reference/*.md` files across all five topics, including the newly
materialized topics 03 and 05. No depth-review, reference-floor, seed-token,
submitted-backing, or topic-state root remained. This separates the parser
collision from the earlier missing-projection data work and confirms that
adding synthetic fields to the documents would be a contract-contaminating
workaround, not a legitimate repair.

## Classification and model note

This is a deterministic evaluator-scope/contract collision, distinct from the
weak-actor materialization failure recorded in BUG-161. The Coding Agent is
Codex and the runtime-visible model family is GPT-5; the exact deployment ID
and delegated actor models are not exposed. Actor quality does not explain a
return-map parser being applied to already submitted standard artifacts.

## Disposition

Do not alter framework code in this run and do not contaminate the two artifact
files with synthetic return-map entries. Continue only through existing legal
data-only materialization and projection paths; keep this card open for a
bounded OpenSpec change with an evaluator-scope regression.
