## Context

Wave0/Wave1/Wave2 each evaluate formal findings, decide whether their existing fatigue-threshold degraded policy is eligible, resolve the existing transition route, write a durable `gate_attempt`, then emit a Gate envelope. The current wrappers reuse `evaluateWaveDegradationEligibility()`, but each projects `finalEvaluation.failed_rule_ids` after deciding a degraded handoff. That leaves the same quality rule both routeable and publicly labelled failed.

The direct facts are unchanged: schema-parsed Gate definitions, checker-owned structured findings, the shared Wave evaluator result, transition resolution, and trace-write result. `check` is a reader-facing projection of those facts, not a new authority. This change starts after the existing invocation, definition, node-binding, and handoff-preflight paths have established a Wave evaluation context; those early error envelopes retain their accepted `GSK-002` contract. Existing handoff consumers already preserve `degraded`, `degraded_reason`, and `degraded_rules` from a passed `gate_attempt` into `load_complete` and `advance-status`.

## Goals / Non-Goals

**Goals:**

- Make every public Wave Gate response classify exactly one routing verdict: clean pass, blocking failure, or degraded handoff.
- Preserve all unresolved quality facts in formal findings, inspect/advice detail, pass diagnostic, and trace while making `failed_rule_ids` mean only currently blocking rules.
- Reuse one narrow pure summary projection across the three Wave wrappers when that removes their identical post-eligibility classification code.
- Retain existing legitimate degraded routing, durable handoff witnessing, exit codes, and handoff consumers.

**Non-Goals:**

- No change to evaluator rule truth, degradation eligibility, evidence, queue, ledger, receipt, status, or transitions.
- No new persisted verdict state, generic controller, retry/recovery branch, second evaluator, or new trace event family.
- No claim that a degraded handoff is a clean evidence-quality pass, and no user interaction at non-terminal nodes.

## Decisions

### D1. Define the public verdict as a routing-quality partition

The shared projection will receive the final direct findings plus the existing degraded-eligibility result and resolved route. It will produce only the public classification fields:

| Verdict | `passed` | `failed_rule_ids` | `degraded` / `degraded_rules` | `next` |
| --- | --- | --- | --- | --- |
| clean pass | `true` | `[]` | false/absent, `[]` | legal route |
| blocking failure | `false` | nonempty | false/absent, `[]` | `null` |
| degraded handoff | `true` | `[]` | `true`, nonempty | legal route |

Only an existing eligible quality-only degraded decision may move a direct finding from the public blocking set into `degraded_rules`. Its original structured finding remains intact in the diagnostic projection. A routing/configuration/durability failure is still blocking and therefore cancels any candidate degraded handoff. The three-way partition applies to the normal Wave formal-evaluation envelope after existing preflight, not to unrelated invocation/configuration envelopes.

Alternative: redefine `passed` as all quality rules satisfied. Rejected because it removes the accepted degraded-handoff route and conflates quality completion with legal routing again.

### D2. Extract only the duplicated projection

The three wrappers retain wave-specific evaluator invocation, attempt counting, degradation eligibility, route lookup, Wave1 carried-target receipt handling, and durable write. A small pure helper may accept those already-derived facts and return the public summary partition. It must not read files, infer eligibility, write trace, resolve transitions, or mutate findings.

Alternative: a new `GateVerdict` runtime record or central Gate runner. Rejected because the existing Gate envelope and handoff trace already provide the required reader surface; a second state/controller would add another authority and recovery path.

### D3. Keep durable failure as the final override

The current strict `writeGateAttempt` path remains the sole durability authority for a routed pass. If it fails, each wrapper emits exactly one failed envelope whose `failed_rule_ids` comes from the durability/routing findings and whose `next` is null. It must not retain candidate `degraded_rules` as a routeable verdict or later emit the earlier passed envelope.

### D4. Consumers and trend diagnostics retain the existing degraded context

`enter-phase`, `advance-status`, handoff helpers, diagnostics, and Agent-facing phase guidance will be audited against the partition. They continue accepting a passed route with `degraded: true`, carry `degraded_rules` forward, and must not describe that path as evidence-quality completion. No consumer derives clean/degraded meaning from `failed_rule_ids` alone or invents a follow-up user decision.

The existing attempt-trend helper is also a consumer: it currently compares only `failed_rule_ids` from diagnostics. For a degraded handoff it SHALL compare the stable union of public blockers and `degraded_rules`, so a carried floor remains `still_failing` rather than becoming a false newly-passing quality rule. This is internal comparison input only; it does not add a public field or change the public blocking list.

### D5. Guideline review

This changes one existing reader-facing projection. Its bounded question is: “May this Gate legally hand off now, and is the handoff clean or carrying declared quality debt?” Blocking failures and carried debt must remain distinct because they change both routing and risk interpretation. A reader can stop at these fields for normal handoff; diagnostics remain for root-cause work.

The shortest loop remains `direct findings -> one pure classification -> existing route/witness -> existing next action`. Moving eligible IDs out of the blocking public set removes the contradictory duplicate classification; it adds neither validator nor recovery mechanism. Engine determines the verdict and writes the witness; the Agent follows the existing `check.next` and reads degradation context; the user gains no new operational duty or override.

## Risks / Trade-offs

- [Compatibility] Existing diagnostic consumers may use `failed_rule_ids` as an all-unresolved-quality list. -> Audit all repository consumers; use explicit `degraded_rules` for carried quality debt and preserve full finding detail.
- [False clean interpretation] A consumer may ignore `degraded`. -> Lock the three-row output matrix and handoff propagation with focused CLI and trace tests plus focused guidance coverage.
- [Over-extraction] A shared helper could absorb routing/durability decisions. -> Keep its inputs already-derived and side-effect-free; wrappers remain owner of their existing operations.
- [Trace fallback regression] A failed strict write could leak a prior pass. -> Test the one-failed-envelope path for both clean and candidate-degraded routes.

## Migration Plan

1. Validate `verification-plan.yaml` before implementation; the change extends existing registered requirements `GSK-004` and `RWG-021`.
2. Add focused public-matrix tests around the projection and each Wave CLI before changing wrapper behavior.
3. Replace only duplicated summary classification, audit trace/handoff/guidance consumers, and bump the framework to `v0.59`.
4. Run focused tests plus the declared disposable degradation observation; roll back by reverting code and documentation only. No bundle data migration is required.

## Open Questions

None. The current Wave2 production eligibility set remains unchanged; its ineligible roots must still fail closed.
