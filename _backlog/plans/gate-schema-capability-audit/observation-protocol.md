# Systematic Observation Protocol

> Execution protocol for the overall
> [`gate-schema-capability-audit.md`](../gate-schema-capability-audit.md). Gap hypotheses are in
> [`hypotheses-and-prompt-feedback.md`](hypotheses-and-prompt-feedback.md); direct facts are in
> [`evidence-base.md`](evidence-base.md).

## G2 Precheck: Audit Authority Meta-Contract

Before sampling blocking Agent↔Engine obligations, create one current-head meta-contract observation
for the mutually exclusive clauses in the accepted Gate-audit requirement. Record the current
disposition of both clause sets and the branch implemented by the executable audit.

This precheck is not a seventh blocking obligation and does not authorize an implementation change.
Until the authority is clarified, neither clause set can be treated as the complete audit baseline.

## Six Initial Blocking Obligations

Each sample must include at least one normal path and one failure/recovery path.

| Obligation sample | Primary gap | Consumers/decision points to cover |
|---|---|---|
| work-unit direct output + dry-submit | G1, G2 | claim projection, authoring, dry-submit, formal submit |
| Queue payload executable demand | G1, G2 | enqueue, check/inspect, claim, stale repair |
| Wave1 semantic-section contract | G2 | definition, dispatch, direct evaluator, Gate feedback |
| submitted evidence + depth review | G2, G3 | provenance authority, derived checks, root masking, replacement |
| terminal failure / repair successor | G3 | fail, preempt/enqueue, inspect, Gate, repeated-failure terminal |
| Final selected-finding backing | proof boundary, G1 | Agent selection/projection, submitted backing, semantic review |

Expand this set only when direct evidence introduces a new mechanism, authority, or consumer type.
Rule count alone does not earn priority.

## Three Separate Proof Classes

1. **Static contract delivery**: the generated/rendered Agent surface contains current-attempt facts and
   no competing normative copy.
2. **Deterministic Engine behavior**: identical facts produce the same verdict, root, and legal action
   at every consumer through the owning Engine path.
3. **Real `agent_flow_e2e` behavior**: retained real-Agent first return, reads, tool calls, next action,
   and convergence trajectory.

These classes cannot substitute for each other. When host/tool execution is unavailable, record
`NOT_RUN` or `UNOBSERVED`. Prompt substrings, mock transcripts, impossible hand-built snapshots, and
ordinary fixtures cannot support a behavior claim.

## Shared Metrics

| Dimension | Metrics |
|---|---|
| Constructibility | first-attempt acceptance, Engine-source inspection, rejection distance, batch rewrite size |
| Parity | authority-clause conflict, evaluator count, checkpoint disagreement, late rejection, round trip, orphan artifacts |
| Feedback | raw findings / independent roots, action-coordinate coverage, illegal recommendation rate |
| Convergence | same-check repair turns, manual authority edit/bypass incidence, terminal/no-path rate |
| Bounded recovery | repair-descendant depth, share of repeated failures that still add successors |
| Backing | selected key findings with submitted backing; semantic adequacy recorded separately by Agent/HITL |
| Adherence | first-return status, first-read surface, root/next-action match, host/tool status |

Establish a current-head baseline before setting thresholds. Do not create one cross-Gate quality score.

## Observation Record

```yaml
incident_id: OBS-...
current_head: <commit>
observation_kind: <blocking_obligation|authority_meta_contract>
obligation: <one blocking Agent-Engine obligation or one audit meta-contract>
direct_fact: <minimal reproducible fact or retained real-agent observation>
accepted_authority: <schema/state/spec/receipt/ledger>
authority_conflicts: <none or exact mutually exclusive clauses>
producer_projection:
  owner: <who must construct it>
  decision_point: <where/when>
  first_surface_seen: <generated task / phase / feedback / other>
consumers:
  - <admission / claim / inspect / gate / recovery / projection>
actual_evaluator: <shared evaluator or duplicate path>
smallest_root: <one root or independent root set>
next_action:
  repair_kind: <...>
  write_to: <exact coordinate or null>
  rerun: <same checkpoint or null>
  reachable_now: <true|false>
terminal_boundary: <none or honest no-path/owner>
proof:
  static_contract_delivery: <PASS|FAIL|NOT_RUN>
  deterministic_engine: <PASS|FAIL|NOT_RUN>
  real_agent_flow: <PASS|FAIL|UNOBSERVED|NOT_RUN>
historical_analogue: <optional; never current-head proof>
```

## Priority

| Priority | Required current evidence | Typical consequence |
|---|---|---|
| **P0** | authority/provenance pollution, contradictory state from identical facts, unbounded recovery, or automatic mutation despite no legal path | corrupt ledger/hash/receipt, infinite descendants, downstream backing pollution |
| **P1** | repeated expensive retry, batch rewrite, late Gate rejection, manual authority edit, or unsafe bypass | large token/file waste and operator contract bypass |
| **P2** | correct root and legal action with local wording/order/presentation friction only | one-step recovery without authority impact |

Priority requires current-head direct evidence and blast radius. Historical similarity, rule count, file
length, and apparent semantic weakness only help select a sample.

## Existing Remediation Ownership

[`bug-200-204-gate-and-queue-remediation.md`](../bug-200-204-gate-and-queue-remediation.md) retains
implementation ownership:

| Existing change | Observation contribution | Boundary |
|---|---|---|
| `harden-gate-and-recovery-contracts` | real dispatch/evaluator parity; no-submitted-evidence root; terminal Engine-path recovery | no BUG-201 conclusion from definition regex; no BUG-204 repair selected from old schema/hash narrative |
| `remove-recursive-queue-failure-repair` | successor legality, descendant depth, finite terminal/no-path | no global generic repair controller or invented lifecycle state |

G1 first observes adoption of the accepted Completion Contract pattern at other producer decision
points. This audit does not automatically create a third change. A proposal requires a supported H1-H4
finding, current P0/P1 evidence, and a mechanism not already covered by accepted authority.

## Completion Conditions

1. Record and disposition the Gate-audit authority meta-contract conflict.
2. Build a current-head consumer matrix for all six blocking obligations.
3. Classify direct evidence as supporting, weakening, or leaving H1-H4 uncertain.
4. Keep all three proof classes separate; mark host/tool gaps `NOT_RUN` or `UNOBSERVED`.
5. Propose only P0/P1 mechanisms not covered by an accepted contract.
6. Return prompt-side findings as decision-point projection, structured-root consumption, and real
   adherence observation rather than longer static instructions.
