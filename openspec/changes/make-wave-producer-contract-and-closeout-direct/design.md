## Context

Change 1 is archived. Change 2 now owns the next normal-path defect: producer facts must become truthful before Gate feedback can usefully consume them. The accepted contracts already contain the essential authorities: `parseReferenceMetadata()` and the reference evaluator interpret rich reference bytes; `operate-work-unit dry-submit` derives one disposition without side effects; formal submit creates the only delegated completion/ledger coverage; Phase-owned reference/depth/return-map outputs are consumer projections after submitted backing; Wave inspect/Gate owns the final verdict.

The defect is their delivery order in the active Wave guidance, not a missing generic mechanism. The production diagnostic bundle remains read-only evidence. New evidence uses disposable bundles and retains the distinction between deterministic contract proof and live Agent/Sub-agent/external behavior.

## Goals / Non-Goals

**Goals:**

- Give Wave0 source intake a direct template-delivery path and give Wave1 one direct returned-work-to-closeout path.
- Put existing dry-submit immediately before formal submit in returned-work guidance and preserve its existing disposition/ownership boundary.
- Keep successful submitted backing as the sole trigger for the existing Wave1 reference/index, depth-review, and seed return-map closeout.
- Keep feedback root-first and executable: one existing same-check path when legal, otherwise an explicit actor, terminal, Engine-owner, or missing-contract boundary.
- Verify the changed guidance separately from real Phase-Agent behavior and external research behavior.

**Non-Goals:**

- No second reference parser, YAML-frontmatter/fence/bare-YAML authority, byte-exact Markdown rule, generic linter, or directory scan.
- No change to DEW-013's validator, dry-submit classification, formal submit transaction, ledger authority, cache validator, Gate rules, or acceptance thresholds.
- No new lifecycle state, persistence, retry tree, controller, repair command, user checkpoint, Sub-agent authority, or manual provenance path.
- No claim that fixture tests prove provider/model tools, actual research, Agent execution, or native Sub-agent execution.

## Decisions

### D1. Deliver the existing Wave0 reference contract to its actual producer

The existing shared template and reference parser already define the accepted Wave0 rich-reference form. The implementation changes their delivery path, not their interpretation:

```text
shared-reference-template in actual `requires`
  -> source-intake actor writes declared `reference/00-shared-<slug>.md`
  -> existing formal submit establishes delegated backing
```

`phase-wave0.md` and `subagent-dpt-source-intake.md` SHALL load `shared/shared-reference-template` through their real `requires` chains. The role uses the template at the actor authoring boundary, including canonical naming, accepted metadata/sections, and `output_files[]` declaration for role `reference` plus `source_url`. The actor remains the writer; Phase guidance does not materialize, rename, or reconstruct Wave0 references after submit.

The parser continues to tolerate its accepted metadata presentation; `source.yaml` remains a separate top-level-YAML-array contract. No parser, evaluator, diagnostic adapter, strict template-byte rule, or alternate YAML authority is added.

### D2. Dry-submit is a Phase-entry checkpoint, not a new recovery subsystem

`DPT_FRAMEWORK/engine/work-unit-candidate-projection.mjs`, `work-unit-submit.mjs`, and `operate-work-unit.mjs` already own dry-submit's read-only evaluation and `recommended_action`. This change changes only the Wave1 Phase consumer guidance at the returned-work decision point:

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

### D3. Make the existing Wave1 closeout visible at its decision point

After each successful Wave1 submit, the Phase Agent performs the existing bounded projection work. Its order is:

```text
submitted row with declared source/cache/degraded backing
  -> materialize consumer reference and _INDEX row where backing permits
  -> write depth-review from non-derivable semantic judgments and submitted work refs
  -> replace applicable seed return-map token with meaning plus concrete navigation refs
  -> same Wave inspect
```

The checklist is one short pointer to existing Wave1 sections, not a second specification of their fields or validators. It uses submitted rows as direct authority; it never copies actor-owned cache/receipt/result facts into a Phase file to manufacture coverage. `depth-review.yaml` stays a narrow Phase semantic judgment surface. Seed backfill stays a navigation/interpretation projection, not delegated completion proof.

Wave1 drain logic must ensure all returned work reaches an explicit disposition and all required Phase closeout has happened before inspect/Gate. It does not turn the Phase Agent into a Sub-agent repair proxy and does not require the Sub-agent to create Phase-owned artifacts.

