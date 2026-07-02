# pre-research-phase-content Delta Spec

> req: PRP-003, PRP-009, PRP-010

## MODIFIED Requirements

### Requirement: Instantiation scope boundary enforcement

`phase-instantiation.md` SHALL remain limited to naming, invoking the instantiation CLI, and checking the instantiated bundle surface. This change narrows how `stop: "no"` instantiation handles name problems: it SHALL resolve ordinary naming problems silently instead of asking the user.

Instantiation completion SHALL mean the instantiated bundle surface has been reloaded, the instantiation gate has passed, and the Agent follows gate CLI `check.next`. Creating the directory or control files is not a user-facing checkpoint. The phase body SHALL NOT allow progress reports such as "bundle created" or idle reports such as "nothing left to do" before the gate pass.

For production bundle name collision, the phase body SHALL instruct the Agent to derive a replacement basename by appending a short deterministic-safe suffix such as `-<hex6>`, record the substitution through an accepted trace/log surface, and continue instantiation without asking the user.

For illegal user-provided basename characters, the phase body SHALL instruct the Agent to normalize the basename into the accepted pattern (for example replacing illegal characters with `-`), record the normalization through an accepted trace/log surface, and continue instantiation without asking the user.

This does not allow unsafe repair of an already-created illegal bundle. The Agent SHALL NOT rename an existing runtime directory, patch `rb_plan.md` / `rb_profile.yaml` to retroactively bless an illegal basename, or treat an invalid existing bundle as valid.

#### Scenario: Name collision uses silent replacement name

- **WHEN** the desired production bundle basename already exists
- **THEN** `phase-instantiation.md` SHALL instruct the Agent to generate a replacement basename with a short suffix
- **AND** the Agent SHALL record the substitution through an accepted trace/log surface
- **AND** the Agent SHALL NOT stop to ask the user for a new name

#### Scenario: Illegal name is normalized before instantiation

- **WHEN** the requested bundle basename contains illegal characters
- **THEN** `phase-instantiation.md` SHALL instruct the Agent to normalize the basename before creating the bundle
- **AND** the Agent SHALL record the normalization through an accepted trace/log surface
- **AND** the Agent SHALL NOT stop to ask the user for a replacement name

#### Scenario: Existing illegal bundle is not retroactively repaired

- **WHEN** Agent discovers an already-created bundle basename that violates the accepted pattern
- **THEN** the Agent SHALL NOT rename the existing directory or patch control files to make it look valid
- **AND** any recovery SHALL use a fresh legal instantiation path

#### Scenario: Instantiation does not surface after local creation

- **WHEN** the instantiation CLI creates a bundle directory and control files
- **THEN** the Agent SHALL reload/check the instantiated surface and run the instantiation gate
- **AND** the Agent SHALL NOT report progress or idle state to the user before gate pass
- **AND** the Agent SHALL advance only via gate CLI `check.next`

### Requirement: Setup stop semantics enforcement

`phase-setup.md` remains `stop: "no"` and gate pass still auto-advances through gate CLI `check.next`. On persistent setup gate failure, the phase body SHALL no longer instruct user-facing escalation or `rb_status.json` state `blocked`. It SHALL instruct the Agent to record `silent_degradation` through an accepted trace/log surface, preserve `rb_status.json` in an in-progress/non-blocked lifecycle state, and continue repair or gate-respecting degradation without asking the user.

Setup completion SHALL mean `setup-ready` gate pass plus `check.next`, not "validation seems locally complete." If setup work appears complete, the Agent SHALL run the gate and repair from inspect/advice rather than surfacing a status update.

#### Scenario: Setup persistent failure degrades silently

- **WHEN** setup gate has failed repeatedly without progress
- **THEN** the Agent SHALL record `silent_degradation` through an accepted trace/log surface
- **AND** the Agent SHALL NOT write `rb_status.json` state `blocked`
- **AND** the Agent SHALL NOT ask the user or report and stop
- **AND** the Agent SHALL NOT claim setup passed unless the setup gate passes

#### Scenario: Setup local completion runs gate instead of reporting

- **WHEN** setup validation appears locally complete
- **THEN** the Agent SHALL run the `setup-ready` gate
- **AND** the Agent SHALL NOT provide an intermediate progress summary
- **AND** any further action SHALL be driven by gate pass `check.next` or gate fail inspect/advice
