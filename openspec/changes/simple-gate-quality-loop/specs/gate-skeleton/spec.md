## MODIFIED Requirements

> req: GSK-006, GSK-007, GSK-008, GSK-009

### Requirement: Gate CLI SHALL support trace-durable degraded pass for eligible repeated failures

Lifecycle gate CLIs SHALL support a degraded pass outcome for eligible repeated gate failures. A degraded pass is a pass for phase handoff purposes only; it SHALL be distinguishable from a clean pass and SHALL NOT assert that all normal quality rules passed.

A gate MAY emit a degraded pass only when all of the following deterministic preconditions are satisfied:

- the gate belongs to a non-bootstrap lifecycle phase whose node is `stop: no`;
- the Agent-reported or Engine-derived attempt count has reached the configured fatigue threshold;
- lifecycle handoff/status preflight for the current node is satisfied;
- required structural, schema, trace, queue, work-unit submit, work-unit provenance, and hash/nonce integrity checks that protect runtime truth have passed;
- every failing rule is explicitly classified as degradation-eligible, such as an accepted soft profile-derived threshold that does not protect runtime truth; and
- the gate can append a durable `gate_attempt` trace event containing `passed: true`, `degraded: true`, `degraded_reason`, `degraded_rules`, `currentNodeRef`, and normal `next`.

A degraded pass SHALL set `check.passed: true`, `check.degraded: true`, and `check.next` to the normal deterministic next node. It SHALL include inspect/advice explaining which rules were degraded and which quality risks carry forward. If the trace event cannot be written durably, the gate SHALL fail closed and SHALL NOT report handoff success.

#### Scenario: Eligible repeated failure degrades with trace witness

- **WHEN** a Wave0 gate has reached fatigue threshold
- **AND** structural, status, queue, work-unit, provenance, and hash checks pass
- **AND** the only remaining failures are degradation-eligible quality thresholds
- **THEN** the gate SHALL emit `check.passed: true`
- **AND** `check.degraded` SHALL be `true`
- **AND** `check.next` SHALL name the normal next lifecycle node
- **AND** `rb_trace.jsonl` SHALL contain a matching degraded `gate_attempt`

#### Scenario: Runtime-truth failure cannot degrade

- **WHEN** a wave gate has a missing submitted work-unit ledger row, stale `delegated_in_flight`, invalid status window, failed handoff preflight, hash drift, or nonce mismatch
- **THEN** the gate SHALL NOT emit a degraded pass
- **AND** the gate SHALL fail closed with inspect/advice naming the runtime-truth blocker

#### Scenario: Degraded pass is not clean quality evidence

- **WHEN** a downstream tool reads a degraded `gate_attempt`
- **THEN** it SHALL treat the event as legal handoff evidence
- **AND** it SHALL preserve `degraded: true` and the degraded rule details as quality risk context
- **AND** it SHALL NOT report the source phase as a clean quality pass

### Requirement: Gate feedback SHALL separate root causes from symptoms

Gate quality-control loops SHALL stay KISS: blocking checks MUST be deterministic, low false-positive, independently explainable, and repairable through accepted Engine or Agent workflow paths. A gate SHALL NOT add broad heuristic patches that themselves require extra quality-control logic, diagnostic-only exceptions, or repeated false-positive handling to be usable.

Because gate feedback drives the Markdown Controller's next actions, noisy gate feedback is not harmless. A gate SHALL NOT send guess-based advice that asks the Controller to repair duplicate URLs, homepage-looking URLs, Jaccard overlap, self-referential prose, or other brittle content heuristics. These signals SHALL be removed from the phase-boundary quality loop unless they are restated as deterministic authority checks over accepted surfaces.

Gate output SHALL organize diagnostics so the Agent can identify the next repair target without reading a long flat list of equally weighted failures. The structured output SHALL preserve full diagnostics, but the primary `inspect[]` and `advice[]` surfaces SHALL prefer root causes before downstream symptoms.

At minimum:

- blocking rules SHALL be limited to deterministic authority surfaces such as schema, queue, status, trace, work-unit ledger, provenance, hash, cache coverage/content, and route-bound handoff checks;
- brittle content heuristics SHALL NOT be patched into phase-boundary gates as blocking rules or diagnostic-only gate advice;
- blocking root causes SHALL be identified before symptom/cascade diagnostics;
- symptom diagnostics SHALL name their upstream cause when known;
- advice SHALL avoid duplicate repair instructions for failures that will resolve when the root cause is repaired;
- advice SHALL stay concise enough for an Agent to act without losing the phase context; and
- advice SHALL NOT tell the Agent to hand-edit runtime authority files such as `rb_status.json`, `rb_output_declarations.jsonl`, `_work_units/_index.json`, or hash-bound work-unit result surfaces.

#### Scenario: Brittle heuristic is removed instead of patched again

- **WHEN** a gate rule produces repeated false positives and can only be kept by adding diagnostic-only mode, broad degradation exceptions, or special advice suppressions
- **THEN** the rule SHALL be removed from the phase-boundary gate unless it can be restated as a deterministic authority check
- **AND** the useful deterministic concern SHALL be moved to its proper schema, ledger, provenance, cache, trace, queue, or handoff check

#### Scenario: Cache drift does not bury the root cause

- **WHEN** a gate detects cache coverage drift that causes downstream output coverage symptoms
- **THEN** inspect SHALL identify cache coverage as the root cause
- **AND** downstream provenance symptoms SHALL be marked as symptoms or cascade details
- **AND** advice SHALL give one Engine-mediated repair target rather than separate manual edits for every symptom

#### Scenario: Advice does not recommend manual authority edits

- **WHEN** a gate detects status drift, ledger drift, hash drift, or provenance mismatch
- **THEN** advice SHALL direct the Agent to valid Engine repair, retry, rollback, terminal/retry, or resubmit paths
- **AND** advice SHALL NOT instruct the Agent to edit authority files by hand
