# Tasks: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## 1. Scaffold

- [ ] 1.1 @impl LDC-001, LDC-009: Create `DPT_FRAMEWORK/host_tools/` directory. Done when the directory exists and is ready to receive the launcher script, `.env.example`, and README.

- [ ] 1.2 @impl LDC-007: Create `DPT_FRAMEWORK/host_tools/.env.example`. Document every `DEEPSEEK_*` variable the launcher reads, with placeholder values for required vars (`DEEPSEEK_API_KEY=sk-your-key-here`, `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`) and commented-out defaults for optional vars. Include a header comment explaining: copy to `.env`, fill in values, run `--check`. Done when the file contains no real credentials, documents the endpoint URL configuration, and is self-explanatory when read alongside `README.md`.

- [ ] 1.3 @impl LDC-001 through LDC-009: Add nine requirement ID entries to `openspec/governance/req-registry.yaml` under a new `# local-deepseek-claude-launcher` group header. Insert between the LFW group (line 661) and GSK-004 (line 662). Reference the delta spec for exact descriptions. Done when all nine IDs are registered in alphabetical order within the group, no duplicates exist, and the `prefixes:` block already has `LDC: local-deepseek-claude-launcher`.

- [ ] 1.4 Run `node openspec/governance/check-project-reqs.mjs` to establish baseline. Since the delta spec already exists, expected result: LDC-001 through LDC-009 show as `pending` (found in the active change delta). Record the baseline; any unexpected duplicates or orphans must be resolved before proceeding.

## 2. Launcher script and README

- [ ] 2.1 @impl LDC-009: Create `DPT_FRAMEWORK/host_tools/README.md`. The README SHALL document:
  - What this directory is: a self-contained local DeepSeek Claude Code launcher
  - Zero external dependencies: only needs the global `claude` command on PATH
  - Setup: `cp .env.example .env` → edit `.env` (two required vars: `DEEPSEEK_API_KEY` + `DEEPSEEK_ANTHROPIC_BASE_URL`)
  - Verify: `./deepseek-claude-launcher.sh --check`
  - Launch: `./deepseek-claude-launcher.sh [any claude args...]`
  - Key fact: CLI surface is identical to `claude` — same arguments, same exit codes
  - Everything (script, config, docs) lives in this directory; nothing else to install
  - Done when a first-time user can configure and launch from the README alone, without reading any other file.

- [ ] 2.2 @impl LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-008: Implement `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh`. The script SHALL:
  - Resolve `.env` from `$SCRIPT_DIR/.env` using `BASH_SOURCE[0]` + `dirname` + `cd` + `pwd -P` — no repo-root dependency; document that bare-name PATH lookup is unsupported (LDC-001)
  - Check `claude` on PATH, exit 1 if missing (LDC-006)
  - Check `.env` exists as a readable regular file (`[[ -f "$ENV_FILE" && -r "$ENV_FILE" ]]`), exit 2 if missing, not a file, or unreadable (LDC-006)
  - **Phase 1**: Enumerate and unset all `ANTHROPIC_*`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, `API_TIMEOUT_MS` from inherited env (LDC-002)
  - **Phase 2**: Source `.env` with `set -a` for auto-export (LDC-001)
  - **Phase 3**: Unset any `ANTHROPIC_*`/`CLAUDE_CODE_*` again (defense against wrong prefix in .env), then export all Anthropic vars exclusively from `DEEPSEEK_*` counterparts with documented defaults (LDC-002)
  - Validate `DEEPSEEK_API_KEY` is non-empty, exit 2 if missing (LDC-006)
  - Validate `DEEPSEEK_ANTHROPIC_BASE_URL` is non-empty with `http://` or `https://` scheme and non-empty host, exit 2 if unset, empty, or invalid (LDC-003)
  - In `--check` mode: run ALL checks (not fail-fast), report each with `[OK]`/`[FAIL]`, redact API key value, exit code = worst severity (0=all pass, 1=only claude-missing, 2=any config error), do NOT launch claude (LDC-004)
  - In normal mode: after all validations pass, `exec claude "$@"` — transparent argument and exit-code passthrough, no injected flags (LDC-005, LDC-008)
  - Done when the script is executable, passes shellcheck (if available), and manual `--check` with a test `.env` in the same directory produces correct output.

