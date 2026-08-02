## Context

See `proposal.md` for motivation. The current Supervisor validates one authoritative manifest and V2 frontmatter, then `selectManifestEntries()` silently falls back to filename-Light when no selector is supplied. A retained `agent-experiment-batch-report/v1` already keeps useful per-case duration, cost, outcome, health, completion digests, and audit facts, but it cannot show whether the current execution surface is comparable to that historical run.

The strategy must improve selection frequency without turning the asset into a fast deterministic-only regression suite. It must also preserve the established boundaries: `PLAYBOOK_MANIFEST.md` owns active paths/order; selected playbook frontmatter owns case policy; filename owns its initial cost label; native completion owns one run's outcome; the health report owns health; and OpenSpec `verification-plan.yaml` owns a change's declared impact proof routing.

## Goals / Non-Goals

**Goals:**

- Add one pure, strict-Zod read model that projects current registered cases and retained observations into an inspectable next-batch selection.
- Make Headless selection fail closed without an exact selector or an explicit bounded run profile.
- Preserve initial filename labels while adding empirical duration/cost estimates, source/execution-surface comparability, diagnostic facts, and coverage gaps.
- Persist enough selection and execution-surface data in future reports to make later projections reproducible.

**Non-Goals:**

- No case moves, renames, frontmatter taxonomy migration, second manifest, cursor file, daemon, schedule, retry loop, or new lifecycle state.
- No automatic change-impact discovery from `@impl`, history, directory names, or a fingerprint.
- No new PASS/FAIL decision, health normalization, Agent-flow controller, or shortcut around a complete Markdown playbook.
- No historical re-run or backfill that pretends v1 reports carried facts they did not record.

## Decisions

### 1. Use a virtual read model, not a reclassification database

Add `DPT_FRAMEWORK/host_tools/lib/experiment-run-strategy.mjs` as a pure reader/selector. It receives validated manifest entries, a repository root, retained report/audit paths, and a strict request object. It returns a strict projection and selection plan; it writes nothing. The caller still calls `preflightRuntimeBindings()`, prepares roots, launches the Playbook Agent, validates native completion, runs health, and performs audit/cleanup through the existing Supervisor path.

`ExperimentCaseObservationSchema` is the reader-facing projection. It keeps independent fields for `filename_cost`, `health_profile`, proof profile, latest outcome/lifecycle/health facts, historical duration/cost observations, current source relation, current execution-surface relation, and diagnostic reasons. It intentionally has no mutator, assignment timestamp, or durable `tier` field. `unknown`, `stale`, and `matching` are calculated comparison results, not persisted lifecycle transitions.

The direct input precedence is:

1. Current manifest path/order and current selected playbook V2 frontmatter.
2. Current filename cost parsed by the existing manifest validator.
3. Complete retained per-case batch-report records; audit records are used only for durable selection-history fallback when a batch report is unavailable.
4. Old backlog summaries only as planning evidence; they are not read by the production selector.

Malformed/unsupported retained observations become projection diagnostics and do not invalidate unrelated manifest entries. A malformed current manifest/frontmatter still fails before selection or launch, as it does today.

**Alternative considered:** add a `classification` block to V2 frontmatter or a JSON registry. Rejected because it would make authoring-time guesses a second long-lived authority and require mass migration to correct ordinary code evolution.

### 2. Separate historical prediction from current proof comparability

New reports use `agent-experiment-batch-report/v2`. Each result and corresponding audit event carries:

```text
execution_surface:
  schema_version: agent-experiment-execution-surface/v1
  manifest_entry: { path, case }
  source_playbook_sha256
  instruction_sha256
  framework_helper_inventory: [{ path, sha256 }]
  framework_helper_sha256
  fingerprint
selection_observation:
  mode: exact | profile
  exact_selector | profile
  prediction_basis
  selection_reason[]
```

The inventory is a sorted, regular-file-only list of executable framework/helper sources under `DPT_FRAMEWORK/` and `experiments_env/shared/`; the aggregate digest is calculated from the canonical list. The current source playbook and injected Agent instruction are separate required inputs. The full manifest digest continues to be retained in the current run-context/completion binding, but comparison uses the selected manifest entry rather than the whole manifest digest so a harmless reordering does not invalidate every case observation.

