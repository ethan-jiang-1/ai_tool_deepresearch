## MODIFIED Requirements

> req: RWP-015

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a
continuous Phase Agent loop: fill queue demand, reconstruct current in-flight
work from bundle truth, claim eligible independent work units as bounded
top-up batches where applicable, spawn bounded Sub-agents, actively poll
runtime work-unit readiness, submit ready attempts, repair or terminalize
rejected/expired attempts, materialize Phase-owned projections where the Phase
owns consumer presentation after successful submit, and run the phase gate only
after queue demand and delegated in-flight work are drained.

After the existing `fail_and_replace` disposition reaches its authorized
terminal boundary, phase Markdown SHALL instruct the Agent to terminalize the
current attempt through the existing terminal operation and invoke
`operate-work-unit replace` for that terminal work ID. For a newly created or
queued successor, it SHALL then perform the existing exact-role native probe
and `operate-work-unit claim`; for an already in-flight idempotent successor,
it SHALL reconstruct and poll the disclosed existing work ID without a second
claim. It SHALL not hand-author an allegedly equivalent replacement task card,
infer a successor queue ID, discover a work ID from the filesystem, rewrite
terminal status, or bypass ordinary claim.

Wave0 and Wave1 phase bodies SHALL not present `claim --count 1` as the normal
strategy for independent Topics. Wave1's post-submit loop SHALL teach one
ordered closeout decision, supplied by convergence rather than a second
controller: canonical materialize/persist only from the primary hint's exact
submitted backing; then sync the flat index; then update only affected Seed
Topic navigation through the existing packet writer; then rerun Wave1 inspect.
It SHALL defer only the closeout evaluator's un-emitted later index/floor
outcomes until that rerun, and SHALL keep separately evaluated primary findings
visible rather than using them to claim, supplement, or edit delegated
authority. If no projection/index repair exists, the loop either continues a
disclosed existing supplementary demand or forms one ordinary supplementary
demand for a true floor deficit before returning to claim/poll/submit. Wave2
retains its existing backed-pure-synthesis versus targeted-evidence
materialization split.

#### Scenario: Wave1 post-submit loop follows ordered closeout

- **WHEN** a Wave1 Phase Agent completes a successful submit and receives a
  convergence materialization root with exact canonical target/backing
  coordinates
- **THEN** the phase body SHALL show the exact candidate-bound
  materialize/persist -> index sync -> packet ref refresh when needed -> same
  inspect loop
- **AND** it SHALL not ask the Agent to infer filename/count/index order from
  source code, secondary diagnostics, or separate checkers

#### Scenario: phase gate waits for queue and in-flight drain

- **WHEN** a phase has unclaimed delegated queue demand or reconstructed
  delegated attempts still in flight
- **THEN** phase guidance SHALL instruct the Agent to keep polling, submitting,
  repairing, terminalizing, or claiming bounded top-ups as appropriate
- **AND** it SHALL not run the phase gate as if delegated work were complete

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and
  accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to invoke the
  convergence-guided Phase-owned reference closeout before gate
- **AND** it SHALL not require a Sub-agent to be the canonical producer of
  consumer reference files

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** independent Wave0 or Wave1 demand is eligible to claim
- **THEN** phase guidance SHALL use bounded top-up batch claims as the normal
  posture
- **AND** it SHALL not present `claim --count 1` as the default independent
  Topic strategy

#### Scenario: phase docs teach active polling after spawn

- **WHEN** delegated work has been spawned
- **THEN** phase guidance SHALL actively poll the disclosed runtime/work-unit
  state and submit ready results
- **AND** it SHALL not assume chat completion is an accepted attempt

#### Scenario: phase docs reconstruct in-flight work before claiming

- **WHEN** a Phase resumes with delegated attempts already in flight
- **THEN** it SHALL reconstruct those attempts from bundle truth before a new
  claim
- **AND** it SHALL not create a duplicate claim for the same demand

#### Scenario: terminal replacement returns to the location-correct existing boundary

- **WHEN** an authorized `fail_and_replace` path reaches a terminal attempt
- **THEN** phase guidance SHALL terminalize it through the existing operation,
  use `operate-work-unit replace`, and then claim or reconstruct the disclosed
  successor as its location requires
- **AND** it SHALL not hand-author a replacement card or infer a work ID

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** accepted prior evidence supports a Wave2 pure-synthesis reference
- **THEN** Wave2 guidance SHALL preserve its existing Phase-owned
  existing-backed `00-cross-*` materialization path
- **AND** newly fetched evidence SHALL still use targeted-evidence submission
