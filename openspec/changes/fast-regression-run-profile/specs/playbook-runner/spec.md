> req: PLR-004

## MODIFIED Requirements

### Requirement: Runner guidance distinguishes authoring estimates from run strategy

The normal Autorun guidance SHALL describe filename `light|standard|heavy` as a creation-time cost estimate and explicit legacy compatibility filter, not as a permanent performance, coverage, or proof classification. It SHALL describe `health_profile` independently and SHALL direct normal Headless users to provide either an exact selection or an explicit run profile with its required bounds. It SHALL not tell case authors to move existing playbooks, rename historical cases, maintain a global taxonomy, or edit frontmatter merely because a later observation changes the case's measured behavior.

Guidance for `calibration`, `discovery`, `diagnostic`, and `assurance` SHALL state that their selection facts are virtual/recomputed from the manifest, current frontmatter, and retained reports. It SHALL keep change-impact selection tied to the change's declared verification plan rather than claiming that filename cost, directory grouping, or implementation tags automatically establish coverage.

Guidance SHALL describe `regression` as a virtual, high-frequency deterministic regression profile, not as a test class, permanent suite, filename tier, current proof of Agent behavior, or a schedule. It SHALL show the fixed maximum envelope of `480000` ms predicted duration, `$3.00` total budget, `$0.60` effective per-case budget, `120000` ms Agent timeout, and `60000` ms per-health-target timeout, while allowing an operator to request only tighter bounds. Normal non-dry commands SHALL show the required explicit `--timeout` at or below `120000` ms instead of inheriting the general timeout; dry-run needs no runtime timeout flag. It SHALL state that the eight-minute value is a selection forecast rather than a scheduler deadline. Guidance SHALL state that regression chooses at most one qualifying case from each `experiment` group and reports groups without an eligible fast case rather than filling the batch with slow or duplicate coverage. It SHALL distinguish normal regression from the explicit `--regression-qualification` intent, which is the only route that may launch a `needs_qualification` candidate under the same envelope.

Guidance SHALL describe optional `regression_recommendation: recommended` as author ranking advice only: absence is neutral, recommendation cannot admit a case that lacks matching v2 PASS+CLEAN facts or exceeds SLO, and no existing playbook needs a move, rename, or permanent class. It SHALL explain that an `all`-mode case needs explicit retry-safety review before initial admission, and that v1 history can select a qualification candidate but cannot itself make it a normal regression member.

Guidance SHALL route slow, Agent-behavior, stale, unqualified, FAIL, ERROR, or ISSUES cases to explicit calibration, diagnostic, or assurance paths. It SHALL not describe Wave B/C/D-style automatic slow-suite progression, automatic retry after a regression breach, or a daemon/calendar schedule as part of normal regression.

#### Scenario: Maintainer starts an explicit fast regression inspection

- **WHEN** a maintainer follows normal fast regression guidance
- **THEN** it shows a bounded `--run-profile regression` dry-run and normal-launch command
- **AND** it explains that a no-member result requires explicit qualification or diagnostic work rather than a wider regression invocation

#### Scenario: Author recommendation does not replace empirical admission

- **WHEN** a case author adds `regression_recommendation: recommended` to a playbook whose current observation is slow, stale, or not CLEAN
- **THEN** guidance states that the case remains outside normal regression
- **AND** it directs the maintainer to the relevant qualification or diagnostic path without moving the playbook
