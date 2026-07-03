# Workflow Node Contract (delta)

> req: WNC-001, WNC-002, WNC-007, WNC-008, WNC-009

## Purpose

Add `execution_contract` frontmatter to workflow Markdown nodes, declaring which surface reads/executes the file, what the legal search path is, and how role specs are delivered to Sub-agents. Promote `shared-subagent-protocol` and `shared-anti-cheating-rules` to mandatory context for relay-capable phases. Extend workflow validation to enforce contract consistency.

## MODIFIED Requirements

### Requirement: Phase node metadata contract

Manifest lifecycle phase nodes SHALL add an `execution_contract` frontmatter object. The contract identifies the surface that reads/executes the Markdown and the legal search path for that surface.

`execution_contract` SHALL support these fields:

| Field | Required | Applies To | Meaning |
|-------|----------|------------|---------|
| `surface` | yes | all workflow Markdown nodes covered by this change | One of `phase-agent`, `relay-subagent-role`, `shared-guidance` |
| `search_policy` | yes | all workflow Markdown nodes covered by this change | One of `no_search`, `relay_required`, `relay_required_for_new_evidence`, `subagent_performs_search` |
| `delegated_role_keys` | conditional | `surface: phase-agent` with relay-capable search policy | Role keys that this lifecycle node may delegate to through relay task cards |
| `loaded_by` | conditional | `surface: relay-subagent-role` | SHALL be `phase-agent`; the Phase Agent reads the role spec |
| `delivered_via` | conditional | `surface: relay-subagent-role` | SHALL be `relay_task_md`; the Sub-agent receives a bounded relay slot task, not this Markdown file directly |

`surface: phase-agent` means the Markdown is a manifest lifecycle node read and executed by the Phase Agent. It MAY instruct the Phase Agent to enqueue task cards and delegate work, but the Phase Agent remains the queue/task controller.

`surface: relay-subagent-role` means the Markdown is a role specification used by the Phase Agent to construct relay `task.md` content. It is not a manifest lifecycle phase, and the Sub-agent actor does not directly load it.

`surface: shared-guidance` means the Markdown is shared context/guidance only. It does not execute a lifecycle phase and does not authorize direct search.

`search_policy` semantics:

- `no_search`: the surface SHALL NOT initiate WebSearch/WebFetch work.
- `relay_required`: any task card or task template that performs WebSearch/WebFetch SHALL use `targets.controller: "main-agent"` with `targets.delegates.to: "sub-agent"` and a `targets.delegates.role_key` listed in `delegated_role_keys`.
- `relay_required_for_new_evidence`: main-agent synthesis/backfill is allowed, but any task card or task template that creates new search/evidence/reference output SHALL delegate through relay using one of `delegated_role_keys`.
- `subagent_performs_search`: the role spec describes search behavior performed by the Sub-agent after the Phase Agent delivers a bounded relay `task.md` and `result.schema.json`.

For lifecycle nodes with `search_policy: relay_required` or `relay_required_for_new_evidence`, the node frontmatter SHALL put `shared/shared-subagent-protocol` and `shared/shared-anti-cheating-rules` in `requires`, not only `suggested_context`. This guarantees the relay communication contract and forbidden authority rules are loaded before the phase body.

For Wave2, a main-agent synthesis/backfill task MAY perform triage and enqueue or stage delegated search tasks. It SHALL NOT directly perform WebSearch/WebFetch and write new reference/evidence outputs unless the new-evidence task is delegated through relay.

The lifecycle inventory covered by this change SHALL be explicit:

| Lifecycle node | surface | search_policy | delegated_role_keys |
|----------------|---------|---------------|---------------------|
| `phases/phase-instantiation.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-hitl1.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-setup.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-seed-topics.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-wave0.md` | `phase-agent` | `relay_required` | [`dpt-source-intake`] |
| `phases/phase-wave1.md` | `phase-agent` | `relay_required` | [`dpt-evidence-extractor`] |
| `phases/phase-wave2.md` | `phase-agent` | `relay_required_for_new_evidence` | [`dpt-topic-scout`, `dpt-evidence-extractor`] |
| `phases/phase-hitl2.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-readiness.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-rerun.md` | `phase-agent` | `no_search` | omitted/empty |
| `phases/phase-final.md` | `phase-agent` | `no_search` | omitted/empty |

