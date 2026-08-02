> req: PLR-004

## ADDED Requirements

### Requirement: Runner guidance distinguishes authoring estimates from run strategy

The normal Autorun guidance SHALL describe filename `light|standard|heavy` as a creation-time cost estimate and explicit legacy compatibility filter, not as a permanent performance, coverage, or proof classification. It SHALL describe `health_profile` independently and SHALL direct normal Headless users to provide either an exact selection or an explicit run profile with its required bounds. It SHALL not tell case authors to move existing playbooks, rename historical cases, maintain a global taxonomy, or edit frontmatter merely because a later observation changes the case's measured behavior.

Guidance for `calibration`, `discovery`, `diagnostic`, and `assurance` SHALL state that their selection facts are virtual/recomputed from the manifest, current frontmatter, and retained reports. It SHALL keep change-impact selection tied to the change's declared verification plan rather than claiming that filename cost, directory grouping, or implementation tags automatically establish coverage.

#### Scenario: A changed case does not require physical reclassification

- **WHEN** an existing case's measured duration or health behavior changes after refactoring
- **THEN** normal runner guidance directs the maintainer to inspect the virtual observation/profile output
- **AND** it does not require a filename rename, directory move, or global taxonomy update

#### Scenario: Normal launch has an explicit strategy boundary

- **WHEN** a maintainer follows the normal Headless Autorun documentation
- **THEN** the documentation shows an exact selector or a bounded explicit run profile
- **AND** it does not document no-filter filename-Light autorun as the normal default
