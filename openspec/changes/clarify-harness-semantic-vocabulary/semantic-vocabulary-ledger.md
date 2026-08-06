# Semantic Vocabulary Ledger

## Status and Authority

This is a change-local review record. It applies the terms defined by
[`CONTEXT.md`](../../../CONTEXT.md); it does not create a second vocabulary
authority, a runtime state, or an Engine verdict.

Each `rewrite` row is a proposed semantic decision for this change's first
apply. A later apply MUST review the row against the current source before
editing it. A source scan discovers candidates only; it does not decide that a
particular token is a semantic alias.

## Decision Rules

| Semantic object | Reader question | Canonical rendering in prose | Decision rule |
| --- | --- | --- | --- |
| Reusable system | What reusable system supplies this instruction, command, or asset? | `Deep Research Harness`, then `Harness` where unambiguous | Rewrite a generic system noun/adjective that names this object. |
| Source coordinate | Where are those reusable assets? | `DEEP_RESEARCH_HARNESS/` | Preserve the literal path; do not turn it into a run bundle. |
| Research lifecycle | What work is occurring through one bundle? | `research run` | Rewrite only when the text describes lifecycle work, not the reusable system. |
| Durable runtime package | Which package holds one engagement? | `run bundle` / `current run bundle root` | Use the selected term only when the text concerns bounded runtime truth or a handoff coordinate. |
| Human-readable role taxonomy | Which Harness role family is being described? | `Deep Research Harness ... role taxonomy` | Rewrite explanatory `DPT` labels; keep role keys as protocol values. |
| Stable protocol identifier | What literal does a parser, consumer, or overwrite guard require? | Existing literal | Preserve and record a separate breaking migration if it must change. |

## First-Pass Rewrite Decisions

### Harness Markdown

| ID | Current source | Semantic referent | Proposed rendering | Decision |
| --- | --- | --- | --- | --- |
| HMD-001 | `DEEP_RESEARCH_HARNESS/AGENTS.md:7` | Work performed on the reusable system | `Deep Research Harness work` | rewrite |
| HMD-002 | `DEEP_RESEARCH_HARNESS/CLAUDE.md:7` | Same shared pre-read boundary as HMD-001 | `Deep Research Harness work` | rewrite, synchronously with HMD-001 |
| HMD-003 | `DEEP_RESEARCH_HARNESS/README.md:5,9` | The reusable system and work upon it | `Harness` / `Deep Research Harness work` | rewrite |
| HMD-004 | `DEEP_RESEARCH_HARNESS/README.md:41,43` | Reusable read-only assets and their surface | `reusable Harness assets` / `read-only Harness surface` | rewrite |
| HMD-005 | `DEEP_RESEARCH_HARNESS/README.md:75` | CLI belonging to the reusable system | `Harness-level CLI` | rewrite |
| HMD-006 | `DEEP_RESEARCH_HARNESS/README.md:99` | Entry into execution through the reusable system | `Harness execution` | rewrite |
| HMD-007 | `DEEP_RESEARCH_HARNESS/RUN.md:24` | Markdown communication supplied by the reusable system | `Harness Markdown communication` | rewrite |
| HMD-008 | `DEEP_RESEARCH_HARNESS/RUN.md:137` | Agent-run execution through the reusable system | `Agent-run Harness flow` | rewrite |
| HMD-009 | `DEEP_RESEARCH_HARNESS/workflows/README.md:5` | Read-only reusable assets | `read-only Harness assets` | rewrite |
| HMD-010 | `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md:14` | Execution through the reusable system before a name is supplied | `Harness execution` | rewrite |
| HMD-011 | `DEEP_RESEARCH_HARNESS/command_playbook/start-research.md:17` | Same pre-execution boundary as HMD-010 | `Harness execution` | rewrite |
| HMD-012 | `DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md:9` | The distinct pair of current run bundle and reusable system | `run bundle/Harness` | rewrite |
| HMD-013 | `DEEP_RESEARCH_HARNESS/command_playbook/subagent_templates/roles.md:1` | Human-facing role-family heading | `Deep Research Harness Real Subagent Roles` | rewrite |
| HMD-014 | `DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md:3,38,70` | Work-unit execution and its explanatory role taxonomy | `Deep Research Harness` wording | rewrite |