This contract is Agent-readable and validator-enforceable guidance. It SHALL NOT replace relay receipts, `rb_output_declarations.jsonl`, slot markers, or gate provenance checks as deterministic authority.

#### Scenario: Wave0 lifecycle node declares required relay search

- **WHEN** `phase-wave0.md` frontmatter is updated
- **THEN** it SHALL declare `execution_contract.surface: phase-agent`
- **AND** `execution_contract.search_policy: relay_required`
- **AND** `execution_contract.delegated_role_keys` SHALL include `dpt-source-intake`
- **AND** WebSearch/WebFetch task templates in the node SHALL delegate with `targets.controller: "main-agent"` and `targets.delegates.to: "sub-agent"`

#### Scenario: Wave1 lifecycle node declares current-wave relay role

- **WHEN** `phase-wave1.md` frontmatter is updated
- **THEN** it SHALL declare `execution_contract.surface: phase-agent`
- **AND** `execution_contract.search_policy: relay_required`
- **AND** `execution_contract.delegated_role_keys` SHALL include `dpt-evidence-extractor`
- **AND** a Wave1 search task template using `dpt-source-intake` SHALL fail workflow validation

#### Scenario: Wave2 lifecycle node distinguishes synthesis from new evidence

- **WHEN** `phase-wave2.md` frontmatter is updated
- **THEN** it SHALL declare `execution_contract.surface: phase-agent`
- **AND** `execution_contract.search_policy: relay_required_for_new_evidence`
- **AND** `execution_contract.delegated_role_keys` SHALL include `dpt-topic-scout` and `dpt-evidence-extractor`
- **AND** pure synthesis/backfill task templates MAY keep `targets.controller: "main-agent"` without `targets.delegates`
- **AND** gap-fill, explore/exploit search, supplementary evidence, or promoted reference task templates SHALL delegate through relay

#### Scenario: Non-search lifecycle node declares no_search

- **WHEN** instantiation, HITL, setup, seed-topics, readiness, rerun, final, or another non-search lifecycle node frontmatter is updated
- **THEN** it SHALL declare `execution_contract.surface: phase-agent`
- **AND** `execution_contract.search_policy: no_search`
- **AND** task templates under that node SHALL NOT perform WebSearch/WebFetch

### Requirement: Shared node metadata contract

Shared guidance nodes touched by this change SHALL declare `execution_contract.surface: shared-guidance` and `execution_contract.search_policy: no_search`, unless the file is explicitly a relay subagent role spec.

At minimum, this change SHALL cover these shared guidance nodes when their frontmatter is updated:

- `shared/shared-silent-execution.md`
- `shared/shared-subagent-protocol.md`
- `shared/shared-anti-cheating-rules.md`

Relay subagent role specs SHALL declare:

- `execution_contract.surface: relay-subagent-role`
- `execution_contract.search_policy: subagent_performs_search`
- `execution_contract.loaded_by: phase-agent`
- `execution_contract.delivered_via: relay_task_md`

Role spec inventory:

| Role spec | Role key | Required H1 |
|-----------|----------|-------------|
| `phases/subagent-dpt-source-intake.md` | `dpt-source-intake` | `# Relay Role: dpt-source-intake — Foundation Reference Intake` |
| `phases/subagent-dpt-evidence-extractor.md` | `dpt-evidence-extractor` | `# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening` |
| `phases/subagent-dpt-topic-scout.md` | `dpt-topic-scout` | `# Relay Role: dpt-topic-scout — Gap-Fill Search` |

Each role spec SHALL declare matching role identity across filename, frontmatter, and body:

- filename SHALL be `subagent-<role-key>.md`
- frontmatter `id` SHALL match the filename basename
- frontmatter `role` SHALL equal the delegated role key
- `## 0. Role Brief` SHALL contain `Role key` equal to the same delegated role key

Each role spec frontmatter SHALL use this shape:

```yaml
node_type: shared
id: subagent-dpt-...
shared_scope: subagent-protocol
role: dpt-...
authority: guidance-only
execution_contract:
  surface: relay-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: relay_task_md
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
```

Role specs SHALL NOT include lifecycle frontmatter fields `phase`, `gate`, or `stop`. Role specs SHALL NOT appear in `manifest.phases[]` or `manifest.shared[]`; `node_type: shared` is a loader/dependency classification, not permission to globally load them as shared guidance.

