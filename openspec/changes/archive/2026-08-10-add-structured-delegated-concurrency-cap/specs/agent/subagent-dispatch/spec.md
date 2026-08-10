## MODIFIED Requirements

### Requirement: Work-unit dispatch SHALL enforce delegated fan-out concurrency cap

> req: SUD-003

V1 dispatch concurrency SHALL be enforced by the Phase Agent's choice of `claim --count N` and the effective `delegated_concurrency_cap` from the `ProfileSchema`-parsed run profile. An explicit `rb_profile.yaml#/delegated_concurrency_cap` is the persisted override; `ProfileSchema` SHALL supply `12` when it is omitted and reject values outside the integer range `1..20`. No CLI option or environment variable SHALL create a competing cap source.

The cap SHALL limit how many work-unit prompts the Phase Agent may request and fan out at once. It SHALL NOT create multiple schedulers, host-capacity/liveness authority, physical-concurrency proof, or any sub-agent authority to allocate IDs. The Engine SHALL continue to allocate all work-unit IDs in its existing transaction and retain actor preflight, queue, admission, and fallback authority.

The cap SHALL be described in work-unit terms. Current production guidance SHALL NOT express it as a retired transport-position count or as a claim that a native host physically executed the same number of actors concurrently.

#### Scenario: cap limits fan-out, not allocation authority

- **WHEN** a parsed profile cap allows seven delegated workers and seven independent eligible demands are available
- **THEN** the Phase Agent MAY request `claim --count 7`
- **AND** all IDs SHALL still be allocated by the Engine in one transaction

#### Scenario: profile value is the only cap input

- **WHEN** a run profile declares `delegated_concurrency_cap: 3` and a CLI or environment setting proposes another cap
- **THEN** guidance SHALL use the parsed profile value of three
- **AND** no additional cap source SHALL alter the normal fan-out choice

#### Scenario: cap wording avoids slot and host authority

- **WHEN** a current doc or spec explains delegated concurrency
- **THEN** it SHALL describe the number of work-unit prompts the Phase Agent may fan out
- **AND** it SHALL NOT describe slot allocation, host capacity, actor liveness, or physical concurrency as production authority
