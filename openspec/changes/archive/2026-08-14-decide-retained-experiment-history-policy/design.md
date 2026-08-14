## Context

See `proposal.md` for why this current-only policy is required. The retained
observation reader currently accepts v1 and v2 batch-report/audit envelopes and
v1/v2 selection observations. It normalizes both into the same in-memory
record, so a v1 record can provide a current duration, cost, native outcome,
source relation, and a `needs_qualification` candidate. In particular, the
previous regression admission rule treats a source-matching result with no v2
execution surface as eligible for explicit qualification.

The authoritative current facts remain the active manifest, current V2
frontmatter, and a complete v2 Supervisor observation. `runSupervisor()`
receives the reader's result and is the only production caller that can pass a
selected item to the existing launch lifecycle. Retained files are not an
authority by their mere presence.

## Goals / Non-Goals

**Goals:**

- Make the retained-observation schema and reader establish current strategy
  facts only from complete v2 report/audit records whose nested selection
  observation is also v2.
- Keep historical files on disk, readable by people and non-fatal to current
  dry-run/launch inspection, while making them incapable of creating any
  prediction, admission, qualification, rotation, group-gap, or launch fact.
- Preserve the independent current-v2 execution-surface-drift qualification
  path and its explicit `--regression-qualification` opt-in.

**Non-Goals:**

- No historical-file migration, rewrite, deletion, backfill, adapter, version
  router, fallback, compatibility alias, or unknown-version support.
- No change to unrelated current `v1` discriminators, including completion,
  health, run-context, manifest-marker, or framework workflow contracts.
- No change to native outcome, lifecycle, health, cleanup, budget, the
  manifest, or any scheduler/retry/controller responsibility.

## Decisions

### 1. Make current retained contracts v2-only

`agent-experiment-contract.mjs` will remove the v1 retained batch-report,
audit-event, and selection-observation schemas from the current strategy
contract. A v2 report/audit result will require the v2 selection-observation
schema directly, rather than a union that admits v1 nested metadata. The
exported current report/audit readers will consequently validate only their v2
envelopes.

This is deliberately an input-boundary retirement, not a parser that first
recognizes every historical version and then decides which behavior to retain.
The files remain ordinary JSON files for human inspection; the current
Supervisor simply no longer treats their prior shapes as a current contract.

**Alternative considered:** preserve v1 schemas and tag their normalized
records as `historical`. Rejected because every downstream selector would still
need to remember a second admission class, recreating the compatibility path
that this change retires.

### 2. Treat non-current retained records as non-fatal diagnostics

`readRetainedExperimentObservations()` will parse only the strict v2 current
contract. A v1 record, a v2 envelope with a v1 selection observation, malformed
JSON, and a structurally invalid current envelope all follow the existing
non-fatal diagnostic path and add no normalized observation. There is no
special v1 conversion or diagnostic-to-current-record bridge.

As a result, a v1-only case reaches the existing honest result of no current
retained observation: no duration/cost prediction from that record, no
admission, and no qualification candidate. A valid current v2 observation in
another retained file is still handled normally; invalid history neither
overwrites it nor blocks dry-run or launch.

**Alternative considered:** distinguish v1 from malformed records with a new
version-specific diagnostic taxonomy. Rejected because the strategy's bounded
question is whether a record establishes a current fact, not why historical
material is old. The existing direct diagnostic form is sufficient and avoids
creating a new compatibility vocabulary.

### 3. Keep qualification limited to current-v2 execution-surface drift

Regression admission will remove the branch that interprets a missing execution
surface as a qualification candidate. It will retain the existing v2 case:
one latest complete v2 result has a source matching the current playbook,
passes the fast SLO, and has a comparable but stale execution surface. That
case remains `needs_qualification`; only the already explicit qualification
intent may select it.

All other missing retained facts, source drift, v1 history, malformed history,
and invalid outcome/health/SLO facts remain `ineligible`. The existing direct
group-gap reasons make this absence visible without launching a substitute or
starting calibration automatically.

**Alternative considered:** make any source-matching legacy result eligible
for a one-time qualification. Rejected because it turns historical performance
into current launch authority and would preserve exactly the version-dependent
decision surface the user chose to remove.

### 4. Keep the reader-facing explanation aligned with the one current rule

Update the two normal Autorun READMEs and their terminology test together.
They will say that v1 history is human-readable/diagnostic-only and that the
qualification command applies only to a current-v2, source-matching,
execution-surface-drift candidate. The test will reject the former historical
qualification wording and retain the explicit v2 qualification wording.

### 5. Constitutional review

**Semantic precision:** the changed reader answers one bounded question:
which retained records may establish current Autorun strategy facts? The
answer is `complete v2 observation`, `diagnostic-only history`, or the already
explicit absence of current evidence. It does not invent a new status or hide
the distinction that changes launch eligibility.

**Simple reliable control:** the loop becomes `strict current-v2 read ->
existing pure projection -> existing explicit selection -> existing
Supervisor`. Removing v1 normalization deletes a downstream decision branch;
no migration loop, adapter, cursor, or recovery path replaces it.

**Helper-oriented responsibility:** the user has selected the current-only
policy. The Agent may mechanically remove the obsolete contracts and update
their deterministic proof. The existing schema/reader and Supervisor retain
their deterministic validation and no code path gains semantic repair or
launch permission.

## Risks / Trade-offs

- **[A v1-only group loses its historical fast forecast]** -> It becomes an
  explicit no-current-observation gap and can enter a separately requested
  calibration, diagnostic, or assurance path; no silent launch replaces it.
- **[Old malformed files produce diagnostics during otherwise valid work]** ->
  Keep diagnostics non-fatal and exclude those records from the normalized
  input set, as the reader already does for invalid retained material.
- **[Removing v1 schema exports could affect an undiscovered caller]** ->
  Before editing, search supported source, tests, accepted specs, and active
  guidance. The proposal evidence currently finds the exports used only by the
  retained reader and its focused tests; an additional current caller becomes
  an ordinary repair task, not a reason to restore compatibility.
- **[Current-v2 qualification could regress while v1 is removed]** -> Keep its
  separate source-matching/stale-execution-surface test unchanged and make it
  a selected verification claim.

## Migration Plan

1. Complete the feedback plan review and all planning checks before target
   edits. Record any discovered current consumer as an ordinary task.
2. Remove the three retired current-input schema branches, make the retained
   reader v2-only, and narrow regression admission to the current-v2 drift
   rule. Do not read, rewrite, or inspect real `.exp-bundles/` history.
3. Replace the v1-qualification fixtures with deterministic proof that v1 and
   malformed retained records create only diagnostics/no-current-observation,
   while the current-v2 qualification fixture remains selectable only with the
   explicit flag.
4. Update current Autorun guidance and its terminology test, then run the
   selected unit and integration evidence plus structural governance checks.
5. Sync the four delta specs into their accepted owners and complete feedback
   closeout before governed archive. There is no data rollback. Reinstating a
   retired v1 current-input path would require a separate OpenSpec decision.