Their body SHALL state that the Phase Agent reads the role spec to construct relay slot instructions, and that the actual Sub-agent receives only the relay slot `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache context.

#### Scenario: Subagent role spec is not directly executed

- **WHEN** `subagent-dpt-evidence-extractor.md` frontmatter declares `surface: relay-subagent-role`
- **THEN** the file SHALL NOT be treated as a manifest lifecycle phase
- **AND** its H1 SHALL be `# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening`
- **AND** validator output SHALL describe it as Phase-Agent-loaded role guidance delivered via relay task files
- **AND** the body SHALL NOT imply that the Sub-agent directly loads the Markdown node

#### Scenario: Shared guidance remains non-executing

- **WHEN** a shared guidance node declares `surface: shared-guidance`
- **THEN** it SHALL NOT become a hidden phase, queue controller, or direct search authority

### Requirement: Workflow package consistency validation

Workflow package validation SHALL check `execution_contract` consistency alongside manifest phase entries, phase/shared node frontmatter, gate definitions, transition tables, and loader dependency plans.

The validator SHALL report at least these additional mismatch classes:

- missing `execution_contract` on lifecycle phase nodes, shared nodes touched by this change, or relay subagent role specs covered by this change
- unknown `surface` or `search_policy` value
- lifecycle node missing from the explicit inventory above
- `surface: relay-subagent-role` listed in `manifest.phases[]`
- relay role spec listed in `manifest.shared[]`
- `surface: relay-subagent-role` missing `loaded_by: phase-agent` or `delivered_via: relay_task_md`
- relay role spec missing required `node_type`, `shared_scope`, `authority`, `requires`, or `suggested_context` frontmatter shape
- relay role spec H1 missing, starting with `# Phase:`, or disagreeing with the role inventory
- relay role spec filename, frontmatter `id`, frontmatter `role`, or `Role Brief` role key disagree
- manifest lifecycle phase missing ordered `Execution Brief` fields
- relay role spec missing ordered `Role Brief` fields or using lifecycle-primary headings as its role body structure
- shared guidance declaring a search-capable policy without a future explicit delta
- `search_policy: relay_required` task template performs WebSearch/WebFetch without `targets.delegates.to: "sub-agent"`
- delegated task template uses `targets.controller: "sub-agent"` instead of the wire value `targets.controller: "main-agent"`
- delegated task template uses a role key not listed in the lifecycle node's `delegated_role_keys`
- `search_policy: relay_required_for_new_evidence` Wave2 search/evidence/reference task template lacks relay delegation
- relay-capable lifecycle node keeps `shared/shared-subagent-protocol` or `shared/shared-anti-cheating-rules` only in `suggested_context` instead of `requires`

For Wave2, validation SHALL NOT require the entire phase to spawn a Sub-agent. It SHALL only require relay delegation for new search/evidence/reference task templates or promoted reference outputs. Pure synthesis/backfill task templates controlled by the Phase Agent SHALL remain valid without `targets.delegates`.

**Three-layer defense boundary**: The relay enforcement model has three layers with distinct failure modes and responsibility boundaries:

1. **Build-time validator** (this requirement, WNC-007): Validates `execution_contract` consistency in workflow Markdown files — checks that task templates declare correct `targets` wire shape and role keys. This layer catches authoring errors before a run starts. It SHALL NOT prevent a Phase Agent from constructing a non-compliant task card at runtime, because the Agent generates `rb_queue.json` entries dynamically, not from static templates.
2. **Agent discipline** (execution_contract in frontmatter + phase body instructions): The Phase Agent reads `search_policy: relay_required` and phase body instructions, and is expected to construct compliant task cards. This layer is guidance — it relies on the Agent following instructions. A bypassing Agent can ignore it.
3. **Gate provenance** (RPG-001 through RPG-005): The post-hoc enforcement layer. Even if layers 1 and 2 fail, the gate checks current-wave output declaration coverage and successful slot binding. Direct-written artifacts without relay provenance fail the gate. This is the deterministic backstop.

Each layer catches what the layer above cannot. The validator catches template errors, Agent discipline catches most runtime compliance, and gate provenance catches everything else. No single layer is sufficient alone.

#### Scenario: Delegated search task matches execution contract

