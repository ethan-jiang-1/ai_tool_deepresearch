## Context

See `proposal.md`. The current case uses fixture-backed predecessor evidence for lifecycle stages it does not
itself test. Since the Wave1 carried-target receipt contract was added after this case, its bare successful
`wave1-complete` fixture call is silently rejected by the existing writer. The retained Headless Agent then
directly appended a trace row to continue. Separately, the rerun fixture invokes a Gate before its existing
style-projection prerequisite exists.

## Goals / Non-Goals

**Goals:**

- Make every case-51 prerequisite attempt use an existing legal writer and keep trace/log evidence paired.
- Make the declared rerun happy path pass on its first Gate attempt without hiding a real failure.
- Preserve the case's three-branch scope and its existing native verdict contract.

**Non-Goals:**

- Do not change Wave1, rerun, health, or Supervisor behavior.
- Do not turn this case into a complete Wave1 content/provenance experiment.
- Do not make missing work-unit authority look valid; the separate health-scope change owns that alignment.

## Decisions

### Use the existing Engine writer with a receipt-bound empty Wave1 fixture

The proceed fixture has no canonical topics requiring carried targets. It will derive the existing empty
`wave1-carried-targets/v1` receipt through the existing receipt selector and pass it to `writeGateAttempt` with
strict trace durability. This is the smallest lawful fixture for the already-established predecessor; it writes
both log and trace through the Engine instead of asking the Agent to fabricate an event.

Running a full Wave1 Gate was rejected because that would add unrelated topic, work-unit, and content fixtures to
a case whose bounded reader question is late-lifecycle handoffs. Hand-writing a trace event was rejected because
trace authority belongs to the Engine.

### Project research style before the first rerun Gate

After the fixture records its HITL2 rerun decision and advances into the rerun window, the playbook will run the
existing `apply-research-style` CLI for `quick_factual` before `rerun-ready`. The CLI owns the projection write;
the case will not copy a static parameter object into the profile. This keeps the direct source of truth as the
profile selected by the fixture plus the Engine-derived projection.

### Preserve the independent health-scope dependency

This change removes fixture-caused timeline and failed-attempt issues only. The currently required work-unit
authority for `standard` is an independent implementation/spec drift, so the clean-health Agent-flow verification
runs only after `experiment-progressive-run-diagnostic-standard-health-scope` is applied. This ordering avoids
masking a policy defect by padding this case with irrelevant work units.

### Evolution review

No named state, projection, command, or reader-facing view is added or materially changed. The useful distinction
is retained at the existing boundary: an Engine-authored Gate attempt is not equivalent to an Agent-authored
trace lookalike. The normal reader can stop at the paired trace/log and native health result. The control loop is
shorter: valid fixture -> real Gate -> health, replacing fixture failure -> Agent investigation -> manual trace
workaround -> health issue. The user supplied the progressive-run objective; the Agent performs existing legal
commands; the Engine owns the deterministic write and verdict.

## Risks / Trade-offs

- The receipt selector may reveal an additional fixture prerequisite -> stop at its direct diagnostic and add a
  narrowly scoped follow-up rather than hand-writing a receipt.
- A real Headless Agent can still violate the Markdown boundary -> the retained native trace/log and health report
  remain the authoritative failure evidence.
- The dependent health-scope change may not land -> retain this proposal without claiming a standalone CLEAN run.

## Migration Plan

1. Apply the standard-health-scope change first.
2. Update only the case-51 fixture commands and validate the playbook.
3. Run one bounded real case-51 requalification and inspect its retained report.
4. If the run is not native `PASS` plus `CLEAN`, preserve the run root and return to the smallest observed root
   cause; do not loosen the profile or manually repair retained evidence.

Rollback is a source reversion of the playbook change; no persisted runtime schema, migration, or framework
version changes are involved.
