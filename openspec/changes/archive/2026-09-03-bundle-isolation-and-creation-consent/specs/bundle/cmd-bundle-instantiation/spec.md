# cmd-bundle-instantiation (delta)

> req: CMI-010

## ADDED Requirements

### Requirement: Additional bundle creation SHALL carry an explicit user decision

Creating an additional production run bundle — including a collision retry
after an existing `dpt_rb_{name}/` rejected instantiation, a mid-session
restart of an unfinished run, a re-scoped sibling of an active bundle, or any
second bundle in the same workspace while a prior same-topic bundle exists —
SHALL require the user's explicit awareness and decision before the
instantiation command runs. The Agent SHALL present the existing bundle
situation (name, lifecycle state, why a new bundle is proposed) and obtain the
user's explicit consent. Deriving the kebab-case name itself remains
Agent-executed per the modified naming requirement and does not require user
input.

The first bundle created for a user-initiated research request is authorized
by that request; every subsequent creation is an additional creation under
this requirement. Consent lives in the current conversation and the explicit
acknowledgment argument of the creator CLI; it is not a durable state, not a
third in-run HITL checkpoint, and does not alter HITL1/HITL2 exclusivity.

The command playbook `instantiate-run-bundle.md` SHALL NOT instruct the Agent
to silently derive a collision-safe alternate name and retry on collision;
on collision or sibling presence it SHALL instruct the Agent to stop and ask
the user.

#### Scenario: Collision no longer silently renames

- **WHEN** `dpt_rb_glm-5-3-deepseek-v4-domestic-chips/` already exists and the Agent's proposed name collides
- **THEN** the playbook SHALL instruct the Agent to stop and ask the user whether to continue the existing bundle, reopen it through the accepted recovery path, or create an additional bundle
- **AND** the Agent SHALL NOT instantiate `dpt_rb_glm-5-3-deepseek-v4-domestic-chips-v2/` (or any collision-derived variant) without the user's explicit consent

#### Scenario: Mid-run re-scope requires user decision

- **WHEN** a run bundle is mid-execution (not Final) and the Agent concludes the scope must change in a way it judges to need a fresh bundle
- **THEN** the Agent SHALL surface the situation and the legal alternatives (continue, reopen/rerun through accepted recovery, or create an additional bundle) and wait for the user's decision
- **AND** the Agent SHALL NOT instantiate a sibling bundle while the current bundle is unfinished

#### Scenario: First bundle stays autonomous

- **WHEN** the user initiates a new research request and no same-topic production bundle exists
- **THEN** the Agent derives the name and instantiates the first bundle without a consent stop, per the modified naming requirement
- **AND** the user SHALL be informed of the created bundle path in the run's normal surfacing

### Requirement: Creator CLI SHALL preflight siblings before filesystem side effects

`instantiate-run-bundle.mjs` SHALL, after argv parsing and before creating any
directory or file, scan the target directory for existing production run
bundle siblings (`dpt_rb_*`). When a sibling is name-similar to the requested
name (shared kebab-case prefix beyond `dpt_rb_`, or the requested name extends
an existing name) or is a same-topic bundle in a non-Final state, the creator
SHALL refuse creation with nonzero exit and one diagnostic that names the
sibling, its lifecycle state, and the consent path: obtain the user's explicit
decision, then rerun with `--acknowledge-existing-bundle <sibling-name>`.

A sibling SHALL count as Final only when its `rb_status.json` evidences the
terminal state (`state` completed with `current_gate` `readiness_passed`); a
missing, unreadable, incomplete, or ambiguous status SHALL be treated as
non-Final (fail-closed). `--acknowledge-existing-bundle <name>` SHALL accept
the name of one existing sibling and SHALL be rejected (before filesystem
side effects) when the named bundle does not exist, when it is not one of the
preflight-flagged siblings, or when it is supplied more than once. All other
existing argv behavior, including collision rejection, name grammar,
`--target-dir` handling, and `--force` rejection, remains unchanged.

#### Scenario: Silent v2 creation is refused

- **WHEN** `instantiate-run-bundle.mjs glm-5-3-deepseek-v4-domestic-chips-v2` runs while sibling `dpt_rb_glm-5-3-deepseek-v4-domestic-chips/` exists in a non-Final state
- **THEN** the creator SHALL exit nonzero before any filesystem side effect
- **AND** its single diagnostic SHALL name the sibling and the consent path (`--acknowledge-existing-bundle` after an explicit user decision)

#### Scenario: Acknowledged creation proceeds after user consent

- **WHEN** the user explicitly consents to creating an additional bundle alongside existing sibling `dpt_rb_a/` and the Agent reruns with `--acknowledge-existing-bundle a`
- **THEN** the creator SHALL perform its existing successful creation behavior
- **AND** the acknowledgment argument SHALL appear only as a preflight gate, never as bundle content or durable state

#### Scenario: Bad acknowledgment is rejected before mutation

- **WHEN** `--acknowledge-existing-bundle` names a bundle that does not exist, is not a preflight-flagged sibling, or is repeated
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface, consistent with CMI-008

## MODIFIED Requirements

### Requirement: Bundle naming is not a mid-pipeline user dependency

Bundle instantiation docs and playbooks SHALL frame the bundle `<name>` as an Agent-derived or already-supplied command input.

The Agent MAY derive a kebab-case bundle name from the research request, or use a name explicitly supplied before Harness execution begins. Name derivation, and the instantiation of the first production bundle for a user-initiated research request, SHALL NOT depend on a mid-pipeline user response. Whether an additional bundle may be created at all — collision retry, mid-session restart, re-scope sibling, or any second bundle beside an existing same-topic bundle — is governed by the additional-creation consent requirement of this capability and SHALL follow its stop-and-ask path; it SHALL NOT be resolved by deterministically deriving a collision-safe alternate name and retrying. The playbook SHALL NOT instruct the Agent to ask the user for a bundle name during autonomous execution.

#### Scenario: Agent derives bundle name from research request

- **WHEN** the Agent starts bundle instantiation without an explicit bundle name and no sibling condition under the additional-creation consent requirement applies
- **THEN** the playbook SHALL instruct it to derive a stable kebab-case name from the research topic or request
- **AND** it SHALL proceed without asking the user for a name inside autonomous execution

#### Scenario: Already-supplied name is accepted

- **WHEN** a bundle name was supplied before Harness execution begins
- **THEN** the playbook MAY use that name as the command input
- **AND** it SHALL still treat subsequent instantiation commands as Agent-run Harness commands

#### Scenario: Collision routes to the consent boundary, not a rename

- **WHEN** the Agent's derived or supplied name collides with an existing production bundle
- **THEN** the playbook SHALL NOT instruct the Agent to derive a collision-safe alternate name and retry silently
- **AND** it SHALL route the decision through the additional-creation consent requirement of this capability