### D4. Contract delivery is shared, not duplicated

The active consumers will be updated in their existing ownership layers:

- `subagent-dpt-source-intake.md` owns the Wave0 actor authoring boundary and receives the existing reference template through `requires`.
- `phase-wave0.md` owns Wave0 role delivery and the existing submit/inspect order; it does not own Wave0 rich-reference production.
- `phase-wave1.md` owns returned-work ordering and the visible closeout checklist.
- Existing shared template, return-map guidance, work-unit guidance and accepted closeout contracts remain their current authority and are not rewritten.

One static integration check will protect this split, including the actual `requires` delivery and the absence of Phase-owned Wave0 reference production.

### D5. Constitutional admission and complexity budget

| Question | Decision |
|---|---|
| Direct authority | Existing reference parser/evaluator; formal submitted ledger; submitted row backing; Phase depth/backfill files; existing inspect/Gate verdict. |
| Legal establishment/change path | Wave0 actor authoring -> existing submit -> existing inspect; Wave1 returned candidate -> dry-submit -> existing disposition or formal submit -> existing Phase projection -> same inspect. |
| New state/check/controller | None. Existing dry-submit is reused; no durable projection, retry, watcher, or recovery state is introduced. |
| Smallest human decision | Normal loop has none. Only a new semantic/risk/permission/external boundary leaves the Agent loop. |
| Agent responsibility | Execute existing authorized commands and same-check mechanical repair; do not fabricate ownership surfaces. |
| Engine responsibility | Parse/evaluate deterministic facts, derive dry-submit disposition, submit/ledger mutation and inspect/Gate verdict. |
| Proof boundary | Deterministic test classes prove contracts; real disposable Subject evidence proves Agent/Sub-agent behavior; external calls prove search/fetch only when actually observed. |

For Wave1, this removes the implicit “formal submit first, then discover all producer failures at Gate” path. It adds no second validator and no new API; the only new delivery material is the shortest existing-loop instruction and focused diagnostics.

## Risks / Trade-offs

- [Risk] The rich template becomes a new strict parser by implication. -> Mitigation: make no parser/template edit and test only that the existing template is actually delivered to the producer.
- [Risk] Phase guidance encourages editing actor-owned data. -> Mitigation: acceptance tests require each dry-submit disposition to identify same-candidate, actor-return, replacement, or owner/no-path and reject hand-written ledger/receipt/cache routes.
- [Risk] Closeout runs before delegated completion. -> Mitigation: static integration assertions keep the checklist explicitly after formal submit; independent real Phase-Agent evidence covers the live sequence when available.
- [Risk] Per-topic closeout is omitted after a batch. -> Mitigation: phase guidance makes the checklist local to every successful submit, while the independent real Phase-Agent case preserves native evidence for the live path when it runs.
- [Risk] Live evidence is overstated. -> Mitigation: verification plan labels Agent/Sub-agent/external execution `NOT_RUN` until a real disposable subject run preserves its native evidence.

## Migration Plan

1. Before target edits, validate this change's `verification-plan.yaml` and record baseline focused tests.
2. Update only Wave0 producer delivery and Wave1 returned-work/checklist prose, preserving their established authority boundaries.
3. Add one focused static integration assertion and a new independent real Phase-Agent case without claiming its run outcome in source control.
4. Run verification routing, OpenSpec/governance checks, apply the v0.46 release projection, and archive only with PASS/FAIL/NOT_RUN evidence at the stated claim boundaries.

Rollback is a compatibility-safe framework revert: no new bundle state or data migration is introduced. Existing bundles retain their current submitted rows and references; unrun live-agent evidence remains `NOT_RUN`, not a runtime state.

## Apply Target Manifest

| Surface | Action | Control impact |
|---|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md`, `phase-wave0.md` | modify | Deliver the existing template at the Wave0 producer boundary; preserve direct Sub-agent output authority. |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | modify | Deliver dry-submit before formal submit and a visible existing closeout checklist. |
| `tests/integration/md/` | add | Static contract proof for actual guidance delivery, ownership and order. |
| `experiments_playbook/exp_wfn_wave1/`, `experiments_playbook/PLAYBOOK_MANIFEST.md`, `experiments_env/shared/run-iterative-interaction-subject.mjs` | add/modify | Independently prove real Phase-Agent closeout behavior when native evidence is available. |
| `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md` | modify | Project v0.46 after implementation verifies behavior. |
