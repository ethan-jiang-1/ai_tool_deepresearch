> req: GSK-011

## MODIFIED Requirements

### Requirement: Active gate rule audit SHALL be executable

The active Gate audit SHALL automatically enumerate schema-parsed active
definitions and independent Gate CLI wrappers, verify their bijection, and
validate every active rule's stable identity, checked-authority descriptor,
finding source, and any definition-owned closed `blocking_basis`,
repair-kind/next-action `write_to`, and registered coordinate placeholders
through the shared Gate-definition schema. It SHALL include the production
definition-read no-bypass check without maintaining a permanent reader
inventory.

The audit SHALL NOT require or maintain a second rule-id-granular catalog of
producer instructions, artifact categories, runtime authorities, checker
routes, root bases, repair routes, diagnostic surfaces, classifications,
non-Agent-produced exemptions, or test-guard paths. Checked authority SHALL
come from the parsed rule descriptor; definition-owned root contract SHALL come
from parsed metadata; checker-owned root contract SHALL come from the detecting
finding; active Gate rules are blocking by definition; diagnostic projection
SHALL come from the shared finding/result builder.

For a definition-owned typed descriptor, the audit SHALL validate its
type-specific parsed fields and prove the corresponding evaluator behavior
through a focused current-definition regression. The descriptor and evaluator
test are the complete audit evidence for that direct rule contract; a separate
human-maintained per-rule closure or artifact catalog SHALL NOT be introduced.

Checker support SHALL be proved behaviorally through current-definition Gate
pass regressions, evaluator-family unknown-check and checker-owned
missing-root-contract fail-closed tests, and focused regression for each
changed checker/root class. Shared Wave evaluator versus formal-only behavior
SHALL be verified at the evaluator/detecting-helper class boundary rather than
copied into every rule row. Agent producer guidance SHALL receive focused
Markdown contract coverage when this Change modifies an Agent-owned output
surface; `engine_operation`, `user_decision`, `external_action`, and
`missing_contract` roots SHALL NOT require a per-rule exemption or root
catalog.

Distinct failure-source classes outside the definition rule loop, including
invalid invocation, definition/config load, node/gate binding, lifecycle
handoff/status preflight, canonical topic-state or gate-specific prerequisite,
routing, and durable handoff trace failure, SHALL each have representative
structured-finding and hint-projection coverage. The audit SHALL not require a
Cartesian product of every Gate and every shared failure class, and SHALL not
use source-code prose or object-literal regexes as an architecture verdict.

When this Change removes or downgrades a blocking rule, its known checker
branch, degradation wording, producer wording, and blocking fixtures SHALL be
removed or reclassified in the same change. This cleanup SHALL be targeted to
the changed rule and SHALL NOT create a permanent retired-rule inventory.

#### Scenario: New rule without finding source fails audit

- **WHEN** an active Gate definition adds a blocking rule without a valid
  finding-source contract or with an incomplete definition-owned basis/repair
  contract
- **THEN** the audit SHALL fail and name the gate/rule

#### Scenario: Current definitions prove checker support through execution

- **WHEN** the all-Gate regression runs each schema-parsed active definition
  on its representative valid bundle
- **THEN** every active rule SHALL execute without an unsupported-check result
- **AND** an injected unknown check in each evaluator family SHALL fail closed
  as configuration integrity rather than being skipped

#### Scenario: Duplicate rule catalog is not required

- **WHEN** an active rule is added with valid schema metadata and supported
  execution
- **THEN** the audit SHALL derive checked authority, definition/checker root
  lineage, classification, and diagnostic projection from the production
  contract path
- **AND** it SHALL NOT require a second producer/authority/checker/basis/repair/
  diagnostic/test inventory row

#### Scenario: Typed descriptor is audited from definition and behavior

- **WHEN** an active definition changes a typed direct-output descriptor
- **THEN** the audit SHALL validate that descriptor from the parsed definition
- **AND** focused evaluator/Gate coverage SHALL prove its pass and direct
  failure behavior without a parallel catalog row

#### Scenario: Wrapper preflight failure stays helper-owned

- **WHEN** a formal Gate wrapper adds or changes a failure exit outside
  definition rule evaluation
- **THEN** the detecting helper SHALL provide the stable root id, blocking
  basis, repair kind, exact next-action coordinate, and focused test for that
  failure class
- **AND** the wrapper SHALL project the helper finding through the shared
  result builder rather than reconstruct repair lineage from prose

#### Scenario: Removed blocker leaves no active shadow rule

- **WHEN** a blocking Gate rule is removed or downgraded
- **THEN** its known checker branch, degradation eligibility, producer wording,
  and regression expectations SHALL be removed or reclassified in the same
  change
- **AND** no hidden helper SHALL continue to fail the Gate for the retired
  preference

#### Scenario: every active rule has known implementation

- **WHEN** the static gate audit scans active gate definitions
- **THEN** every rule id SHALL map to a known CLI dispatch or shared helper
- **AND** the audit SHALL pass only when no unknown active check names remain

#### Scenario: unsupported check name fails audit

- **WHEN** an active gate definition contains `check: "removed_check_name"`
- **THEN** the audit SHALL fail
- **AND** diagnostics SHALL name the gate file, rule id, and check value

#### Scenario: archives are not audited

- **WHEN** archived OpenSpec changes contain stale gate wording
- **THEN** this active gate audit SHALL ignore those archives
- **AND** it SHALL only validate current framework gate definitions and current
  helper/CLI implementation