## 3. Delta spec

- [ ] 3.1 @impl LDC-001 through LDC-009: Verify and finalize the delta spec at `specs/local-deepseek-claude-launcher/spec.md`. Confirm: `## Purpose`, `> req:` header listing all nine IDs, `## ADDED Requirements` with one `### Requirement:` block per LDC ID with `#### Scenario:` sub-blocks. All requirement titles are stable semantic anchors (no ID in title). Each requirement has at least one scenario; LDC-006 includes a scenario for invalid endpoint cross-referencing LDC-003. Done when the spec is internally consistent with design.md and tasks.md.

## 4. Integration tests

- [ ] 4.1 @impl LDC-001 through LDC-009: Create `tests/integration/host_tools/deepseek-claude-launcher.test.mjs`. The test file SHALL:
  - Use `node:test` + `node:assert/strict` + `spawnSync` (following existing integration test patterns)
  - Create a per-test temp directory under `tests/.test-tmp/` with the launcher's self-contained structure: `.env` and `deepseek-claude-launcher.sh` symlink both inside a `DPT_FRAMEWORK/host_tools/` subdirectory, plus `fake_bin/claude`
  - Include a fake `claude` bash script that records its invocation (args + relevant env vars) to a JSON file and exits with `$CLAUDE_FAKE_EXIT_CODE` (default 0)
  - Clean up temp directories in `after()` hook
  - Cover 12 cases:
    1. --check passes with valid config → exit 0, all [OK]
    2. --check fails when .env is missing → exit 2
    3. --check fails when DEEPSEEK_API_KEY is empty → exit 2
    4. --check with both claude-missing and config-error → exit 2, both failures reported
    5. Rejects invalid endpoint URL (missing scheme) → exit 2
    6. Accepts valid endpoint `https://api.deepseek.com/anthropic` and launches fake claude
    7. Arguments are passed through to fake claude
    8. Exit code is preserved from fake claude (e.g., exit 42)
    9. Inherited ANTHROPIC_BASE_URL is cleaned (three-phase isolation verified)
    10. No --allow-dangerously-skip-permissions in default invocation
    11. --check mode does not exec claude
    12. Fails when claude is not on PATH → exit 1
  - Done when `node --test tests/integration/host_tools/deepseek-claude-launcher.test.mjs` reports all 12 tests pass.

## 5. Documentation and version

- [ ] 5.1 Add a one-line pointer to `SETUP.md` §6 (Trigger The Framework) or a new §7: mention that `DPT_FRAMEWORK/host_tools/` contains a self-contained local DeepSeek launcher, see its `README.md` for setup. Keep it minimal — `host_tools/README.md` is the authoritative documentation. Done when the pointer is present and consistent with the README.

- [ ] 5.2 @impl VEM-001, VEM-002, VEM-003: Update `CHANGELOG.md` — prepend a `## v0.33` entry before `## v0.32` with a one-sentence summary of the self-contained launcher addition. Update `DPT_FRAMEWORK/RUN.md` — change the version banner on line 2 from `v0.32` to `v0.33`, change `## Current Release: v0.32` to `## Current Release: v0.33` on line 10, and add a short release note. Done when both files are consistent and the RUN.md banner matches the CHANGELOG top entry.

## 6. Governance checks

- [ ] 6.1 Run `node openspec/governance/check-project-reqs.mjs`. Expected: PASS with 0 duplicates, 0 unregistered, 0 orphans, 0 reusedRetired. LDC-001 through LDC-009 should be `pending` (found in the active delta spec). If any issues are found, fix the registry or spec before marking done.

- [ ] 6.2 Run `node openspec/governance/check-project-specs.mjs`. Expected: PASS with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader. If any issues are found, fix the spec before marking done.
