# P2: Traceable Focus Coverage

> Proposed OpenSpec change name: `add-traceable-topic-focus-coverage`
> Status: completed; archived as `2026-08-08-add-traceable-topic-focus-coverage`
> Dependencies: P0 complete, P1 archived as
> `2026-08-08-align-topic-focus-and-rerun-guidance`

> Archive outcome: the governed finalizer passed all archive checks on
> 2026-08-08. Deterministic unit, integration, and rerun-chain evidence passed.
> Case 125 remains a registered, unlaunched real Agent-flow surface; no native
> PASS, FAIL, ERROR, or NOT_RUN outcome is claimed for it.

## Goal

Add a narrow deterministic proof that an emphasized Topic's declared focus
commitments have accepted submitted evidence backing or an explicit visible
limitation. The Engine proves traceability, not semantic correctness; HITL2
continues to own the user's usefulness judgment.

## Proposed Shape to Validate in the Change

The current leading candidate is an optional focus-coverage block in the
existing per-Topic `artifacts/wave1/{topic}/depth-review.yaml`. It is only a
candidate until proposal/design review proves that it answers a precise reader
question and adds less complexity than a separate artifact or Gate.

Each commitment would retain a readable statement, controlled coverage status,
and references to existing submitted work/evidence/finding coordinates or a
visible limitation. The Engine would validate only these direct bindings and
the P0-approved outcome semantics.

## Scope Lock

In scope:

- optional focus-coverage data attached to existing depth-review process
  evidence only when an approved focus/current rerun direction exists;
- direct checks that covered commitments resolve to submitted backing and that
  partial/blocked commitments remain visible and legally routed;
- focused Agent guidance for deriving a smallest useful commitment set from
  the already user-corrected natural-language interpretation;
- exact repair diagnostics through existing Wave/queue/rerun authority.

Out of scope:

- semantic scoring, LLM self-rating, natural-language parsing by the Engine,
  per-Topic source floors, Topic weights, a standalone lifecycle Gate, or a
  third HITL;
- new retry controller, hidden fallback, or automatic rerun;
- reader-facing reference layout changes (P3).

## Candidate Capability Discovery

| Capability | Initial disposition | Reason |
| --- | --- | --- |
| `research/research-wave-gate-implementation` | Modify | Owns Wave completion rules, direct evidence checks, and repair diagnostics. |
| `research/wave1-intake` | Modify | Owns depth-review production and supplementary deepening semantics. |
| `research/research-wave-phase-content` | Modify | Owns Agent-readable Wave guidance and current-rerun treatment. |
| `research/research-styles` | Verify-only | Baseline numeric floors remain shared, not emphasis controls. |
| `workflow/rerun-incremental-node` | Verify-only or Modify | Revisit only if P1's existing direction cannot feed the chosen proof shape. |
| `engine/gate-skeleton` | Verify-only | Reuse existing Gate mechanics unless P2 proves a generic contract gap. |
| `workflow/repair-loop` | Verify-only | P2 must consume existing legal repair/routing rather than add a new branch. |

## Definition of Ready

- [x] P0 records the reader evidence model and precise `partial`/`blocked`
  routing semantics.
- [x] P1 is archived with deterministic carrier contracts verified and no
  unresolved conflict in the relevant active specs. Its retained Agent-flow
  attempts are explicitly not semantic-success evidence.
- [x] The proposal names the one reader question that focus coverage answers
  and the exact direct source records the Engine may inspect.
- [x] The design proves why one optional extension to depth review is simpler
  than a new ledger, controller, or canonical Topic field.
- [x] The verification plan includes a real focus-driven incremental run, not
  only hand-authored YAML that pretends to be research evidence.

## Progressive Checklist

### Proposal and design

- [x] Re-run capability discovery and determine whether each candidate is
  Modify, Verify-only, Excluded, or New; register new requirement IDs only if
  a genuinely new capability is required.
- [x] Write semantic-precision reasoning for the coverage view: reader,
  bounded question, retained differences, and normal stop/unknown result.
- [x] Write the shortest direct-fact control loop: submitted evidence/direction
  -> coverage check -> minimal diagnostic -> existing legal repair or honest
  boundary -> same checkpoint re-evaluation.
- [x] Specify all allowed statuses, required backing/limitation coordinates,
  and the P0-approved behavior of `partial` and `blocked`.
- [x] Scope-lock the change against any semantic-quality verdict or new
  lifecycle/checkpoint authority.

### Apply and evidence

- [x] Complete plan review before target edits.
- [x] Implement schema/parser/checker changes together with the Phase-owned
  producer guidance; do not validate a field no legal writer can establish.
- [x] Add unit proof for status/binding validation and diagnostics.
- [x] Add integration proof using real submitted work-unit facts, cache/provenance
  mapping, and depth-review coordinates.
- [x] Add deterministic E2E proof that historical evidence cannot satisfy a
  current focus commitment after rerun.
- [x] Add or update a real `agent_flow_e2e` case that starts from a natural
  focus, performs real incremental work, and produces a trace-backed coverage
  outcome or honest limitation.

### Closeout

- [x] Run the selected deterministic verification evidence and preserve actual
  Gate results rather than a chat claim of success. Case 125 was not launched,
  so no native Agent-flow trace result is asserted.
- [x] Run all required governance and verification-routing checks.
- [x] Close out, sync/re-compare, and archive through the governed lifecycle.

## Exit Check and Handoff

P2 is complete. The Engine can explain, from direct facts, why every declared
focus commitment is covered, partial, or blocked, and the user can still use
HITL2 to judge whether the result is useful. P3 receives stable,
provenance-backed increment coordinates from the archived change's main-spec
requirements and implementation evidence; it must not infer them from file
names or counts.
