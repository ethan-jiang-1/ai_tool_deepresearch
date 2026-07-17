# Tasks: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## 0. Apply gate

- [ ] 0.1 @impl VER-001, VER-003: Before editing target code, run `node openspec/governance/check-verification-routing.mjs --change add-local-deepseek-claude-launcher --mode plan`. Stop and repair the change-root plan if it does not pass.

## 1. Scaffold

- [ ] 1.1 @impl LDC-001, LDC-009: Create `DPT_FRAMEWORK/host_tools/`. Done when the directory is ready to receive the Node launcher and README; it SHALL NOT contain `.env` or another credential store.

- [ ] 1.2 @impl LDC-007: Create repo-root `.env.example`. Document required `DEEPSEEK_API_KEY`, loopback-only `DEEPSEEK_ANTHROPIC_BASE_URL` (for example `http://127.0.0.1:8080/anthropic`), and `DEEPSEEK_MODEL`, plus optional model-alias and timeout keys. Include only placeholders and safe local examples. Done when `git check-ignore .env` succeeds and `.env.example` contains no real credential or remote endpoint example.

- [ ] 1.3 @impl LDC-001 through LDC-009: Confirm the proposal-time `LDC` prefix and `LDC-001` through `LDC-009` entries remain registered under `# local-deepseek-claude-launcher`; do not allocate replacements or duplicate IDs.

- [ ] 1.4 Run `node openspec/governance/check-project-reqs.mjs` to establish baseline. Since the delta spec already exists, expected result: LDC-001 through LDC-009 show as `pending` (found in the active change delta). Record the baseline; any unexpected duplicates or orphans must be resolved before proceeding.

## 2. Launcher script and README

- [ ] 2.1 @impl LDC-009: Create `DPT_FRAMEWORK/host_tools/README.md`. Document Node.js >=20 and `claude` prerequisites; root `.env.example` → root `.env` setup; three required values; loopback-only endpoint policy; `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check`; normal launch with Claude arguments; user/Agent/launcher/Engine responsibilities; and the absence of settings mutation, remote fallback, or default permission bypass.

- [ ] 2.2 @impl LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-008: Implement executable `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` with Node built-ins only. It SHALL:
  - Derive repo-root `.env` from `import.meta.url`, independent of CWD; reject missing/unreadable config with exit 2.
  - Parse only documented `DEEPSEEK_*` assignments as data; never source/evaluate shell; reject malformed/duplicate supported keys and require non-empty API key, local endpoint, and model.
  - Build the child env from inherited process state after deleting all inherited `ANTHROPIC_*`/`DEEPSEEK_*` values and owned routing keys; map only parsed config, with optional aliases falling back to `DEEPSEEK_MODEL`.
  - Accept only HTTP/HTTPS loopback hosts (`localhost`, `.localhost`, `127/8`, `::1`) without URL credentials; reject remote/wildcard/malformed endpoints with no override.
  - Implement redacted all-checks `--check` with exit 0/1/2 and no child launch.
  - Spawn `claude` without a shell in normal mode, preserve exact caller arguments and inherited stdio, propagate numeric exit or signal outcome, and inject no Claude flags/settings.

## 3. Delta spec

- [ ] 3.1 @impl LDC-001 through LDC-009: Verify and finalize the delta spec at `specs/local-deepseek-claude-launcher/spec.md`. Confirm: `## Purpose`, `> req:` header listing all nine IDs, `## ADDED Requirements` with one `### Requirement:` block per LDC ID with `#### Scenario:` sub-blocks. All requirement titles are stable semantic anchors (no ID in title). Each requirement has at least one scenario; LDC-006 includes a scenario for invalid endpoint cross-referencing LDC-003. Done when the spec is internally consistent with design.md and tasks.md.

## 4. Integration tests

- [ ] 4.1 @impl LDC-001 through LDC-009: Create `tests/integration/host-tools/claude-deepseek.test.mjs`. The test file SHALL:
  - Use `node:test` + `node:assert/strict` + `spawnSync` (following existing integration test patterns)
  - Create a per-test temporary repository shape with root `.env`, a copied production launcher under `DPT_FRAMEWORK/host_tools/`, and a test-owned executable Node fixture named `claude` on `PATH`
  - Record fixture args/relevant env and configurable exit behavior without a real Claude binary, credential, model, or network call
  - Clean up temp directories in `after()` hook
  - Cover successful redacted `--check`; accumulated failures; missing key/model/config/claude; accepted `localhost`/`127/8`/`::1`; rejected remote/wildcard/credential-bearing/malformed URLs; no shell evaluation or root-env bulk export; inherited routing cleanup; exact arguments; inherited stdio; child exit/signal outcome; and absence/preservation of permission flags according to caller input
  - Done when `node --test tests/integration/host-tools/claude-deepseek.test.mjs` passes and the credential sentinel is absent from stdout/stderr.

## 5. Documentation and version

- [ ] 5.1 Add a concise pointer to `SETUP.md` §6 or a new §7: mention the optional local-only DeepSeek Claude launcher, root `.env.example`, and `DPT_FRAMEWORK/host_tools/README.md`. Keep the README authoritative and do not place credentials or permission grants in setup prose.

- [ ] 5.2 @impl VEM-001, VEM-002, VEM-003: Update `CHANGELOG.md` — prepend a `## v0.33` entry before `## v0.32` with a one-sentence summary of the local-only host launcher addition. Update `DPT_FRAMEWORK/RUN.md` — change the version banner on line 2 from `v0.32` to `v0.33`, change `## Current Release: v0.32` to `## Current Release: v0.33` on line 10, and add a short release note. Done when both files are consistent and the RUN.md banner matches the CHANGELOG top entry.

## 6. Governance checks

- [ ] 6.1 Run `node openspec/governance/check-project-reqs.mjs`. Expected: PASS with 0 duplicates, 0 unregistered, 0 orphans, 0 reusedRetired. LDC-001 through LDC-009 should be `pending` (found in the active delta spec). If any issues are found, fix the registry or spec before marking done.

- [ ] 6.2 Run `node openspec/governance/check-project-specs.mjs`. Expected: PASS with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader. If any issues are found, fix the spec before marking done.

- [ ] 6.3 Run `openspec validate add-local-deepseek-claude-launcher --strict`, the focused integration test, and `git diff --check`; repair any failure before completion.

- [ ] 6.4 @impl VER-001, VER-003: Run `node openspec/governance/check-verification-routing.mjs --change add-local-deepseek-claude-launcher --mode assets` after the declared test asset exists and before archive.
