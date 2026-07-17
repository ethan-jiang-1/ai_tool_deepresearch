# Tasks: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## 1. Scaffold

- [ ] 1.1 @impl LDC-007: Create `.env.example` at repo root with all `DEEPSEEK_*` variables documented, placeholder values for required vars (`DEEPSEEK_API_KEY`, `DEEPSEEK_ANTHROPIC_BASE_URL`), and commented-out defaults for optional vars. Done when the file contains no real credentials, documents the local-only endpoint requirement, and references `SETUP.md` for setup instructions.

- [ ] 1.2 @impl LDC-001: Create `DPT_FRAMEWORK/host_tools/` directory. Done when the directory exists and is ready to receive the launcher script.

- [ ] 1.3 @impl LDC-001 through LDC-008: Add requirement ID entries to `openspec/governance/req-registry.yaml` under a new `# local-deepseek-claude-launcher` group header. Insert between the LFW group (line 661) and GSK-004 (line 662). Reference the proposal and delta spec for exact descriptions. Done when all eight IDs are registered in alphabetical order within the group, no duplicates exist, and the `prefixes:` block already has `LDC: local-deepseek-claude-launcher`.

- [ ] 1.4 Create `openspec/governance/check-project-reqs.mjs` PASS baseline: run the check script before any spec delta exists. Expected: LDC-001 through LDC-008 show as unregistered (not yet in any delta spec). Record the baseline; this is the expected state before Task 5.

## 2. Launcher script

- [ ] 2.1 @impl LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-008: Implement `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh`. The script SHALL:
  - Resolve repo root from `$SCRIPT_DIR/../..` and read `.env` there (LDC-001)
  - Check `claude` on PATH, exit 1 if missing (LDC-006)
  - Check `.env` exists, exit 2 if missing (LDC-006)
  - Enumerate and unset all `ANTHROPIC_*`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, `API_TIMEOUT_MS` from inherited env (LDC-002)
  - Source `.env` with `set -a` for auto-export (LDC-001)
  - Validate `DEEPSEEK_API_KEY` is non-empty, exit 2 if missing (LDC-006)
  - Parse `DEEPSEEK_ANTHROPIC_BASE_URL` host, match against `localhost|127.0.0.1|::1|[::1]`, exit 2 if non-local or unset (LDC-003)
  - In `--check` mode: report all checks with `[OK]`/`[FAIL]`, redact API key value, exit 0 or 1, do NOT launch claude (LDC-004)
  - In normal mode: export `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, model mappings, timeout, and traffic flags from `DEEPSEEK_*` counterparts with documented defaults (LDC-002)
  - `exec claude "$@"` — transparent argument and exit-code passthrough, no injected flags (LDC-005, LDC-008)
  - Done when the script is executable, passes shellcheck (if available), and manual `--check` with a test `.env` produces correct output.

## 3. Delta spec

- [ ] 3.1 @impl LDC-001 through LDC-008: Create delta spec at `specs/local-deepseek-claude-launcher/spec.md` with `## Purpose`, `> req:` header listing all eight IDs, and `## ADDED Requirements` containing one `### Requirement:` block per LDC ID with `#### Scenario:` sub-blocks. Done when the spec file exists, all requirement titles are stable semantic anchors (no ID in title), and each requirement has at least one scenario.

## 4. Integration tests

- [ ] 4.1 @impl LDC-001 through LDC-008: Create `tests/integration/host_tools/deepseek-claude-launcher.test.mjs`. The test file SHALL:
  - Use `node:test` + `node:assert/strict` + `spawnSync` (following existing integration test patterns)
  - Create a per-test temp directory under `tests/.test-tmp/` with mirrored repo structure (`.env`, `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh` symlink, `fake_bin/claude`)
  - Include a fake `claude` bash script that records its invocation (args + env) to a JSON file and exits with `$CLAUDE_FAKE_EXIT_CODE` (default 0)
  - Clean up temp directories in `after()` hook
  - Cover 13 cases:
    1. --check passes with valid local config
    2. --check fails when .env is missing (exit 2)
    3. --check fails when DEEPSEEK_API_KEY is empty (exit 2)
    4. Rejects non-local endpoint like `https://api.deepseek.com/anthropic` (exit 2)
    5. Accepts `http://localhost:8080` and launches fake claude
    6. Accepts `http://127.0.0.1:8080` and launches fake claude
    7. Accepts `http://[::1]:8080` and launches fake claude
    8. Arguments are passed through to fake claude
    9. Exit code is preserved from fake claude (e.g., exit 42)
    10. Inherited ANTHROPIC_BASE_URL is cleaned before launcher exports its own
    11. No --allow-dangerously-skip-permissions in default invocation
    12. --check mode does not exec claude
    13. Fails when claude is not on PATH (exit 1)
  - Done when `node --test tests/integration/host_tools/deepseek-claude-launcher.test.mjs` reports all 13 tests pass.

## 5. Documentation and version

- [ ] 5.1 @impl LDC-007: Add a "## 7. Host Tools: Local DeepSeek Claude Code Launcher" section to `SETUP.md` after the existing Section 6. Content: copy `.env.example` → `.env`, configure `DEEPSEEK_API_KEY` and local endpoint, run `--check`, launch. Note the local-only enforcement and that permission flags must be passed explicitly. Done when the section is present and consistent with `.env.example` and the launcher behavior.

- [ ] 5.2 @impl VEM-001, VEM-002, VEM-003: Update `CHANGELOG.md` — prepend a `## v0.33` entry before `## v0.32` with a one-sentence summary of the launcher addition. Update `DPT_FRAMEWORK/RUN.md` — change the version banner on line 2 from `v0.32` to `v0.33`, change `## Current Release: v0.32` to `## Current Release: v0.33` on line 10, and add a short release note. Done when both files are consistent and the RUN.md banner matches the CHANGELOG top entry.

## 6. Governance checks

- [ ] 6.1 Run `node openspec/governance/check-project-reqs.mjs`. Expected: PASS with 0 duplicates, 0 unregistered, 0 orphans, 0 reusedRetired. LDC-001 through LDC-008 should be `pending` (found in the active delta spec). If any issues are found, fix the registry or spec before marking done.

- [ ] 6.2 Run `node openspec/governance/check-project-specs.mjs`. Expected: PASS with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader. If any issues are found, fix the spec before marking done.
