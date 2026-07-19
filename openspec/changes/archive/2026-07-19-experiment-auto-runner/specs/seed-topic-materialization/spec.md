# seed-topic-materialization

> req: STM-005

## MODIFIED Requirements

### Requirement: Seed topics boundary enforcement playbook

The current manifest-registered `case-124-standard-seed-topics-boundary` role SHALL verify the seed-topics gate materialization path and boundary enforcement in a fresh contained disposable bundle. It SHALL pre-seed post-setup topic registry state, materialize all seed topics for a real pass, and exercise empty-directory, missing-slug and extra-file failures with inspect identifying the applicable `dir_non_empty` or bidirectional `slug_consistency` boundary. Its Markdown body SHALL expose slug-consistency DO/DON'T guidance.

Every verdict-affecting boundary SHALL be recorded as a stable strict playbook-owned check in bundle-root `rb_trace.jsonl`; V2 required checks and native completion SHALL replace the removed legacy `test-simple-*` path and any console-only verdict. The Playbook Agent SHALL stop before Supervisor health/cleanup.

#### Scenario: Seed topics pass and fail are trace-backed

- **WHEN** registry and seed files are complete and bidirectionally slug-consistent
- **THEN** the real seed-topics gate SHALL pass
- **AND WHEN** the directory is empty or slugs are missing/extra
- **THEN** the real gate SHALL fail with the applicable inspect
- **AND** native completion SHALL require the case-owned pass and three negative-boundary check IDs

#### Scenario: Seed topics pass and fail both trace-backed

- **WHEN** registry entries and `seed_topics/` files are bidirectionally slug-consistent
- **THEN** the real seed-topics gate passes
- **AND WHEN** the directory is empty or a slug is missing or extra
- **THEN** the real gate fails with applicable inspect
- **AND** native completion derives the verdict from the required one pass and three negative-boundary root-trace checks
