> req: EXA-010

## ADDED Requirements

### Requirement: Extreme-slow playbooks are quarantined outside active selection

`experiments_playbook/exp_extrem_slow/` SHALL hold playbooks that have been removed from normal execution because their observed runtime is unacceptable. Its files SHALL use `case-…-extreme-slow-…` naming to make the quarantine visible to readers. The active machine table in `PLAYBOOK_MANIFEST.md` SHALL NOT register a path rooted at `exp_extrem_slow/`, and runnable-corpus discovery SHALL exclude that directory when it checks manifest completeness.

The Autorun Supervisor SHALL reject an attempt to register an `exp_extrem_slow/` path in the active machine table before any Headless or Interactive Agent launch. A quarantined case SHALL become runnable only after its flow is refactored and it is moved to a normal runnable location with a supported `light`, `standard`, or `heavy` filename cost, then explicitly re-registered; otherwise it SHALL be removed. The quarantine does not create a fourth runnable tier, a duration watchdog, a retry route, or a native outcome.

#### Scenario: Quarantined case does not create manifest drift

- **WHEN** Case 224 or Case 225 exists under `exp_extrem_slow/` but has no active manifest row
- **THEN** active manifest validation SHALL continue to validate the registered runnable corpus
- **AND** no selector or run profile SHALL discover or launch the quarantined case

#### Scenario: Active registration of a quarantined path fails closed

- **WHEN** a manifest row names a playbook below `exp_extrem_slow/`
- **THEN** manifest validation SHALL fail before Agent runtime preflight or run-root creation
- **AND** the failure SHALL not be repaired by treating the directory as a supported cost tier