The fingerprint is deliberately conservative: any included framework/helper change makes a past observation `stale`. It is not a dependency analyzer and does not prove every transitive command dependency stayed constant. Therefore `matching` means only that the recorded comparison inputs match; it never becomes an execution verdict or current Agent-behavior claim.

The reader accepts v1 and v2 reports. A v1 record can supply historical duration/cost/outcome/health and source-playbook information, but its execution-surface relation is `unknown`. A changed source digest or a differing comparable fingerprint produces `stale`; no recorded observation produces `unknown` facts. This preserves the useful cost signal without laundering it into current proof.

**Alternative considered:** derive a fresh fingerprint from Git HEAD or a full repository hash. Rejected because dirty working trees, untracked source changes, and unrelated documentation make it both less truthful and more noisy than the explicitly named executable surface.

### 3. Make a bounded selection plan the sole new output

`ExperimentRunStrategyRequestSchema` and `ExperimentRunSelectionSchema` use strict Zod objects with `.superRefine()` for cross-field constraints. A profile request must contain a positive `max_predicted_duration_ms`; Headless execution also carries the existing positive total USD cap. The selection result includes every selected candidate's prediction basis, predicted duration/cost or budget reservation, reason codes, and every omitted candidate's direct limiting reason.

Prediction resolves in this order:

1. latest source-matching retained duration/cost observation, labeled with its execution-surface relation;
2. a conservative initial estimate from immutable filename cost labels when calibration needs to admit a case with no usable observation: Light `120000` ms, Standard `600000` ms, Heavy `1200000` ms;
3. `unknown` / unavailable when neither source is safe for the requested profile.

The initial estimate is an admission guard, not a new property of the case. It is emitted in the selection result and does not change a filename or frontmatter field. For spend, the existing runtime cap remains authoritative; when a historical cost is unavailable, selection reserves the explicit per-case cap when present, otherwise the remaining total cap, rather than treating unknown cost as free.

The four profiles are deterministic queries, with manifest order as the final tie-breaker:

- `calibration`: unknown/stale source or execution-surface observations, missing cost/result observations, with least-recently-selected authoring groups preferred.
- `discovery`: clean, runnable breadth sample within bounds, round-robin across `frontmatter.experiment` groups; it preferentially includes one due Agent-behavior candidate before filling remaining capacity.
- `diagnostic`: latest native FAIL, native NOT_RUN, lifecycle ERROR/CANCELLED, or native PASS plus health ISSUES; the triggering fact is retained as the reason.
- `assurance`: a declared exact scope only. The request must combine this profile with an explicit `--case`, `--group`, `--tier`, or `--all` selector; it validates/labels that scope but never discovers impact from source code.

The CLI adds `--run-profile <calibration|discovery|diagnostic|assurance>`, `--max-predicted-duration-ms <positive>` and an optional `--agent-behavior-fresh-after-ms <positive>`. `calibration`, `discovery`, and `diagnostic` are exclusive with legacy exact selectors. `assurance` requires one legacy exact selector. Without a profile, existing explicit selectors retain their current behavior. No selector/profile is an error. Interactive keeps its exact-one-case contract and rejects all profile/bound options.

Discovery uses a default Agent-behavior freshness target of seven days, overridable by the explicit age option. A clean, native-PASS, matching-surface `agent_behavior` observation newer than that target is current for this bounded selection objective; a stale/unknown/older one is due. The result reports `included`, `due`, or `unavailable` separately from deterministic selection. A due case that does not fit bounds is `unavailable`, not silently replaced by a deterministic case.

Round-robin state is derived from retained report/audit `generated_at`/case observations: sort groups by least recent selection, then select each group's highest-priority candidate, repeating while bounds allow. There is no persisted cursor. `PASS + ISSUES` remains a diagnostic candidate, never a forced FAIL or an implicitly accepted clean observation.

**Alternative considered:** a default "fast suite" that periodically samples filename-Light cases. Rejected because current evidence shows that it would concentrate on deterministic contracts and hide the distinct Agent-behavior coverage gap.

