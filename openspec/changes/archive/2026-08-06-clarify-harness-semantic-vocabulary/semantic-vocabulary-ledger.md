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
| HMD-001 | `DEEP_RESEARCH_HARNESS/AGENTS.md:3,7,19` | Harness-local entry context, work on the reusable system, and the selected research trigger | `Deep Research Harness` / `Deep Research Harness work` / `trigger this Harness` | rewrite |
| HMD-002 | `DEEP_RESEARCH_HARNESS/CLAUDE.md:3,7,19` | Same shared local-entry, pre-read, and trigger boundary as HMD-001 | `Deep Research Harness` / `Deep Research Harness work` / `trigger this Harness` | rewrite, synchronously with HMD-001 |
| HMD-003 | `DEEP_RESEARCH_HARNESS/README.md:5,9,19,23` | The reusable system, work upon it, and its direct reader trigger | `Harness` / `Deep Research Harness work` / `trigger this Harness` | rewrite |
| HMD-004 | `DEEP_RESEARCH_HARNESS/README.md:41,43` | Reusable read-only assets and their surface | `reusable Harness assets` / `read-only Harness surface` | rewrite |
| HMD-005 | `DEEP_RESEARCH_HARNESS/README.md:75` | CLI belonging to the reusable system | `Harness-level CLI` | rewrite |
| HMD-006 | `DEEP_RESEARCH_HARNESS/README.md:99` | Entry into execution through the reusable system | `Harness execution` | rewrite |
| HMD-007 | `DEEP_RESEARCH_HARNESS/RUN.md:24` | Markdown communication supplied by the reusable system | `Harness Markdown communication` | rewrite |
| HMD-008 | `DEEP_RESEARCH_HARNESS/RUN.md:137,139,151` | Agent-run execution, the execution-section heading, and Harness-initiated behavior | `Agent-run Harness flow` / `## 2. 开跑（Harness）` / `Harness` | rewrite |
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

CMI-004 is retained above as the inherited `cmd-bundle-instantiation`
capability-header trace for its pre-existing no-copy requirement block. Its
registry short label names template files and is not a one-to-one mapping to
individual requirement headings; this change changes only existing prose and
does not allocate a new requirement ID.

## Preserved Protocol Identifiers

| ID | Literal or capability | Why it is not a prose alias | Decision |
| --- | --- | --- | --- |
| PRC-001 | `framework_root` | Serialized/context field consumed by experiment and bundle contracts. | preserve |
| PRC-002 | `framework_version` | Creation-time frontmatter field with existing writers/readers. | preserve |
| PRC-003 | `FRAMEWORK_ROOT`, `framework-version.mjs` | JavaScript identifier and module path with runtime consumers. | preserve |
| PRC-004 | `dpt_rb_*`, `dpt_disp_*`, `dpt-*` role keys | Accepted bundle and role grammar, not reader-facing semantic names. | preserve |
| PRC-005 | `DPT managed: real-subagent` | Overwrite-protection sentinel shared by generated role-agent definitions and setup logic. | preserve |
| PRC-006 | `workflow-foundation` | Accepted workflow-family/capability identifier; it names a lifecycle architecture layer inside the Harness, not the reusable system or a runtime root. | preserve |

## Preserved Historical Negative Literal

| ID | Literal | Why it remains | Decision |
| --- | --- | --- | --- |
| HIS-001 | `_framework/` in the no-copy scenario | It is the existing prohibited legacy directory example. Retaining it preserves the no-copy constraint; it is not a supported source coordinate, protocol migration target, or reader-facing system name. | preserve as negative scenario evidence |

## Deferred Breaking Decisions

| ID | Candidate | Why deferred |
| --- | --- | --- |
| BRK-001 | `framework-engine` accepted capability and its requirement-registry prefix | Renaming a capability changes governance coordinates and requires registry, delta, archive, and consumer migration design. |
| BRK-002 | `framework_root`, `framework_version`, `FRAMEWORK_ROOT`, and `framework-version.mjs` | Requires an atomic producer/consumer and existing-bundle compatibility migration. |
| BRK-003 | `dpt_*` wire grammar and `DPT managed: real-subagent` | Requires a stable external/protocol migration, not a natural-language cleanup. |

## Post-Edit HMD Source Review

This bounded review covers only the ten HMD source paths named above after their
approved rewrites. The scan located candidates; the dispositions below record
the semantic judgment. It does not claim that a spelling scan proves the
correctness of all Harness vocabulary.

| Review ID | Remaining occurrence set | Disposition |
| --- | --- | --- |
| RES-001 | `dpt_rb_*` / `dpt_disp_*` in `AGENTS.md:23`, `CLAUDE.md:23`, `README.md:44,50,52,58,68,96,99,102,107`, `workflows/README.md:5`, `instantiate-run-bundle.md:14`, and `start-research.md:24` | PRC-004 accepted bundle grammar; preserve. |
| RES-002 | `framework_root` in `README.md:57` | PRC-001 serialized coordinate field; preserve. The surrounding prose now identifies it as the read-only Deep Research Harness asset root. |
| RES-003 | `dpt-*` role keys in `command_playbook/subagent_templates/roles.md:7-12,18,22,26,30,34,38` and `setup-real-subagents.md:76` | PRC-004 accepted role-key grammar; preserve. The explanatory heading and taxonomy are now Harness wording. |
| RES-004 | `DPT managed: real-subagent` in `setup-real-subagents.md:18,88` | PRC-005 overwrite-protection sentinel; preserve byte-for-byte. |
| RES-005 | `workflow-foundation` in `workflows/README.md:5` | PRC-006 accepted workflow-family/capability identifier; preserve. It does not name the reusable Harness or a run bundle. |

## Review Boundary

The first apply SHALL edit only `rewrite` rows after reconfirming their
referent. A row that no longer has the stated referent SHALL be left unchanged
and recorded as an ordinary pending task or follow-up. OpenSpec archives, Git
history, existing run bundles, and all `preserve`/`deferred` rows are outside
this change's completion claim.