### Accepted Requirement Semantics

| ID | Capability and current requirement | Semantic decision | Decision |
| --- | --- | --- | --- |
| SPC-001 | `run-entry` RUE-001 | A displayed release identifies the Harness release, not an unnamed generic system. | rewrite prose to `Harness version` |
| SPC-002 | `run-entry` RUE-004 | Local routing documents belong to the Harness source tree. | rewrite `framework-local` to `Harness-local` |
| SPC-003 | `run-entry` RUE-005 | The selected path is Agent-run execution through the Harness; its only system-initiated interactive points are Harness-initiated. | rewrite prose, preserve interaction behavior |
| SPC-004 | `agent-command-surface` ACS-001 and ACS-002 | Command guidance is owned by the Harness, while a research run is owned by a selected current run bundle. | rewrite affected reader-facing descriptions |
| SPC-005 | `cmd-bundle-instantiation` CMI-004, CMI-005, CMI-007, CMI-009 | The creator navigates from a bundle to the Harness; a creation-time version fact is the Harness version while its field name remains stable. | rewrite prose only |
| SPC-006 | `cmd-subagent-environment` CSE-001 | The setup playbook and human role taxonomy belong to the Harness. | rewrite explanatory `DPT` prose only |
| SPC-007 | `bundle-data-isolation` BUI-001 and BUI-002 | Reusable assets belong to the Harness; mutable truth belongs under the current run bundle root. | rewrite boundary prose |
| SPC-008 | `silent-wave-execution` SWE-004 | A prohibited interactive action is initiated by the Harness/Agent, not by a generic framework. | rewrite direction labels and prose, preserve the user-turn rule |
| SPC-009 | `workflow-directory-contract` WDC-001 | The canonical read-only asset tree is the Harness; the matching current run bundle owns mutable truth. | rename the requirement and rewrite prose without altering paths or protocol fields |

## Preserved Protocol Identifiers

| ID | Literal or capability | Why it is not a prose alias | Decision |
| --- | --- | --- | --- |
| PRC-001 | `framework_root` | Serialized/context field consumed by experiment and bundle contracts. | preserve |
| PRC-002 | `framework_version` | Creation-time frontmatter field with existing writers/readers. | preserve |
| PRC-003 | `FRAMEWORK_ROOT`, `framework-version.mjs` | JavaScript identifier and module path with runtime consumers. | preserve |
| PRC-004 | `dpt_rb_*`, `dpt_disp_*`, `dpt-*` role keys | Accepted bundle and role grammar, not reader-facing semantic names. | preserve |
| PRC-005 | `DPT managed: real-subagent` | Overwrite-protection sentinel shared by generated role-agent definitions and setup logic. | preserve |

## Deferred Breaking Decisions

| ID | Candidate | Why deferred |
| --- | --- | --- |
| BRK-001 | `framework-engine` accepted capability and its requirement-registry prefix | Renaming a capability changes governance coordinates and requires registry, delta, archive, and consumer migration design. |
| BRK-002 | `framework_root`, `framework_version`, `FRAMEWORK_ROOT`, and `framework-version.mjs` | Requires an atomic producer/consumer and existing-bundle compatibility migration. |
| BRK-003 | `dpt_*` wire grammar and `DPT managed: real-subagent` | Requires a stable external/protocol migration, not a natural-language cleanup. |

## Review Boundary

The first apply SHALL edit only `rewrite` rows after reconfirming their
referent. A row that no longer has the stated referent SHALL be left unchanged
and recorded as an ordinary pending task or follow-up. OpenSpec archives, Git
history, existing run bundles, and all `preserve`/`deferred` rows are outside
this change's completion claim.
