# pre-research-gate-implementation

> req: PRG-007, PRG-008

## MODIFIED Requirements

### Requirement: Gate CLIs return JSON feedback while playbooks record verdict checks in the root trace

Pre-research gate CLIs SHALL continue to return standard machine-readable `check / routing / inspect / advice` JSON on stdout, use exit codes for pass/fail/config error, and append the real gate attempt to the active bundle's `rb_trace.jsonl`. They SHALL NOT manufacture the command-experiment verdict check.

A command-experiment Playbook Agent/thin driver SHALL invoke the real gate CLI, parse its JSON result, and use the accepted trace writer/helper to append a strict `event: check`, `source: playbook` row with stable case-owned gate ID and explicit boolean `passed`/`expected` to the same bundle-root `rb_trace.jsonl`. Native completion SHALL apply the V2 required-check and verdict-mode policy. No `_trace.jsonl`, console summary or hand-written alternate sink SHALL become verdict authority.

#### Scenario: CLI feedback and playbook verdict ownership stay distinct in one trace

- **WHEN** a command experiment invokes a pre-research gate
- **THEN** gate stdout SHALL provide machine-readable JSON and `rb_trace.jsonl` SHALL receive the real gate-attempt audit row
- **AND** the Playbook Agent/thin driver SHALL derive its separate strict verdict-check row from that real result in the same root trace
- **AND** native completion SHALL bind the root-trace prefix without treating gate side effects or console prose as required case checks

### Requirement: Runtime audit events and experiment verdict checks share one trace without sharing authority

Bundle-root `rb_trace.jsonl` SHALL be the sole trace sink. Gate-owned `gate_attempt` rows remain runtime audit facts; strict playbook-owned `check` rows remain command-experiment verdict inputs. Event ownership and schema, not a second file, SHALL keep these authorities distinct.

#### Scenario: Production gate writes audit without an experiment wrapper

- **WHEN** an Agent invokes a pre-research gate directly on a production run bundle
- **THEN** `rb_trace.jsonl` SHALL receive the gate-attempt audit row
- **AND** no experiment verdict check, `_trace.jsonl`, finalizer or native completion SHALL be required merely to retain that production audit fact
