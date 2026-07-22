## ADDED Requirements

> req: RRD-011

### Requirement: Setup-ready route binds final host-file checkpoint bytes

For a setup-ready candidate that otherwise passes its deterministic rules, the Engine SHALL establish one ordered commit boundary: durable non-routing attempt diagnostics first; bounded Progress write next; one durable checkpoint over the actual resulting `rb_plan.md` bytes next; and the routable passed `gate_attempt` trace last. The route trace SHALL reference and bind the required checkpoint. The checkpoint SHALL record the same final plan hash used by the route-binding check.

If Progress write fails, the old full plan SHALL remain unchanged, no checked Progress claim SHALL be emitted, and the checkpoint/route may describe only bytes that actually exist. If the required checkpoint cannot be durably written, the Engine SHALL NOT append a routable setup-ready passed trace or report a consumable `check.next`. It SHALL preserve available non-routing diagnostics and direct the Agent to repair the direct persistence problem and rerun the same Gate.

`enter-phase` SHALL reject a setup-ready handoff whose route-bound checkpoint is missing, mismatched, or no longer agrees with the current plan bytes. It SHALL not treat a later append-only failure trace as a retraction of a prior passed route. This requirement adds neither a second checkpoint authority nor a drift exemption.

#### Scenario: final Progress bytes match the only consumable handoff
- **WHEN** setup-ready passes and its Progress mutation commits
- **THEN** the routed attempt references a durable checkpoint whose `rb_plan.md` hash equals the actual final plan bytes
- **AND** `enter-phase` can consume that route only while the binding remains valid

#### Scenario: missing checkpoint blocks handoff consumption
- **WHEN** setup-ready diagnostics exist but the required checkpoint cannot be written or is absent
- **THEN** no setup-ready passed route is consumable
- **AND** `enter-phase` rejects the attempted downstream entry with the checkpoint as the direct missing fact
