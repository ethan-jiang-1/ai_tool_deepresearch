> req: EXA-009

## MODIFIED Requirements

### Requirement: Autorun exposes strategy selection without becoming a controller

The Autorun Supervisor SHALL accept `--run-profile regression` only for Headless selection and SHALL fail closed before credential loading or run-root creation when the request widens the fast envelope: predicted-duration bound greater than `480000` ms, total budget greater than `$3.00`, per-case budget greater than `$0.60`, Agent timeout greater than `120000` ms, or a per-health-target timeout greater than `60000` ms. Because the existing general Agent timeout default is wider, a non-dry regression launch SHALL explicitly supply `--timeout` no greater than `120000` ms; dry-run makes no child launch and does not require that flag. A non-dry regression launch SHALL retain the existing positive total-budget requirement; the Supervisor SHALL impose an effective `$0.60` per-case launch cap even when the caller did not supply a smaller cap. Exact selectors, Interactive mode, and assurance-only scope combinations SHALL remain incompatible with regression. `--regression-qualification` SHALL be the sole explicit opt-in to select current-v2 `needs_qualification` candidates under the same envelope; it SHALL require `--run-profile regression` and SHALL be rejected with every other profile or exact selector.

The Supervisor SHALL pass only strategy-selected `eligible` regression playbooks into the existing one-Agent-per-case lifecycle, revalidating their current manifest/frontmatter before preparation. A `needs_qualification` or `ineligible` case SHALL appear in dry-run selection feedback but SHALL NOT be launched through normal regression. An empty eligible regression selection SHALL fail before runtime preparation; the Supervisor SHALL NOT silently choose a slow case, launch a qualification candidate, retry a breach, or schedule a later batch.

The Supervisor SHALL keep `480000` ms as the strategy's selection forecast, not as a new global batch deadline or scheduler. It SHALL retain the ordinary sequential lifecycle, native outcome, health, audit, report, and cleanup authorities after selection.

#### Scenario: A widened regression command fails before side effects

- **WHEN** an operator invokes `--run-profile regression` with a `600000` ms predicted-duration bound, `$4.00` total budget, `$1.00` per-case budget, a `180000` ms Agent timeout, or a `90000` ms per-health-target timeout
- **THEN** the Supervisor rejects the request before credentials, run roots, reports, or Agent launch
- **AND** it does not reinterpret the invocation as discovery or a legacy selector

#### Scenario: Non-dry regression cannot inherit the general timeout

- **WHEN** an operator launches regression without an explicit `--timeout`
- **THEN** the Supervisor rejects the invocation before credential loading or run-root creation
- **AND** a regression dry-run remains able to inspect the same selection without that runtime flag

#### Scenario: Retained v1 history is not a qualification candidate

- **WHEN** a dry regression projection encounters a fast retained v1 case without a complete current-v2 observation
- **THEN** dry-run output reports a no-current-observation/ineligible gap and may include a non-fatal historical diagnostic
- **AND** neither normal regression nor `--regression-qualification` creates a run root for that v1 record

#### Scenario: Qualification candidates are inspectable but not launched as regression

- **WHEN** a dry regression projection finds a current-v2 case that needs qualification because its source matches but its execution surface has drifted
- **THEN** dry-run output identifies its qualification reason
- **AND** a non-dry normal regression invocation does not create a run root for that case

#### Scenario: Explicit qualification retains the fast envelope

- **WHEN** an operator combines `--run-profile regression --regression-qualification` with valid fast bounds and the strategy selects a current-v2 execution-surface qualification candidate
- **THEN** the Supervisor may launch only that strategy-selected qualification candidate under the same effective `$0.60` per-case cap
- **AND** the retained selection observation identifies qualification rather than normal regression

#### Scenario: An eligible regression case retains the ordinary lifecycle

- **WHEN** one eligible regression case is selected within the fast envelope
- **THEN** the Supervisor launches one fresh Headless Playbook Agent and records the normal native completion, health, audit, report, and cleanup facts
- **AND** regression selection does not create a new scheduler, verdict, health owner, or repair controller
