## Context

See `proposal.md` for the observed Phase 3 failure. Both topic-rewrite cases overwrite a newly created bundle's current plan frontmatter with a legacy registry and then invoke the HITL1 Gate before the selected style projection exists. The current HITL1 contract instead has three existing owners: the Agent owns the semantic rewrite/body and retained approved topic input; `advance-status` establishes the legal HITL1 window; `operate-topic-state` atomically writes canonical topic identity and UID-bound seed skeletons; the returned `style_projection` handoff names the only legal style writer.

No executable contract needs modification. This is a playbook conformance repair, but it touches two Markdown fixtures and needs both static and real-run evidence, so the design fixes their common sequence explicitly.

## Goals / Non-Goals

**Goals:**

- Preserve the vague and detailed rewrite claims, contents, frontmatter policies, and native verdict rules.
- Make the two fixtures use the existing HITL1 legal window and existing topic-state/style writers before their first verdict-affecting HITL1 Gate.
- Keep the proof boundary explicit: a focused integration test locks Markdown composition; only a current selected real run establishes Headless Playbook-Agent evidence.

**Non-Goals:**

- Do not change canonical topic-state schemas, lifecycle transitions, Gate conditions, style definitions, health policy, selector logic, or framework version.
- Do not turn these deterministic fixtures into real topic-rewrite-quality or research-access experiments.
- Do not run case-182 out of selector order merely because its source fixture is repaired.

## Decisions

### Keep rewrite semantics in Markdown; route canonical identity through the existing Engine writer

Each case will retain its Goal, Scope, user-term, and no-over-rewrite text as Agent-owned Markdown content. It will create a case-owned retained JSON input containing its approved `add_topic` actions, then use the existing initial instantiation -> HITL1 handoff and status synchronization before one `operate-topic-state apply`. The Engine will assign UID/ordinal/slug, write the canonical registry, and create matched seed skeletons atomically.

Directly placing a legacy registry in `rb_plan.md` or manually writing matching seed files is rejected: it recreates the same authority gap seen in the retained run. A `migrate_legacy` recovery is also rejected because a fresh disposable fixture starts from the current template; it should create its initial topic state normally rather than intentionally manufacture legacy data and then repair it.

### Consume the committed style handoff, not a hand-authored parameter object

After the committed topic-state output is stored, each fixture will read `style_projection`. When it reports `refresh_required`, the fixture executes its exact returned command and checks its stdout against the returned selected profile and committed topic count before running `hitl1-recorded`. The test data continues to record a deterministic synthetic research-access observation, but it will not manually add `research_style_params`.

An unconditional hard-coded style command is rejected because the existing handoff is the direct committed fact that determines whether style work is needed. A static profile parameter object is rejected because `apply-research-style.mjs` is its sole writer.

### Use one static contract test for the shared fixture boundary

`tests/integration/md/topic-rewrite-fixtures-contract.test.mjs` will read both Markdown files. It will assert their V2 deterministic-contract policies, retained per-case semantic checks, one retained HITL1 topic-state input with the expected topic count, use of the existing state writer in the correct order, returned style-handoff consumption before the first HITL1 Gate, and absence of fixture-owned direct registry/seed identity writes.

The test is deliberately an `integration` contract: it proves source composition only. The current calibration selector must choose any real `agent_flow_e2e` run. If its fresh one-case preflight no longer selects case-181, preserve that fact and do not substitute an arbitrary `--case` run.

### Evolution review

No named state, projection, command, module, or reader-facing view is introduced or materially changed. The existing distinction that matters to a maintainer is preserved: rewrite semantics are Agent-owned, while canonical topic identity and style parameters are Engine-owned direct facts. The maintainer can stop at the committed writer outputs and native/health evidence rather than reconstructing an Agent repair transcript.

The control path is a net simplification: legal HITL1 entry -> one topic-state apply -> its one returned style handoff -> Gate. It replaces legacy fixture -> failed Gate -> ad hoc canonical/seed repair -> failed Gate -> manual style repair -> Gate. The user supplies the progressive-run objective; the Agent executes authorized commands in the playbook; the Engine creates and verifies canonical state, style projection, Gate attempts, and native outcome. No user permission, new mutation authority, or second verdict is introduced.

## Risks / Trade-offs

- **A fixture's retained input is malformed or violates the current HITL1 window** -> `operate-topic-state` returns the direct root; correct only the case-owned input/sequence and rerun the same operation.
- **The style handoff is unavailable or its exact command fails** -> preserve the direct output and treat it as a real existing-owner boundary; do not hand-write parameters or bypass the Gate.
- **The requalification is native FAIL or health is not CLEAN** -> retain the run root/report and create a new focused root-cause change only if the evidence identifies a distinct actionable defect.
- **Current calibration does not select case-181 after source repair** -> record the fresh selector result and stop the requalification task rather than manually choosing a case.

## Migration Plan

1. Complete the feedback plan review and routing-plan validation before target edits.
2. Update the two fixtures and add the integration contract test.
3. Run focused static validation and the canonical playbook validator.
4. Recompute a bounded one-case calibration envelope; run and inspect case-181 only when current selection authorizes it.
5. Record the result in the progressive-run plan, run governance/routing checks, then complete closeout review and archive.

Rollback is a source reversion of the two fixtures and one test. No runtime schema, persisted migration, framework asset, or version banner changes are involved.
