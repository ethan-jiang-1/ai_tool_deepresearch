# research-wave-gate-implementation

> req: RWG-007

## RENAMED Requirements

- FROM: `### Requirement: Wave gate CLIs follow established double trace convention`
- TO: `### Requirement: Wave gate CLIs and playbook verdict checks use one root trace with distinct ownership`

## MODIFIED Requirements

### Requirement: Wave gate CLIs and playbook verdict checks use one root trace with distinct ownership

Wave gate CLIs SHALL return standard machine-readable `check / routing / inspect / advice` JSON on stdout and append real gate-attempt audit rows to the active bundle's `rb_trace.jsonl`. A command-experiment Playbook Agent/thin driver SHALL parse the real result and append its strict case-owned `event: check`, `source: playbook`, explicit boolean `passed`/`expected` verdict row through the accepted trace writer/helper to the same root trace. Native completion SHALL evaluate only accepted playbook-owned checks under V2 policy. `_trace.jsonl`, console verdict text and gate-authored substitute checks SHALL NOT be current authority.

#### Scenario: Wave gate output and verdict-check ownership stay distinct in one trace

- **WHEN** a command experiment executes a Wave gate
- **THEN** gate stdout SHALL expose machine-readable JSON and bundle-root `rb_trace.jsonl` SHALL retain the gate attempt
- **AND** the Playbook Agent/thin driver SHALL derive any case verdict check from that result as a separately owned strict row in the same root trace
- **AND** native completion SHALL bind and evaluate the accepted root-trace prefix without a second trace sink

#### Scenario: Wave gate CLI output and trace verdict stay separate

- **WHEN** a command experiment executes a Wave gate
- **THEN** gate stdout exposes machine-readable JSON and bundle-root `rb_trace.jsonl` retains the gate attempt
- **AND** the Playbook Agent/thin driver derives the strict case verdict check from that real result in the same trace
