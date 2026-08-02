## Context

See `proposal.md` and the EXO-002 delta. `PROFILE_TABLE` currently lists `work_units` as a required `standard` section even though the accepted profile contract assigns standard only the light checks, Gate diagnostics, and trace/log timeline consistency. The retained `case-51` report shows the practical effect: three valid standard targets with no allocated work-unit authority become top-level `ISSUES` for that sole reason.

`buildHealthReport` already derives every section's `required` flag from `PROFILE_TABLE`, while `computeHealthStatus` already aggregates only required section issues. The verifier always preserves a `work_units` projection in the report, including section-level diagnostics.

## Goals / Non-Goals

**Goals:**

- Align the data-driven standard profile with EXO-002 without changing the health report envelope.
- Preserve work-unit lifecycle observations for standard targets while keeping heavy provenance checks blocking.
- Add focused tests for the policy table and the observable standard-versus-heavy outcome.

**Non-Goals:**

- Do not change native playbook verdicts, completion-declared health targets, work-unit allocation, receipts, or case-51 fixtures.
- Do not suppress or reinterpret an observed work-unit diagnostic.
- Do not change filename cost tiers, regression admission, budgets, timeouts, or create another health profile.

## Decisions

### Remove `work_units` from the standard required-section list

The implementation changes the `standard` entry in `PROFILE_TABLE` to require only `trace`, `legacy_trace`, `bundle_schema`, `gate_attempts`, and `timeline`. `heavy` retains `work_units` and its existing provenance sections. `buildHealthReport` and `computeHealthStatus` then apply the correct policy through their existing shared path; no special-case override is added to the verifier.

Making an absent index appear clean by fabricating an empty work-unit authority was rejected: it would replace a direct runtime fact with fixture-like data. Adding a standard-only exception in the verifier was rejected because it duplicates policy already owned by the profile table.

### Keep optional work-unit diagnostics visible

`verify-bundle-health.mjs` continues to inspect `work_units` for every profile and emit its existing projection, diagnostics, and section status. Under standard, that section has `required: false`; an observed issue remains visible in the section but is excluded from top-level `issues` and status. Under heavy, the same fact stays required and blocks health.

The semantic reader question stays precise: a standard reader asks whether the declared standard checkpoint is healthy, while a heavy reader asks whether provenance including work-unit authority is complete. The report keeps the distinction between an optional diagnostic and a required failure, so the reader can stop at the top-level standard verdict or inspect the retained diagnostic when it is relevant. No new state, projection, command, or view is introduced.

The direct Source of Record remains the bundle's actual work-unit authority and the existing inspector result. The shortest legal loop is that direct fact -> existing section projection -> profile-table required flag -> existing top-level aggregation. Removing the extra standard blocking rule is a net simplification: it avoids case-specific fake `_work_units` setup and adds no fallback, recovery path, or controller.

The user has supplied the scope decision. The Agent applies the table/test change through the approved tasks; the Engine remains the only producer of the deterministic health verdict and does not infer missing authority as success.

### Lock the boundary with schema and verifier integration tests

The schema test will assert that standard does not require `work_units`, while heavy still does. The verifier integration test will use a real invalid work-unit authority with all standard-required sections valid, proving that standard preserves `work_units` as an optional issue without turning the report top-level status to `issues`. The existing heavy negative test remains the proof that the same authority defect is blocking for heavy.

## Risks / Trade-offs

- A standard run can finish `CLEAN` while exposing a work-unit diagnostic -> The diagnostic remains serialized, printed, and available for investigation; a case that needs provenance assurance must declare `heavy`.
- A profile-table edit could accidentally weaken heavy -> Focused schema and integration tests assert that heavy still requires `work_units` and treats a broken runtime receipt as `ISSUES`.
- Historical retained reports remain `ISSUES` under their then-current execution surface -> They remain historical facts; only a newly executed health report uses the corrected policy.

## Migration Plan

1. Update the profile table and its description; do not migrate bundle data or report schema versions.
2. Update the focused schema and verifier integration tests, then run them before any Agent-flow requalification.
3. Apply the dependent case-51 fixture change and run one bounded real requalification to produce a new health observation under the corrected profile.
4. Roll back by restoring the profile table entry if the focused tests reveal an unaccounted accepted requirement; no persisted state requires rollback.
