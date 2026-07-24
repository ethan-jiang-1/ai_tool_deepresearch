## Context

Change 1 is archived. Change 2 now owns the next normal-path defect: producer facts must become truthful before Gate feedback can usefully consume them. The accepted contracts already contain the essential authorities: `parseReferenceMetadata()` and the reference evaluator interpret rich reference bytes; `operate-work-unit dry-submit` derives one disposition without side effects; formal submit creates the only delegated completion/ledger coverage; Phase-owned reference/depth/return-map outputs are consumer projections after submitted backing; Wave inspect/Gate owns the final verdict.

The defect is their delivery order in the active Wave guidance, not a missing generic mechanism. The production diagnostic bundle remains read-only evidence. New evidence uses disposable bundles and retains the distinction between deterministic contract proof and live Agent/Sub-agent/external behavior.

## Goals / Non-Goals

**Goals:**

- Give Wave0 and Wave1 one direct producer-to-closeout loop, with the current canonical rich-reference contract visible at authoring.
- Put existing dry-submit immediately before formal submit in returned-work guidance and preserve its existing disposition/ownership boundary.
- Make successful submitted backing the sole trigger for Phase-owned reference/index, Wave1 depth-review, and seed return-map closeout.
- Keep feedback root-first and executable: one existing same-check path when legal, otherwise an explicit actor, terminal, Engine-owner, or missing-contract boundary.
- Verify deterministic contracts separately from real Agent/Sub-agent behavior and external research behavior.

**Non-Goals:**

- No second reference parser, YAML-frontmatter/fence/bare-YAML authority, byte-exact Markdown rule, generic linter, or directory scan.
- No change to DEW-013's validator, dry-submit classification, formal submit transaction, ledger authority, cache validator, Gate rules, or acceptance thresholds.
- No new lifecycle state, persistence, retry tree, controller, repair command, user checkpoint, Sub-agent authority, or manual provenance path.
- No claim that fixture tests prove provider/model tools, actual research, Agent execution, or native Sub-agent execution.

## Decisions

### D1. Reuse one reference interpretation and expose its three inputs

The implementation retains `DPT_FRAMEWORK/schema/contracts/reference.mjs` and the current reference evaluator/readers as the only rich-reference interpretation path. Wave0/Wave1 authoring guidance and diagnostics will name three separate roots:

```text
canonical bundle-relative filename
  + parser-aligned rich Markdown bytes
  + submitted source/cache/degraded backing
```

The parser continues to tolerate its accepted metadata presentation; the change must not infer whitespace strictness from the diagnostic bundle. `source.yaml` remains a separate top-level-YAML-array contract. A reference may be present and parseable yet unbacked, or backed yet noncanonical/unparseable; feedback reports the direct root rather than collapsing them into “reference invalid.”

The implementation may extract or reuse a pure diagnostic projection only if both authoring feedback and current inspect consume the same parser/evaluator result. It must not add another parser or make a prose/template check block independently.

### D2. Dry-submit is a Phase-entry checkpoint, not a new recovery subsystem

`DPT_FRAMEWORK/engine/work-unit-candidate-projection.mjs`, `work-unit-submit.mjs`, and `operate-work-unit.mjs` already own dry-submit's read-only evaluation and `recommended_action`. This change changes the Wave0/Wave1 consumer guidance and any narrow adapter needed to present those existing facts at the returned-work decision point:

```text
actor return
  -> dry-submit
     -> repair_same_candidate: authorized mechanical candidate repair -> same dry-submit
     -> return_to_actor: actor-owned semantic completion before work_done
     -> fail_and_replace: existing terminal/replacement operation, new work_id
     -> inspect_contract: existing Engine owner, terminal, or missing-contract boundary
  -> PASS -> formal submit -> submitted ledger row
```

Neither dry-submit nor its Phase guidance may write result semantics, cache declarations, receipt, queue, ledger, trace, or provenance by hand. A later formal submit always re-evaluates current bytes; dry-submit PASS is not a persisted success authority.

### D3. Closeout is a Phase-owned post-submit checklist

After each successful submit, the Phase Agent performs the bounded projection work appropriate to the Wave. The normal Wave1 order is:

```text
submitted row with declared source/cache/degraded backing
  -> materialize consumer reference and _INDEX row where backing permits
  -> write depth-review from non-derivable semantic judgments and submitted work refs
  -> replace applicable seed return-map token with meaning plus concrete navigation refs
  -> same Wave inspect
```

Wave0 performs the analogous submitted-backed shared-reference/index materialization. The checklist uses submitted rows as direct authority; it never copies actor-owned cache/receipt/result facts into a Phase file to manufacture coverage. `depth-review.yaml` stays a narrow Phase semantic judgment surface. Seed backfill stays a navigation/interpretation projection, not delegated completion proof.

The phase drain logic must ensure all returned work reaches an explicit disposition and all required Phase closeout has happened before inspect/Gate. It does not turn the Phase Agent into a Sub-agent repair proxy and does not require the Sub-agent to create Phase-owned artifacts.