- **WHEN** a Wave0 task template contains WebSearch/WebFetch instructions
- **AND** the task template uses `targets.controller: "main-agent"`
- **AND** `targets.delegates.to: "sub-agent"`
- **AND** `targets.delegates.role_key: "dpt-source-intake"`
- **THEN** workflow validation SHALL accept the delegation shape

#### Scenario: Missing delegate is rejected for relay_required phase

- **WHEN** a Wave1 task template contains WebSearch/WebFetch instructions
- **AND** the task template only declares `targets.controller: "main-agent"` without `targets.delegates`
- **THEN** workflow validation SHALL fail and point to the missing relay delegation

#### Scenario: Wave2 pure synthesis is not forced through relay

- **WHEN** a Wave2 synthesis/backfill task template does not perform new search or write new reference/evidence artifacts
- **THEN** workflow validation SHALL NOT require `targets.delegates`
- **AND** it SHALL NOT require `_subagents/wave_02` to exist

### Requirement: Self-documenting lifecycle and relay role nodes

Workflow Markdown nodes SHALL expose their execution identity at first load without changing runtime authority.

Every manifest lifecycle phase node SHALL contain `## 0. Execution Brief` immediately after the H1 and before `## 1. Stage Goal`. The brief SHALL contain exactly these fields in this order:

1. `Objective`
2. `Start here`
3. `Path to pass`
4. `Completion check`
5. `Failure posture`

Every lifecycle phase node SHALL retain the existing 9-section phase body after the brief:

1. `## 1. Stage Goal`
2. `## 2. Required Inputs`
3. `## 3. Allowed Actions`
4. `## 4. Expected Artifacts`
5. `## 5. Gate Command`
6. `## 6. On Gate Pass`
7. `## 7. On Gate Fail`
8. `## 8. Stop Behavior`
9. `## 9. Anti-Cheating Rules`

Every relay role spec SHALL contain `## 0. Role Brief` immediately after the H1. The brief SHALL contain exactly these fields in this order:

1. `Role key`
2. `Used by`
3. `Receives`
4. `Produces`
5. `Boundary`
6. `Handoff`

Every relay role spec SHALL use a role-oriented body structure after the brief:

1. `## 1. Purpose`
2. `## 2. Search Focus`
3. `## 3. Artifacts`
4. `## 4. Execution Within Relay Slot`
5. `## 5. Page Content Fetching`
6. `## 6. Anti-Cheating Rules`
7. `## 7. Relationship to Phase Agent`

Role specs SHALL NOT use lifecycle-primary headings such as `## 1. Stage Goal`, `## 5. Gate Command`, or `## 8. Stop Behavior` as their primary role structure.

`Execution Brief` and `Role Brief` are Agent orientation layers only. They SHALL NOT replace schemas, queue state, relay receipts, output declarations, trace, transition routing, or gate CLI verdicts as deterministic authority.

#### Scenario: Lifecycle phase has ordered execution brief

- **WHEN** workflow package validation reads any `manifest.phases[].node`
- **THEN** the node SHALL contain `## 0. Execution Brief`
- **AND** the five required fields SHALL appear in order before `## 1. Stage Goal`
- **AND** the node SHALL retain the 9-section phase body

#### Scenario: Relay role spec has ordered role brief

- **WHEN** workflow package validation reads `subagent-dpt-topic-scout.md`
- **THEN** the node H1 SHALL be `# Relay Role: dpt-topic-scout — Gap-Fill Search`
- **AND** the node SHALL contain `## 0. Role Brief`
- **AND** the six required fields SHALL appear in order
- **AND** the node SHALL use the fixed role-oriented body structure
- **AND** lifecycle-primary headings SHALL NOT define its primary structure
- **AND** the node SHALL NOT contain lifecycle frontmatter fields `phase`, `gate`, or `stop`
- **AND** the node SHALL NOT appear in `manifest.phases[]` or `manifest.shared[]`

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

Lifecycle header injection SHALL continue to use manifest lifecycle membership as authority. The new `execution_contract.surface` field SHALL reinforce, not replace, that boundary:

- `surface: phase-agent` MAY receive autonomous or terminal-delivery header injection when the file is also a manifest lifecycle phase and satisfies the existing stop/gate conditions.
- `surface: relay-subagent-role` SHALL NOT receive lifecycle autonomous or terminal-delivery header injection.
- `surface: shared-guidance` SHALL NOT receive lifecycle autonomous or terminal-delivery header injection.

