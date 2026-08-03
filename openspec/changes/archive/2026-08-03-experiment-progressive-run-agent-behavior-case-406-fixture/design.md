## Context

See `proposal.md` for the retained run observation. Case-406 already has the
correct native verdict boundary: it claims one real `dpt-source-intake` result
through receipt/output validation and `operate-work-unit submit`, then stops.
The case's `heavy` health declaration instead asks the Supervisor for standard
Gate diagnostics, while the Playbook expressly does not execute a Wave0 Gate.
The generic Wave0 scaffold also defaults to fixture-authored handoff and
completion trace rows; case-211 already introduced an opt-out for the same
reasoning boundary.

## Goals / Non-Goals

**Goals:**

- Make case-406's declared health scope match its submitted actor-checkpoint
  boundary.
- Keep fixture setup from asserting a Wave0 handoff or completion.
- Lock the policy, trace boundary, native checks, and Light health result in a
  deterministic integration test.
- Requalify real actor behavior only through a fresh profile-selected bounded
  `agent_flow_e2e` run.

**Non-Goals:**

- Do not change the health verifier, monitor artifact format, Gate behavior,
  work-unit schema, queue behavior, or native completion protocol.
- Do not add a synthetic monitor artifact, run a Gate merely to satisfy
  health, or treat a fixture-owned result as Subject-Agent evidence.
- Do not change the fixture helper's default trace behavior for other callers.

## Decisions

### Declare Light health for the early actor boundary

The frontmatter becomes `health_profile: light`. The accepted observability
contract assigns standard/heavy Gate diagnostics only where that deterministic
surface is in scope, and explicitly allows a Heavy-cost real-Agent case that
stops early to select Light health. The six native checks, declared durable
Subject evidence, work-unit ledger, and submit trace remain unchanged; their
authority is not transferred to health.

Keeping `heavy` and adding a monitor is rejected. A monitor may only report a
real Gate invocation, while this case's contract intentionally has no legal
Wave0 Gate claim. Lowering the case filename cost is also rejected because
filename cost and health policy are separately owned facts.

### Opt out of synthetic Wave0 trace only for case-406

`realSubagentCase` will pass `syntheticWave0Trace` from the case descriptor to
the existing `writeWave0Scaffold` option, defaulting to `true` for every other
real-subagent case. The case-406 descriptor sets it to `false`. This retains
the generic helper and avoids a duplicate scaffold path.

The case's status/setup files remain controlled fixture input, but no
fixture-authored `gate_attempt`, `load_complete`, or `wave0_completion` row is
allowed. Creating a new state or a monitor-less Gate artifact is rejected:
neither answers a new bounded question, and both would blur setup input with
phase truth.

### Test the actual composition seam

The existing case-406 integration test already prepares a disposable bundle,
uses the production work-unit helper with explicitly labeled test-owned bytes,
submits through the runner, and reads trace facts. It will additionally assert
the Light policy, absence of synthetic Wave0 facts, no monitor directory, and
clean Light health. This is the smallest deterministic loop that would have
caught the reported `PASS + ISSUES` condition.

That test proves only fixture/playbook composition and Supervisor health
mechanics. A fresh selected Headless run remains the sole proof of real
Sub-agent behavior and uses the Playbook's own native completion and retained
evidence.

### Evolution and responsibility review

No named state, projection, command, module, or reader-facing view is added or
materially changed. The semantic boundary becomes more precise: an operator
can answer whether the actor checkpoint is valid without inferring a Wave0
transition. The direct sources of record are the runner verdict, submitted
ledger/receipt/output, `rb_trace.jsonl`, native completion, and selected health
report.

The control path is a net simplification: it removes impossible monitor
coverage and synthetic phase facts rather than adding checks, recovery, or
derived state. The user authorized continued bounded work; the Agent performs
the mechanical repair and profile-selected run; the Engine remains the submit,
trace, completion, and health authority.

## Risks / Trade-offs

- A future edit may restore the generic synthetic trace by omission -> the
  integration regression asserts the case-specific opt-out and trace absence.
- Light health does not independently audit ledger/cache provenance -> native
  checks and retained Subject evidence still bind the case's actual claim;
  Wave0 provenance remains owned by a separate full-phase playbook.
- A fresh profile may select a different case -> record that profile fact and
  do not force case-406 with `--case`.
- The real Sub-agent may be unavailable or exceed the bounded envelope ->
  retain the resulting native boundary and report it without fabricating a
  requalification.

## Migration Plan

1. Validate the change's verification-routing plan before target edits.
2. Add the red-capable integration assertions, then change only the case
   descriptor and case-406 frontmatter.
3. Run focused tests, canonical playbook validation, routing/governance
   checks, and record the static evidence.
4. Run a fresh discovery preflight. If it selects case-406 within the existing
   `300000` ms predicted-duration and `$1.35` total/per-case envelope, execute
   exactly that one Headless requalification with a `600000` ms timeout.
5. Record the native outcome and health separately, then archive the focused
   fixture change. Rollback is a source reversion only; no runtime migration is
   needed.
