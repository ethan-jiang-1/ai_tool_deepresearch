# Research Finding: Engine Gap Supersede Bypass Misreport

- Date: 2026-08-10
- Scope: current repository HEAD `16a9e56c9b2a75508da71d784aa72b29124a12c7`
- Question: whether the two Engine defects recorded in
  `_backlog/plans/engine-gap-supersede-bypass-misreport.md` still exist.
- Evidence location: this is change-local evidence for the archived change that
  implemented the relevant correction. The repository keeps durable research
  evidence under `openspec/changes/<change>/evidence/`, rather than in a
  global research-note directory.

## Verdict

| Alleged defect | Historical status | Current HEAD status | Verdict |
| --- | --- | --- | --- |
| Reviewed Wave1 backing rejects a contract-authorized prior submitted `source_ref` unless the current row repeats it in `output_files[]`. | Confirmed. The parent of `ea02a29af` used a current-row-only predicate in `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:104-108`. | Resolved. | Not a current Engine gap. |
| `delegated_bypass_suspected` reports a superseded predecessor's hash-valid raw declaration as hand-written because it compares raw rows only with current normalized rows. | Confirmed. The parent of `ea02a29af` had no historical-lineage exclusion in `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs:217-222`. | Resolved. | Not a current Engine gap. |

The plan was added in commit `79f836beee946785049317f86af90f76a1370d8d`
at `2026-08-09T05:18:17+08:00`. The corrective commit
`ea02a29af13e2ea39ed2997855a1fd15c280f8db` (`feat(engine): close work-unit
semantic contract drift`) landed at `2026-08-09T15:56:06+08:00` and is an
ancestor of the inspected HEAD. The historical assertions are therefore
credible incident descriptions, but they no longer describe current behavior.

## Defect 1: Prior Submitted Source Ref

The accepted contract requires an accepted `source_ref` to be either a current
output or an exact same-topic, same-wave, same-kind, hash-valid prior submitted
output with an allowed role. It also requires submit and downstream reviewed
backing to use the same resolver and forbids requiring a duplicate current
`output_files[]` declaration:

- `openspec/specs/agent/subagent-node-contract/spec.md:156-169`
- `openspec/specs/agent/subagent-node-contract/spec.md:184-195`
- `openspec/specs/research/wave1-intake/spec.md:118-136`

Current code satisfies that contract. `validateSubmittedClaimBacking` invokes
`resolveAcceptedSourceRefAuthorization` before checking that the referenced
path is materializable (`DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs:107-135`).
The resolver builds an eligible prior-output set from verified ledger, index,
manifest, queue, topic, wave, kind, and role facts, then returns
`authorization: 'prior'` only for one exact eligible path
(`DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs:576-715`). Formal
submit and dry-submit both invoke `validateSourceClaims` with the manifest
(`DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs:1282-1311` and
`DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs:1717-1755`).

Regression evidence is direct:

- `tests/engine/work-unit-submit.test.mjs:2057-2095` creates a supplementary
  Wave1 result with `output_files: []`, cites a prior evidence summary, and
  passes both dry-submit and formal submit.
- `tests/integration/cli/wave1-reference-convergence.test.mjs:57-80,134-155`
  formally submits the same shape and confirms reviewed backing accepts it;
  it still rejects invalid cache binding and a missing materializable source
  path as distinct failures.

## Defect 2: Superseded Predecessor Bypass Misreport

The accepted provenance-gate contract says that bypass detection must consume
the normalized current-or-historical ledger conclusion. A raw reader may locate
historical rows, but it cannot call them bypass evidence merely because they
are absent from the current set. Suppression is allowed only for an exact
hash-valid historical predecessor with a complete immutable supersession
relation and matching successor lineage:

- `openspec/specs/agent/work-unit-provenance-gate/spec.md:239-269`
- `openspec/specs/agent/work-unit-provenance-gate/spec.md:81-87`

Current code satisfies this. The normalized ledger places a submitted record
with `supersession_relation` in `historical`, rather than in current `facts`,
and records whether its raw row is `hash_valid_historical`
(`DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs:965-1008`). The
bypass scanner builds a historical-key set only after validating the predecessor
ID/hash, immutable relation, and successor lineage
(`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs:218-254`),
then uses it while scanning raw declarations
(`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs:485-503`).

`tests/engine/helpers/gate-helpers-provenance.test.mjs:428-457` verifies both
sides: a valid superseded predecessor is not suspected, while a hash-drifted
predecessor remains bypass evidence.

## Verification

The following focused current-source suites passed without repository changes:

```
node --test tests/engine/work-unit-submit.test.mjs
# 68 passed, 0 failed

node --test tests/engine/helpers/gate-helpers-provenance.test.mjs
# 16 passed, 0 failed

node --test tests/integration/cli/wave1-reference-convergence.test.mjs
# 3 passed, 0 failed
```

## Run-State Claims

The plan's statements about the named mature-open-source run (reference-floor
counts, queue state, depth-review state, and a uniquely blocking Gate) are not
current-repository facts. No reachable current run bundle was supplied for this
investigation, and runtime state is authoritative only in an explicitly
selected bundle. They are therefore retained as unverified historical incident
context, not independently confirmed or contradicted here.

## Recommendation

Do not open a new implementation change for these two alleged defects. Treat
BUG-212 and BUG-213 in the backlog plan as historical issues superseded by
`2026-08-09-close-work-unit-semantic-contract-drift`; leave any plan-status
edit to a separately authorized backlog-maintenance task.