#### Scenario: Relay role surface does not receive lifecycle header

- **WHEN** `assessNode()` or a future loader reads `subagent-dpt-topic-scout.md`
- **AND** its frontmatter declares `execution_contract.surface: relay-subagent-role`
- **THEN** the returned Markdown content SHALL NOT contain a lifecycle autonomous or terminal-delivery contract header
- **AND** lifecycle behavior SHALL NOT be inferred from filename, `phase`, `gate`, `stop`, or role-like frontmatter alone

#### Scenario: Header injection boundary uses manifest membership

- **WHEN** workflow-chain tests need to prove lifecycle header injection is not triggered by non-manifest files
- **THEN** they MAY use a synthetic non-manifest relay-like fixture with `stop: "no"`
- **AND** they SHALL NOT add `stop` to real relay role specs for test convenience

### Requirement: Sub-agent role specs SHALL mandate standard library output serialization

Sub-agent role specs SHALL require that all structured output files written by the sub-agent be produced through standard library serialization. Role specs SHALL NOT describe hand-concatenated format strings (template literals, string interpolation, or shell heredocs) as an acceptable method for producing YAML or JSON outputs.

For YAML outputs such as `source.yaml`, the sub-agent SHALL construct a JS object in memory and call `yaml.stringify()` (from the `yaml` npm package already used by gate) to produce the file content. For JSON outputs, the sub-agent SHALL use `JSON.stringify()`.

This requirement prevents an entire class of gate parse failures caused by unescaped special characters in hand-concatenated strings. Common YAML parse failure patterns that standard library serialization prevents include:

- ASCII double quotes (`"`) embedded in page titles → YAML parse failure because the quote is interpreted as a string terminator
- Colons (`:`) in URLs or titles → ambiguous YAML key-value parsing
- Newlines in extracted text → broken YAML line structure

Note: template variable leakage (`${var}` → literal `${var}` written to output) is a content correctness issue, not a YAML parse failure. `yaml.stringify()` writes whatever value is in the JS object — it does not detect or resolve template variables. That class of bug is detected by the `template_not_expanded` gate sanity check defined in `gate-skeleton` (GSK-002).

Standard library serialization handles all of these cases correctly without requiring the sub-agent to implement its own escaping logic. The `yaml` package's `stringify()` automatically selects the correct scalar style (plain, single-quoted, double-quoted, literal block) for each value.

> **Relationship to GSK-002 (read-side repair):** WNC-009 is the write-side prevention — it eliminates malformed YAML/JSON at the source by mandating standard library serialization. The complementary read-side defense is defined in `gate-skeleton` GSK-002, which adds deterministic YAML/JSON repair in gate helpers for legacy data and any edge cases that escape write-side prevention. These two requirements together form the BUG-018 double defense: source elimination + read-side tolerance. Neither alone is sufficient — write-side alone leaves legacy data broken; read-side alone fixes symptoms without preventing recurrence.

#### Scenario: YAML output uses yaml.stringify

- **WHEN** a sub-agent role spec instructs the sub-agent to write `source.yaml`
- **THEN** the spec SHALL mandate constructing a JS array of source objects and calling `yaml.stringify(data)` to produce the file content
- **AND** the spec SHALL explicitly warn against hand-concatenating YAML strings with template literals or string interpolation

#### Scenario: JSON output uses JSON.stringify

- **WHEN** a sub-agent role spec instructs the sub-agent to write any JSON file (e.g., `result.schema.json`)
- **THEN** the spec SHALL mandate `JSON.stringify(data, null, 2)` for the file content
- **AND** hand-concatenated JSON strings SHALL NOT be described as an acceptable method

#### Scenario: Known-bad serialization patterns are flagged by validator

- **WHEN** workflow validation inspects sub-agent role spec artifact instructions
- **AND** the spec contains detectable anti-patterns such as template literal code blocks with `${var}` interpolation, shell heredocs writing to `.yaml` files, or string concatenation building YAML/JSON content
- **THEN** the validator SHALL report a serialization contract violation for each detected anti-pattern
- **AND** advice SHALL point to `yaml.stringify()` as the required method
- **AND** the validator SHALL NOT attempt semantic NL analysis beyond pattern-matching detectable code blocks and shell snippets

## REMOVED Requirements

None.

## RENAMED Requirements

None.
