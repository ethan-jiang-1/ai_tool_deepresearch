## 1. Registry and baseline

- [x] 1.1 Register **CMI-007** in `openspec/governance/req-registry.yaml` with a stable one-line summary matching the delta spec. Done: no ID collision (current max CMI-006); `node openspec/governance/check-project-reqs.mjs` still runnable.
- [x] 1.2 Capture apply-before characterization: confirm `rb_plan.md`/`rb_status.json` currently carry no framework version (only `topic_registry_version:"2"`); confirm CHANGELOG-latest (`## vX.Y`) is the VEM-001 version authority. Done: short evidence note with file paths under the change.

## 2. Stamp framework version at bundle creation (CMI-007)

- [x] 2.1 Add the framework's version-read helper that resolves the current framework version from the latest `CHANGELOG.md` `## vX.Y` entry (single authority, per VEM-001). Done: no existing version-reader to reuse (verified) — this helper becomes the single version-reader for future reuse; no new version constant; fails closed to `"unparseable"` rather than guessing (does not block creation).
- [x] 2.2 Update `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` (frontmatter, next to `topic_registry_version`) and `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` to stamp `framework_version` at creation, sourced from 2.1. Done: a freshly created bundle's `rb_plan.md` frontmatter carries the current version.
- [x] 2.3 Confirm `framework_version` survives the only `rb_plan.md` rewriter — `canonical-topic-state.mjs` `add_topic` path (`CanonicalPlanSchema` is `.passthrough()`; `buildMutation` carries `current`; `renderPlan=stringifyYaml` serializes all keys; `apply-research-style.mjs` writes only `rb_profile.yaml`). Done: preservation verified as automatic — no schema change required; regression covered by test 3.2.

## 3. Tests

- [x] 3.1 Stamp test: a created bundle's `rb_plan.md` frontmatter has `framework_version` equal to CHANGELOG-latest, next to `topic_registry_version`. Done: focused unit test under `tests/`.
- [x] 3.2 Preservation test: after a simulated rerun `add_topic` rewrite of `rb_plan.md`, the creation stamp is unchanged. Done: negative proof the stamp survives rewrites (the guideline-control test — proves the fact is durable, not silently dropped).

## 4. Version, governance, validate

- [x] 4.1 Update repo-root `CHANGELOG.md` for **v0.30** (1–2 concise lines per VEM-001: bundle creation stamps its framework version in `rb_plan.md` frontmatter as provenance).
- [x] 4.2 Sync `DPT_FRAMEWORK/RUN.md` version banner to v0.30 (VEM-003).
- [x] 4.3 Annotate changed MD/JS with `req:` / `// @impl` for CMI-007 where applicable.
- [x] 4.4 Run `node openspec/governance/check-project-reqs.mjs` — PASS (0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired).
- [x] 4.5 Run `node openspec/governance/check-project-specs.mjs` — PASS (0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader).
- [x] 4.6 Run `openspec validate bundle-framework-version-stamp --type change --strict` and `openspec status --change bundle-framework-version-stamp`. Done: artifacts valid; apply-ready.