### 4. Keep legacy selectors as explicit compatibility, not a second strategy

`--tier` remains a filename grammar filter and preserves manifest order. It is useful when a maintainer intentionally wants the original authoring estimate but it never claims empirical speed, freshness, coverage, or health. `--case`, `--group`, `--tier`, and `--all` remain direct selectors. The only removed behavior is the no-filter fallback to Light.

The dry-run JSON response becomes the inspection surface for profiles and direct selectors. It calculates the same selection plan used by execution but does not load credentials, create run roots, write reports, or invoke an Agent. This avoids adding an extra inspection command or a second selection database.

### 5. Boundary review: precision, control, and responsibility

**Semantic precision.** The new reader-facing level answers one bounded maintainer question: given current registration, retained observations, and explicitly supplied limits, what complete cases can be launched next and which facts remain unknown? It preserves the distinctions that decide that answer: author estimate, observed cost, proof subject, outcome, health, and comparability. The reader can stop at a selected case's direct input/reason or an explicit unavailable/unknown result; it cannot infer system correctness, a new verdict, or global coverage.

**Simple reliable control.** The shortest loop is `real run -> retained report -> pure projection -> explicit bounded selection -> existing Supervisor run`. It removes the hidden default-Light path and avoids the parallel handwritten speed index, static classification store, background scheduler, controller, and derived cursor that would otherwise accumulate. Profile errors have one nearest action: provide a valid explicit selector/profile and its required bound; invalid current manifest/frontmatter retains the existing validation repair path.

**Helper-oriented responsibility.** The user decides the strategy semantics, spending/time limits, and any change-impact case scope. The authorized Agent can inspect a dry-run plan and execute an accepted invocation; it does not ask the user to mechanically move/relabel cases. The deterministic Supervisor validates the request, selects from direct facts, records observation facts, and enforces lifecycle/budget; the Playbook Agent and Subject Agent retain complete Markdown/semantic execution; native finalization and health retain their verdict roles. No new flag grants an override, repair path, or permission to manufacture runtime evidence.

## Risks / Trade-offs

- **[Historical records lack v2 identities]** → Treat their comparability as `unknown`, retain their cost data with provenance, and let bounded calibration establish new observations gradually.
- **[Conservative helper inventory marks broad changes stale]** → Prefer safe re-calibration over false freshness; a future accepted change may introduce a proven dependency graph if the broad signal becomes materially costly.
- **[Initial estimates are imperfect]** → Use them only for calibration admission, expose the basis, enforce existing actual budget caps, and replace them with observed data after a real run.
- **[Discovery still cannot fit a real Agent-behavior case]** → Report `unavailable` with the exact bound/candidate; do not overclaim deterministic coverage.
- **[Known health noise dominates diagnostics]** → Preserve it as separate fact and leave suppression/reclassification to a later explicit health-owner change.
- **[Profile implementation adds an accidental controller]** → Keep the new module pure, expose only dry-run/selection data, and test that no selector or invalid request creates any runtime side effect.

## Migration Plan

1. During apply, register `ERS-001..003`, `EXA-009`, `EXO-007`, and `PLR-004`; complete the required feedback plan review and route-plan check before target edits.
2. Add the strict strategy/report schemas, report v1/v2 reader, fingerprint builder, observation projector, and focused unit/integration tests. No existing report or playbook is rewritten.
3. Wire the CLI parser and Supervisor selection path. Change no-filter Headless selection to fail before runtime preparation; retain direct selectors and Interactive behavior.
4. Emit v2 selection/execution-surface observations for every new result; retain v1 read compatibility. Update the Host Tools and playbook documentation with bounded dry-run/profile examples.
5. Run direct-selector and profile dry runs against the current manifest/reports before any voluntary real execution. Use subsequent real Autorun runs to calibrate naturally rather than backfilling synthetic records.
6. Release as `v0.66`, update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md`, run focused verification plus governance/routing checks, and archive only after the feedback closeout review.

Rollback is code-only: v1 reports remain readable and no strategy state migration exists. If profile selection must be disabled, remove the new profile path while retaining explicit legacy selectors; do not restore a silent default-Light invocation.