### D4. Contract delivery is shared, not duplicated

The active consumers will be updated in their existing ownership layers:

- `phase-wave0.md` and `phase-wave1.md` own Wave order, returned-work handling, closeout and inspect placement.
- `shared-reference-template.md` and `shared-schemas.md` own parser-aligned authoring facts and canonical example shape.
- `shared-return-map-authoring.md` owns return-map field/token guidance.
- generated work-unit task/spawn guidance remains self-contained but only describes actor-owned result/receipt/output/cache responsibilities; it does not recreate phase-only closeout instructions.

Static/integration checks will protect this split so future edits do not put Phase closeout back into a Sub-agent task or turn the shared template into a competing parser.

### D5. Constitutional admission and complexity budget

| Question | Decision |
|---|---|
| Direct authority | Existing reference parser/evaluator; formal submitted ledger; submitted row backing; Phase depth/backfill files; existing inspect/Gate verdict. |
| Legal establishment/change path | Existing authoring write -> dry-submit -> existing submit or disposition -> Phase projection -> same inspect. |
| New state/check/controller | None. Existing dry-submit is reused; no durable projection, retry, watcher, or recovery state is introduced. |
| Smallest human decision | Normal loop has none. Only a new semantic/risk/permission/external boundary leaves the Agent loop. |
| Agent responsibility | Execute existing authorized commands and same-check mechanical repair; do not fabricate ownership surfaces. |
| Engine responsibility | Parse/evaluate deterministic facts, derive dry-submit disposition, submit/ledger mutation and inspect/Gate verdict. |
| Proof boundary | Deterministic test classes prove contracts; real disposable Subject evidence proves Agent/Sub-agent behavior; external calls prove search/fetch only when actually observed. |

This removes the implicit “formal submit first, then discover all producer failures at Gate” path. It adds no second validator and no new API; the only new delivery material is the shortest existing-loop instruction and focused diagnostics.

## Risks / Trade-offs

- [Risk] The rich template becomes a new strict parser by implication. -> Mitigation: test accepted metadata variants and assert YAML frontmatter/fences remain non-authority, rather than accepting only template bytes.
- [Risk] Phase guidance encourages editing actor-owned data. -> Mitigation: acceptance tests require each dry-submit disposition to identify same-candidate, actor-return, replacement, or owner/no-path and reject hand-written ledger/receipt/cache routes.
- [Risk] Closeout runs before delegated completion. -> Mitigation: integration tests assert rejected/dry-submit-only work creates neither consumer reference/index projection nor depth/backfill completion claim.
- [Risk] Per-topic closeout is omitted after a batch. -> Mitigation: phase guidance and deterministic E2E cover multi-topic drain, with inspect only after all submitted rows have an explicit closeout disposition.
- [Risk] Live evidence is overstated. -> Mitigation: verification plan labels Agent/Sub-agent/external execution `NOT_RUN` until a real disposable subject run preserves its native evidence.

## Migration Plan

1. Before target edits, validate this change's `verification-plan.yaml` and record baseline focused tests.
2. Update shared reference/return-map authoring surfaces and phase docs together so the actor/Phase boundary stays coherent.
3. Reuse existing reference evaluator and dry-submit output; add only a narrow adapter/diagnostic projection where the same evaluator can be reused by authoring feedback and inspect.
4. Add focused unit/integration/deterministic E2E coverage, then update the existing Wave0/Wave1 real-actor playbooks without claiming their run outcome in source control.
5. Run verification routing, OpenSpec/governance checks, apply the v0.46 release projection, and archive only with PASS/FAIL/NOT_RUN evidence at the stated claim boundaries.

Rollback is a compatibility-safe framework revert: no new bundle state or data migration is introduced. Existing bundles retain their current submitted rows and references; unrun live-agent evidence remains `NOT_RUN`, not a runtime state.

## Apply Target Manifest

| Surface | Action | Control impact |
|---|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | modify | Deliver canonical rich-reference, dry-submit, submitted closeout and inspect order. |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | modify | Deliver returned-work disposition and Phase-owned closeout checklist. |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-reference-template.md`, `shared-schemas.md`, `shared-return-map-authoring.md` | modify | One parser-aligned producer contract; no new authority. |
| Existing reference evaluator/inspect adapter only if required by D1 | modify narrowly | Reuse direct parser/evaluator facts in authoring feedback; no second validator. |
| Existing work-unit command guidance only if required by D2/D4 | modify narrowly | Point existing dry-submit result to Phase consumer; no command/state change. |
| Root `tests/` | modify/add | Unit, integration and deterministic E2E proof for actual deterministic contracts. |
| Existing Wave0/Wave1 `experiments_playbook/` cases | modify | Define real Subject evidence boundary; retain honest `NOT_RUN` when unavailable. |
| `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md` | modify | Project v0.46 after implementation verifies behavior. |
