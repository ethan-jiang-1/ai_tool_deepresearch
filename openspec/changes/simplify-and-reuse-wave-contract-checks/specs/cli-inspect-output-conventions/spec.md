> req: IOC-001, IOC-002, IOC-003, IOC-005

## MODIFIED Requirements

### Requirement: inspect-wave0-output.mjs structural checks

`inspect-wave0-output.mjs` SHALL evaluate Wave0 gate-consumable artifact and provenance contracts through the same rule evaluation route used by `wave0-complete`, in a side-effect-free inspect mode.

Inspect mode SHALL NOT execute lifecycle handoff preflight, routing, degraded handoff, gate-attempt counting, trace writes, checkpoint writes, or completion-only trace-event checks. It SHALL return `{ check, inspect, advice }` JSON, SHALL NOT output routing, and SHALL use exit code 0 for pass, 1 for known contract failure, and 2 for invocation/configuration error.

Wave0-specific structural checks SHALL continue to cover flat `reference/`, `00-shared-*.md` naming, required metadata and sections, `_INDEX.md`, `README.md`, and per-topic `artifacts/wave0/<topic>/source.yaml`. A check that is also a formal Wave0 gate condition SHALL use the same evaluator and rule id in inspect and gate modes. A presentation or maintenance convention that is not a formal gate condition MAY be reported as advisory but SHALL NOT independently fail the shared gate-contract result.

#### Scenario: Wave0 inspect reuses gate contract without side effects

- **WHEN** `inspect-wave0-output.mjs --bundle <bundle>` evaluates a bundle with a Wave0 gate-contract failure
- **THEN** the blocking finding SHALL use the same rule id and direct checker result as `wave0-complete`
- **AND** inspect SHALL NOT append gate attempts, trace events, checkpoints, or mutate status

#### Scenario: Wave0 inspect-only convention remains advisory

- **WHEN** a Wave0 presentation/maintenance convention is not part of formal gate pass/fail
- **THEN** inspect MAY report it as advisory
- **AND** the convention SHALL NOT make the shared gate-contract check fail

### Requirement: inspect-wave1-output.mjs structural checks

`inspect-wave1-output.mjs` SHALL evaluate Wave1 phase-owned artifact, structured depth-review, reference, ledger, cache, and provenance contracts through the same rule evaluation route used by `wave1-complete`, in a side-effect-free inspect mode.

The shared blocking checks SHALL cover per-topic references, metadata/required reader sections where they protect countable reference structure, paired `evidence-summary.md` and `question-list.md`, structured depth-review, submitted backing, explicit profile floors, and reference index/provenance checks. Pure Markdown presentation preferences such as equivalent whitespace or list-marker style SHALL use tolerant parsing or advisory findings unless they are required to locate a direct structured authority surface.

When a prerequisite fails, inspect SHALL short-circuit checks whose only input depends on that prerequisite. For example, a missing or unparseable depth-review SHALL be reported as the root failure without also emitting novelty, cache-mapping, and decision-consistency symptoms derived from the absent structure.

#### Scenario: Wave1 inspect exposes formal gate root cause before gate

- **WHEN** a Phase Agent runs Wave1 inspect after phase-owned artifacts are materialized
- **AND** a required structured depth-review field or submitted provenance binding is missing
- **THEN** inspect SHALL fail with the same root rule id used by `wave1-complete`
- **AND** advice SHALL name the bundle-relative repair surface without requiring Engine source reading

#### Scenario: equivalent Markdown presentation does not block

- **WHEN** Wave1 Markdown contains the required semantic sections and direct structured backing but uses an equivalent harmless whitespace or list style
- **THEN** presentation parsing SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT independently fail the Wave1 gate-contract result

### Requirement: inspect-wave2-output.mjs structural checks

`inspect-wave2-output.mjs` SHALL evaluate Wave2 triple-artifact, finding-index, ledger, synthesis reference, cross-reference backing, backfill, and submitted targeted-evidence contracts through the same rule evaluation route used by `wave2-complete`, in a side-effect-free inspect mode.

The blocking result SHALL use direct YAML/Markdown artifact facts and submitted provenance. A missing required finding field SHALL be reported before, and SHALL short-circuit, implication checks that require that field. The primary output SHALL not expand one missing field into repeated enum, handoff, eligibility, backing, and synthesis symptoms.

#### Scenario: missing finding field produces one root repair target

- **WHEN** `finding-index.yaml` has a finding missing `hitl2_handoff`
- **THEN** Wave2 inspect SHALL report the missing field and its bundle-relative artifact as the primary blocking root cause
- **AND** dependent checks that require `hitl2_handoff` SHALL be suppressed or linked as durable downstream detail rather than repeated primary failures

#### Scenario: Wave2 inspect and formal gate agree

- **WHEN** the same unchanged bundle is evaluated by Wave2 inspect mode and then by the formal Wave2 gate
- **THEN** artifact/provenance blocking rule ids SHALL agree
- **AND** only formal gate mode SHALL write gate attempt and routing evidence

### Requirement: Inspect output SHALL classify blocking, advisory, and diagnostic-only findings accurately

Inspect CLIs and shared inspect helpers SHALL classify findings according to the command result they affect:

- `blocking`: contributes to `check.passed: false` for the current command or names a formal gate failure condition.
- `advisory`: does not fail the current command and covers repair suggestions or presentation/maintenance preferences that are not authority blockers.
- `diagnostic-only`: cannot by itself establish or revoke gate coverage and does not contribute to current command failure.

A finding SHALL NOT be labeled diagnostic-only when it contributes to `check.passed: false`. A presentation preference SHALL NOT be promoted to blocking merely because it is easy to express as a regex when direct structured authority already proves the required fact.

For blocking deterministic contract findings, inspect output SHALL name the failing artifact/ref/field or rule, the expected direct shape or canonical value, and the nearest repair surface. If a prerequisite failure makes downstream checks non-actionable, the primary `inspect[]` SHALL contain the prerequisite root cause and SHALL short-circuit or group dependent symptoms outside the primary repair list.

#### Scenario: failed inspect command does not call its blocker diagnostic-only

- **WHEN** an inspect command counts a finding toward `check.passed: false`
- **THEN** the output SHALL classify that finding as blocking
- **AND** summary metadata SHALL NOT describe it as diagnostic-only

#### Scenario: presentation preference remains advisory

- **WHEN** a Markdown formatting difference does not change required structured authority, provenance, or semantic section availability
- **THEN** inspect SHALL accept the equivalent form or classify the difference as advisory
- **AND** it SHALL NOT fail the command solely for the preference

#### Scenario: prerequisite failure short-circuits symptoms

- **WHEN** a required structured parent object or artifact cannot be parsed
- **THEN** primary inspect output SHALL report that root cause first
- **AND** checks that require the missing parent SHALL not emit independent primary failures
