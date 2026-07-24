# Implementation Evidence

## Pre-Target Baseline

Baseline source version: `v0.47` worktree before DEW-021 target-code edits. All reproductions used fresh disposable directories created through the existing work-unit test helper; no diagnostic or production bundle was edited.

| Hypothesis | Fresh-bundle observation | Evidence class |
|---|---|---|
| Malformed and omitted observations are not distinguishable at the claim feedback boundary | A claim with no observation returns `claimed_count: 0`, `reason_code: observation_required`, and follows the existing audit path. A supplied contradictory `{ outcome: available, source: not_observed, reason_code: probe_succeeded }` throws raw `ZodError` with only `invalid actor observation outcome/source/reason combination`. | Deterministic baseline; DEW-021 will add structured pre-trace handling only for supplied malformed input. |
| Current authoring delivery hides validator-known construction facts | `describeDirectOutputContract('wave0.source-metadata-array.v1')` returns only `Source metadata array`, top-level YAML-array shape, and a reference to the schema. Cache policy exposes the three leaves and mapping constants, but the task lacks one complete owner-derived construction entry. | Deterministic baseline; DEW-021 will project existing validator-owned facts without a second validator. |
| Candidate action and formal repair details can disagree | `deriveWorkUnitCandidateProjection()` selects its action by repair scope; `recordSubmitRejection()` calls `rejectionGuidance(violations)`, whose primary is independently `violations[0]`. A mixed-root fresh candidate is therefore a deterministic split risk. | Deterministic baseline; DEW-021 will use one selected normalized violation for all public primary details. |
| BUG-120 requires a separate owner chain | `phase-wave1.md -> shared-reference-template.md` is a Phase-Agent reference-materialization path. A delegated `dpt-evidence-extractor` task can prove supplied-task delivery and native submit-chain compatibility, but not private reading of the Phase-Agent guidance. | Honest external/actor boundary; not a DEW-021 closure claim. |

## Baseline Commands

```bash
node --input-type=module -e "... claimWorkUnits() on a fresh work-unit bundle with omitted and contradictory observations ..."
node --input-type=module -e "... describeDirectOutputContract('wave0.source-metadata-array.v1') ..."
rg -n -C 5 "rejectionGuidance|violations\\[0\\]|deriveWorkUnitCandidateProjection" DPT_FRAMEWORK/engine/
node openspec/governance/check-verification-routing.mjs --change make-delegated-work-contracts-constructible --mode plan
```

The routing-plan command passed before target edits. The focused red tests added in tasks 1.2 and 1.3 become the durable deterministic reproduction; the selected real-actor case remains `PASS`/`FAIL`/`NOT_RUN` only from native runtime evidence.

## Implemented Surface And Boundary Audit

| Surface | Implemented result | Authority boundary retained |
|---|---|---|
| Actor observation entry | `ACTOR_OBSERVATION_CASES` is one immutable four-shape, seven-tuple definition. It drives exact Zod tuple validation and the role-bound output projection; malformed supplied input returns JSON-safe field issues before trace, allocation, queue, index, batch, or envelope mutation. CLI option presence distinguishes `--actor-outcome=` from omission. | A tuple remains an Agent-supplied native observation. The projection does not choose an outcome or convert HITL, history, or generic access into role proof. Omitted input retains the existing `unknown/not_observed/observation_required` audit path. |
| Authoring facts | `REFERENCE_METADATA_FIELDS` feeds both `ReferenceMetadataSchema` and the Wave0 field projection. Direct-output and cache-leaf helpers expose Zod-validated read-only authoring views from their existing evaluator definitions. | No task parser, second validator, or task-owned acceptance rule exists. |
| Completion entry | The existing `task.md` begins with one generated `## Completion Contract`, with result, output, cache/source, receipt, and dry-submit facts. Spawn points only to that section. Wave1 Phase/role guidance now names `Completion Contract -> Cache And Source Facts`. | The entry is regenerated guidance from manifest/beacon/result-schema/evaluator/receipt owners. It pre-creates no result, receipt event, cache leaf, output, source claim, or ledger byte. Historical task text remains readable without rewrite. |
| Candidate feedback | Candidate projection exposes `selected_primary`; normal dry-submit and normal formal rejection reuse it for every public primary field. Timeout preflight forwards only `recommended_action` and `primary_root_code`. | `violations[]` stays intact, independent roots remain diagnostic, late-submit retains its historical acceptance path, and no persistent selector or retry controller was added. |

Removed duplicate paths: the legacy task renderer, the task/spawn direct-output completion fragments, and the formal rejection's independent `violations[0]` primary choice. No new runtime file, schema field, mutable state, validator, controller, retry branch, success authority, queue operation, ledger amendment, Gate/degradation rule, or terminal-replacement behavior was added.

BUG-114 is closed only for discoverability and structured same-check feedback: malformed supplied observations no longer expose an opaque parse error, while proof requirements remain fail-closed. BUG-115 is closed only for the generated constructible authoring entry and evaluator-owned facts; it does not make generated guidance acceptance authority. BUG-120 remains unclosed and outside DEW-021: its Phase-Agent `phase-wave1.md -> shared-reference-template.md` materialization chain is neither delivered to nor proven read by a delegated actor here.

## Verification Results

Deterministic evidence passed on current code:

```bash
node --test tests/engine/work-unit-actor.test.mjs \
  tests/engine/work-unit-contract-constructibility.test.mjs \
  tests/engine/work-unit-lifecycle.test.mjs \
  tests/engine/work-unit-projection.test.mjs \
  tests/engine/work-unit-submit.test.mjs \
  tests/engine/helpers/direct-output-contract.test.mjs \
  tests/engine/helpers/cache-leaf-contract.test.mjs \
  tests/integration/engine/work-unit-contract-constructibility.test.mjs \
  tests/integration/engine/work-unit-role-contract-delivery.test.mjs \
  tests/integration/cli/operate-work-unit.test.mjs
node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs
node DPT_FRAMEWORK/cli/validate-workflow-package.mjs
node openspec/governance/check-verification-routing.mjs --change make-delegated-work-contracts-constructible --mode assets
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
openspec validate make-delegated-work-contracts-constructible --strict
git diff --check
```

The selected `case-221-heavy-batch-subagent` also passed Autorun dry selection:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --dry-run --case case-221-heavy-batch-subagent
```

It selected exactly one Heavy `agent_behavior` case and reported `maximum_budget_exposure_usd: null`. The local `claude` executable is available, but the real supervisor requires an explicit caller-supplied USD limit and no such budget was authorized for this apply. Real-actor evidence is therefore `NOT_RUN` at the external budget boundary. No fixture, parent-authored result, receipt, cache, trace, or manually authored run artifact substitutes for it. A future funded invocation must let case-221's native finalizer record its actual `PASS`, `FAIL`, or `NOT_RUN` outcome with the retained `subject_task`, `subject_result`, `subject_receipt`, and `subject_output` evidence roles.

`node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check` passed with the configured local Claude executable and redacted provider configuration. It confirms runtime configuration only; it does not consume budget or establish an actor-behavior result.
