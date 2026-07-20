# Implementation Evidence: reuse-delegated-output-contracts-at-submit

## Evidence Rules

- Change: `reuse-delegated-output-contracts-at-submit`
- Requirements: `AGQ-013`, `AGO-007`, `DEW-004`, `DEW-005`, `DEW-009`, `DEW-013`, `DEW-014`, `DEW-015`, `SNC-006`, `RWG-018`, `WAI-007`
- Console summaries and chat confidence are diagnostic only. A claim is `PASS` only when its selected native authority exists and validates; unavailable real-Agent capability is `NOT_RUN`, never fixture-substituted `PASS`.
- Pre-target evidence may write this change artifact and disposable bundles/spike paths only. Production framework, tests, and registered experiment assets remain untouched until the task 1.7 decision authorizes target edits.
- Every entry records command, native artifact/reference, result boundary, verdict, and residual risk.

## Apply Context

| Fact | Value |
|---|---|
| Apply schema | `spec-driven` |
| Apply start commit | `6d5710b557541e62b59661ed7784c3ffa9e6c6b1` |
| Node | `v20.19.6` |
| Platform | `Darwin 25.5.0 arm64` |
| Initial progress | `0/52` |
| Context read | `proposal.md`, `design.md`, `tasks.md`, and all six delta specs listed by `openspec instructions apply` |

## Pre-Target Ledger

### PT-001 Apply status and instructions

- Commands:
  - `openspec status --change reuse-delegated-output-contracts-at-submit --json`
  - `openspec instructions apply --change reuse-delegated-output-contracts-at-submit --json`
- Native authority: OpenSpec JSON output for this repo-local change.
- Observed: schema `spec-driven`; artifacts complete; apply state `ready`; progress `0/52`; context includes proposal, design, six delta specs, and tasks.
- Result boundary: proves apply routing and artifact availability only; it does not prove implementation behavior.
- Verdict: `PASS`.
- Residual risk: dynamic instructions cannot replace task-specific native verification.

### PT-002 Verification routing plan

- Command: `node openspec/governance/check-verification-routing.mjs --change reuse-delegated-output-contracts-at-submit --mode plan`
- Native authority: `openspec/changes/reuse-delegated-output-contracts-at-submit/verification-plan.yaml` parsed against the repository verification-routing contract.
- Observed: `Verification routing plan valid: reuse-delegated-output-contracts-at-submit (10 claims).`
- Result boundary: proves all ten planned claims have legal selected verification classes/assets/profiles; it does not prove those not-yet-created assets or runtime claims pass.
- Verdict: `PASS`.
- Residual risk: asset-mode validation remains pending until apply creates and executes the selected assets.

### PT-003 Current production timing baseline

- Commands:
  - `node experiments_env/shared/new-disposable-bundle.mjs direct_contract_baseline --case case-990 --force --target-dir .exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit`
  - production `operate-queue enqueue`, `operate-work-unit claim`, `operate-work-unit dry-submit`, `operate-work-unit submit`, and `inspect-wave0-output` over the retained bundle
- Native artifact/reference: `.exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/dpt_disp_case-990_direct_contract_baseline_5/`
  - `pretarget-claim.json` SHA-256 `4ccf6e5898ae768aa6f688ebe4162c3d68e4402727c5ea5d208af99021ad1985`
  - `pretarget-dry-submit.json` SHA-256 `725fbce6162437201550abb1d8c3bb952b0fd33f29d1657d80ecddcb79df23cb`
  - `pretarget-submit.json` SHA-256 `a5a8783529d9116b442014138ae00c83a99eacb2a76bc05b834d4bd6e0512f2e`
  - `pretarget-wave0-inspect.json` SHA-256 `8088c017c8f2021ddff197ab499c2bf3a1c9e01470e3970ea28e23a25a90aae9`
  - `pretarget-summary.json` SHA-256 `6d71c4ab118b8213381e493143a846bbcffddca49d286dded2126f39481126c7`
  - Engine-written `rb_output_declarations.jsonl` SHA-256 `ba1a61b9919600046df0410d66547321105775b213d02426399b6588b18a9151`
  - Engine/runtime `rb_trace.jsonl` SHA-256 `2fdb533af51b8816d419af3ecf868b74f44626a0ffab9e8a35440cc38f12c319`
- Observed: current `dry-submit` returned `ok: true`, `expected_submit: pass`, `side_effects: false`; formal submit returned `ok: true`, `status: submitted` and produced exactly one submitted ledger row. The same malformed object-shaped `artifacts/wave0/topic-a/source.yaml` then made Wave0 inspect exit 1 with `per_topic_reference_schema_valid`; its native hint states that the value is not a top-level YAML array.
- Result boundary: fixture-backed deterministic timing baseline only. The shared fixture helper wrote controlled actor-owned result/receipt/output/cache surfaces after a production claim; production CLIs alone allocated the work unit, accepted submit, wrote ledger/queue/trace authority, and produced Wave inspect. No ledger or success check was hand-authored, and this entry does not claim real-Agent behavior or research quality.
- Verdict: `PASS` for the submit-before-Wave timing gap.
- Residual risk: the inspect output also contains independent return-map roots because the minimal reference fixture is not a full Wave0 phase output. Those roots are not used for this conclusion; the retained `per_topic_reference_schema_valid` root independently proves the admitted direct-schema gap.

### PT-004 Node 20 bounded-reader spike

- Command: `node openspec/changes/reuse-delegated-output-contracts-at-submit/pretarget-reader-spike.mjs > .exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/pretarget-reader-spike.json`
- Native artifact/reference:
  - change-local spike `pretarget-reader-spike.mjs` SHA-256 `8178850f190ed6c1af1c6b5a075e356895a8a36f76ee6f053e6ba27dba57d7f0`
  - retained result `.exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/pretarget-reader-spike.json` SHA-256 `6c535a51e9284e605314ce5f4822ac465ea68e53b07eea9023135b97dc6a334e`
- Observed on `Node v20.19.6`, `darwin-arm64`:
  - empty/dot/absolute/traversal/backslash/redundant-separator targets rejected lexically;
  - regular file accepted; a file truncated from 1024 to 17 bytes after same-handle `fstat` returned a valid 17-byte shorter EOF snapshot;
  - initial 4 MiB + 1 and post-`fstat` growth to 4 MiB + 1 rejected;
  - stable final symlink and parent-symlink realpath escape rejected;
  - a Unix socket failed closed at `open`; it never reached regular-file acceptance;
  - hardlink alias remained an accepted regular in-bundle pathname with link count 2, confirming the documented ownership residual;
  - after pathname replacement, the opened handle returned `opened-original` while the current path contained `replacement-path-bytes`, confirming same-handle internal consistency but not pathname/inode ownership proof;
  - one leading BOM accepted; multiple/embedded BOM and invalid UTF-8 rejected.
- Discovery during spike: Node `TextDecoder` default BOM handling can hide one leading BOM. A first spike pass would therefore have accepted double BOM after a second manual strip. The corrected policy uses `{ fatal: true, ignoreBOM: true }` so the module explicitly owns the single-BOM rule. This correction happened only in the change-local spike before production/test edits.
- Result boundary: supported-platform feasibility observation for the proposed policy, not production implementation, cross-platform proof, or a reusable validator.
- Verdict: `PASS`.
- Residual risk: hardlink aliasing remains accepted; concurrent pathname replacement is not race-free ownership proof; special-file error codes are platform-specific and must map to the same closed integrity root rather than leak raw errors.

### PT-005 Legitimate artifact size/type audit

- Command: Node 20 `lstat` inventory over existing top-level `dpt_rb_*` bundle paths matching `artifacts/wave0/*/source.yaml`, `artifacts/wave1/*/evidence-summary.md`, and `artifacts/wave1/*/question-list.md`.
- Native artifact/reference: `.exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/pretarget-artifact-size-audit.json` SHA-256 `77b8dab18f788ee67754fe5e148b762af4952d942858d96422d1a2552b7fe124`.
- Observed across 4 current runtime bundles:
  - Wave0 source YAML: 35/35 regular files; min 3,215; median 7,373; p95 14,362; max 23,870 bytes at `dpt_rb_aiewf-2026-community-pulse/artifacts/wave0/08_capital-investment-perspective/source.yaml`.
  - Wave1 evidence summaries: 34/34 regular files; min 1,691; median 9,703; p95 16,056; max 23,446 bytes.
  - Wave1 question lists: 34/34 regular files; min 589; median 5,630; p95 11,011; max 18,548 bytes.
  - Overall: 103/103 regular files, all below 4,194,304 bytes; largest observed file is about 0.57% of the cap.
- Result boundary: audits existing runtime artifacts only. It does not prove every future legitimate output stays under the cap, and it does not treat missing Wave1 files as zero-byte samples; the 34/35 count difference remains visible.
- Verdict: `PASS`; the observed population supports retaining the 4 MiB per-target regular-file cap without revising design/spec/tasks.
- Residual risk: future unusually large legitimate artifacts may still hit the cap and require an explicit contract revision; no current non-regular legitimate sample was observed.

### PT-006 Real Subject Agent/Sub-agent baseline

- Commands:
  - `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-211-heavy-wave0-happy-path --dry-run --json`
  - `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check`
  - `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-211-heavy-wave0-happy-path --max-total-budget-usd 2 --max-case-budget-usd 2 --timeout 1200000 --json`
- Native artifact/reference:
  - `.exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/pretarget-real-agent-dry-run.json` SHA-256 `09a1380b1277d7e8dc33d5abb82ea44f74fa968b43d8f924a6e637b0f8b7699a`
  - `.exp-bundles/pretarget/reuse-delegated-output-contracts-at-submit/pretarget-agent-launcher-check.txt` SHA-256 `08eca9e9c5d4f25a5ccef796bd2311dcab626c0f54dd20592c9f9589be30551a`
  - Supervisor report `.exp-bundles/_reports/a7f14b7f-8eab-4f1c-9ca8-27d09c43901e.json`; batch `a7f14b7f-8eab-4f1c-9ca8-27d09c43901e`
  - transcript `.exp-bundles/_logs/a7f14b7f-8eab-4f1c-9ca8-27d09c43901e/001-case-211-heavy-wave0-happy-path.agent.jsonl` SHA-256 `a25698413e21d1ec291b640400c7aabd91cfe1af3dbd235ad536dc68e2d35894`
  - retained real bundle `.exp-bundles/runs/a7f14b7f-8eab-4f1c-9ca8-27d09c43901e/001-case-211-heavy-wave0-happy-path-9edfcc41-6362-42a0-9647-018dcd9d78dc/dpt_disp_case-211_w0_real_agent_work_unit_c/`
  - `case-211-claim.json` SHA-256 `edd87015d788547e74344fd03d29f810dc045965fbb27c587b400a09765ca9d7`
  - `case-211-subagent-evidence.json` SHA-256 `8713dd268560ab0c60b4b7af1e9b56e415d9301b875b8f13a1fa6e963b7cf6fe`
  - `case-211-submit.json` SHA-256 `e376e0257a933764521c924c323edaa17240acd904b08110d51b21a73734386b`
  - `case-211-gate.json` SHA-256 `bca873b32e4065b4af7ed3b7b777b56b1b252b0772094ea7588267f540a1f5e7`
  - `case-211-inspect.json` SHA-256 `b1e1f308e495dbdf686c895ced216ee4cb6ce072a6cd13fdc92d59917a708022`
  - real child `result.json` SHA-256 `3ef7db88ff91100b9b99748b4a369918687afc7e27f7dd7084ce7d7c69f033bb`
  - real child `runtime-receipt.jsonl` SHA-256 `a2d17336480c8bc8cc0c5605d80a8b0c342f4fb5cc27df50bce8eabcbdd57282`
  - Engine-written `rb_output_declarations.jsonl` SHA-256 `35a1a476b213a620ca8d4da9b54f5baf2f0603b4c4f7dba40c55bfdcdba0df28`
  - Engine/runtime `rb_trace.jsonl` SHA-256 `fe1e3bc955298a977a28bf698dfbb1f8fb4808c55f1c596e9b72dec14e327ec1`
- Observed:
  - canonical selection resolved the real-Agent `case-211-heavy-wave0-happy-path`; the real child ran three web searches and produced native output, cache, `work_started`, `file_written`, and `work_done` receipts;
  - claim occurred at `2026-07-20T14:30:42.969Z`, `work_done` at `14:35:00.000Z`, formal submit at `14:35:17.272Z`, and failed Wave0 Gate at `14:35:17.457Z`;
  - formal submit returned `ok: true`, appended exactly one Engine ledger row, and accepted the child's declared `reference/00-shared-agentic-coding-tools.source.yaml`; Wave0 then failed because the canonical `artifacts/wave0/agentic-coding-tools/source.yaml` was missing and lacked submitted coverage;
  - generated `task.md` contained the native dry-submit command and told the Phase Agent to consume it before formal submit, but the transcript contains no dry-submit invocation or retained dry-submit JSON: it directly invoked formal submit, Gate, and inspect;
  - Supervisor terminated later with native lifecycle outcome `ERROR`, reason `case_budget_exhausted`, cost `$2.005926`, duration `363294 ms`, and no native PASS/FAIL/NOT_RUN completion.
- Result boundary: this is real Subject/child behavior and native Engine timing, not fixture substitution. The complete requested baseline is `NOT_RUN` because no native dry-submit execution exists. This evidence verdict does not relabel the Supervisor's `ERROR`, and the retained output/receipt/submit/Wave sequence cannot prove dry-submit behavior, research quality, or Agent-frequency claims.
- Verdict: `NOT_RUN` with a native capability/compliance boundary; task 1.6 is complete through its honest `NOT_RUN` branch.
- Residual risk: a bounded real Agent run that actually executes dry-submit before formal submit remains unobserved. The run nevertheless supplies direct evidence that assignment-path ambiguity and checkpoint-skipping occur in practice.

### PT-007 Preventive-invariant decision

- Command: structured review of PT-003 through PT-006 against the five stop conditions in task 1.7 and design D1/D6.
- Native artifact/reference: PT-003 current-production CLI/trace/ledger evidence, PT-004 Node 20 reader spike, PT-005 legitimate artifact audit, and PT-006 native real-Agent Supervisor/transcript/bundle evidence.
- Observed:
  - version skew only: rejected; current production itself accepts an exact-output candidate before the later Wave direct fact rejects it;
  - post-submit Phase ownership: rejected; the exact assigned artifact's deterministic direct structure belongs at candidate first acceptance, while count/provenance/phase-wide facts remain at Wave;
  - ambiguous assignments: confirmed as a current problem rather than a reason to stop; PT-006 accepted a real child's non-canonical `reference/` source-YAML declaration, directly supporting the closed assignment resolver and generated exact-path projection;
  - infeasible safe reads: rejected; PT-004 supports the bounded same-handle policy with explicit hardlink/race residuals;
  - false invariant: rejected; PT-003 proves the acceptance-timing contradiction, and the invariant does not depend on Agent failure frequency or PT-006 completing dry-submit.
- Result boundary: authorizes or stops target edits; it is not a substitute for later regression evidence.
- Verdict: `PASS`; target edits are explicitly authorized to continue under the approved task list.
- Residual risk: implementation must preserve Wave-only authority, marker-absent legacy bounds, replay semantics, and the documented snapshot/hardlink/race limits. PT-006 remains `NOT_RUN`, so later case-164 is still required for the real-Agent replacement claim.

## Apply Verification Ledger

### AV-001 Complete repository regression

- Commands:
  - `npm test`
  - `node --test tests/engine/work-unit-actor-submit.test.mjs`
  - `find tests/ -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=dot`
- Native authority: repository `node:test` results over all 2,131 tests plus the focused legacy-actor rerun.
- Observed:
  - the first complete run reported 2,115 pass and 16 fail;
  - the one in-scope failure was an incomplete legacy fixture that removed actor markers but retained the current assignment marker and projected `required_outputs`; after making marker absence genuine in index, manifest, and beacon, the focused actor suite passed 3/3;
  - the second complete run no longer reported that actor failure and retained exactly 15 failures in three pre-existing unrelated groups.
- Reproducible unrelated failures excluded from all ten verification claims:
  - `node --test tests/engine/version-management.test.mjs`: one test reads the absent artifact `openspec/changes/simplify-iterative-research-interaction/specs/run-entry/spec.md` from a different change;
  - `node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`: one unchanged assertion requires high-attempt advice to contain `phase-final` even though the same assertion establishes the legal `check.next` as `phases/phase-wave1.md`;
  - `node --test tests/integration/host-tools/claude-deepseek.test.mjs`: 13 tests copy only `claude-deepseek.mjs` into a temporary host-tools directory, while the unchanged launcher imports `./lib/env-deepseek.mjs` and `./lib/agent-cli-launcher.mjs`; the copied launcher therefore exits before the asserted launcher behavior.
- Pre-existing boundary: the failing tests and their relevant production owners have no diff from apply start commit `6d5710b557541e62b59661ed7784c3ffa9e6c6b1`; `git show` at that commit retains both the `phase-final` assertion and launcher `./lib/*` imports. This change neither owns the missing other-change artifact nor modifies the handoff/host-tool surfaces.
- Result boundary: proves the complete repository surface was executed and every remaining failure is reproducibly isolated outside AGQ-013, AGO-007, DEW-004/005/009/013/014/015, SNC-006, RWG-018, and WAI-007. It does not relabel those unrelated failures as passing and does not use them as evidence for any verification-plan claim.
- Verdict: `PASS` for task 8.5's explicit unrelated-failure branch.
- Residual risk: repository-wide green remains blocked by independent maintenance of the three recorded groups; this change's selected focused suites and adapters remain the native authority for its ten claims.

### AV-002 Non-goal diff audit

- Commands: `git diff --stat 6d5710b55`, `git diff --name-only 6d5710b55`, `git ls-files --others --exclude-standard`, and focused `rg` scans over added lines and new modules for dependency manifests, TypeScript/Python, generic linter/registry language, selector fields, artifact hashes, migration, retry, and repair ownership.
- Native authority: apply worktree diff from commit `6d5710b557541e62b59661ed7784c3ffa9e6c6b1`, including tracked and untracked files.
- Observed:
  - no dependency manifest, `.ts`/`.tsx`, or `.py` file changed or was added; production imports remain Node built-ins, existing `yaml`, and repo-local modules;
  - no generic linter, dynamic contract registry/import, global path map, migration, or artifact-byte hash authority was added;
  - queue production code stores/repairs only explicit `payload.assignment_mode`, canonical receipts, and allowed writes; closed selector names appear only in rejection guards, while direct contract IDs and `required_outputs` are derived in the Engine assignment resolver;
  - candidate projection and actions remain Engine-owned; Phase guidance only consumes `primary_root_code` and explicitly requires non-retry fail plus a fresh queue ID, with no hidden retry or automatic artifact repair;
  - the target-level module remains a closed direct-fact evaluator and does not mutate runtime authority.
- Result boundary: verifies the implemented diff against the approved non-goals; it does not prove behavior already covered by focused and integration tests.
- Verdict: `PASS`.
- Residual risk: future edits before archive must rerun this audit because selector or lifecycle ownership can regress through documentation or queue changes even without schema changes.

### AV-003 Selected deterministic verification authorities

- Commands:
  - `node --test tests/engine/work-unit-assignment-contract.test.mjs tests/engine/helpers/direct-output-contract.test.mjs tests/schema/contracts/work-unit.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/md/work-unit-direct-output-guidance.test.mjs`
  - `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`
- Native authority: the nine deterministic assets selected in `verification-plan.yaml`, their `node:test` exits, and the production workflow-package validator JSON.
- Observed: all selected deterministic assets passed, 140/140 tests with 0 fail/cancel/skip; workflow validation returned `{ "passed": true, "issues": [] }`.
- Claim mapping: resolver 8 tests; bounded direct evaluator 9 tests; current assignment/candidate schemas 3 focused tests plus retained shared schema coverage; queue mode admission/repair 12 focused subtests within its integration asset; candidate lifetime/projection 24 CLI integration tests; Wave0 and Wave1 assets include 2 parity tests each while retaining 19 and 25 existing Gate tests; Markdown guidance has 6 tests across generated owner, approved owners, and whitelist inventory.
- Result boundary: deterministic fixture-backed or temporary-bundle proof only. It proves the nine selected contract/integration claims, not real Subject/child behavior, research quality, universal Agent compliance, or atomic artifact-byte ownership.
- Verdict: `PASS` for the nine deterministic verification-plan claims.
- Residual risk: the complete repository result and its three unrelated failure groups remain separately recorded in AV-001; this selected command is the direct authority for the change claims.

### AV-004 case-164 real-Agent attempts

- Canonical command family: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-164-heavy-direct-output-candidate-contract ... --json` through Agent Experiment Autorun, with retained Supervisor reports, prompt/transcript logs, run roots, native completion, and health output.
- Attempt ledger:
  - batch `0fca8fad-a70a-4d32-9457-d5b567357f20`: lifecycle `ERROR`, reason `case_budget_exhausted`, no native completion; report `.exp-bundles/_reports/0fca8fad-a70a-4d32-9457-d5b567357f20.json`, cost `$5.043677`, duration `602495 ms`;
  - batch `4d0adcec-5d52-4c9b-b6c6-6cb65256ec91`: exact native outcome `PASS` under an earlier insufficient postcheck, but not accepted for the current claim. Its retained `case-164-subject-result.json` says `status: failed`, `completed_turns: 2`, and the health report says the submitted replacement result is schema-invalid; the old postcheck could therefore append five passing checks without proving the required third successful Subject turn or current result-schema validity. This run remains visible as historical native `PASS`, not relabeled or used as verification evidence;
  - batch `f343cc52-2fe1-4c7e-b5b6-08531cf60bf2`: lifecycle `CANCELLED`, reason `external_sigint`, no native completion; report `.exp-bundles/_reports/f343cc52-2fe1-4c7e-b5b6-08531cf60bf2.json`;
  - batch `f933ab68-dc31-4b3c-b209-552889fa1a5d`: lifecycle `CANCELLED`, reason `external_sigint`, no native completion; report `.exp-bundles/_reports/f933ab68-dc31-4b3c-b209-552889fa1a5d.json`;
  - batch `892b5083-7c2e-4df8-90bf-28c4184d07f3`: exact native/effective outcome `NOT_RUN`, health `CLEAN`, reason `independent Subject/child Agent or real search/fetch capability unavailable`, cost `$1.018713`, duration `457340 ms`. The Subject completed two native result turns, the first candidate produced native dry-submit semantic root `key_findings_missing_or_empty`, and before-turn-2 hashes were retained; the adapter then exited 1 because the Subject did not retain the required canonical `case-164-turn2-claim.json`, so no third-turn independent child or replacement submit was accepted or synthesized.
  - after the harness made its already-required turn-2 native JSON filenames explicit, batch `50a38b65-9343-4dbe-ab91-a3a661157d6d`: exact native/effective outcome `PASS`, health `CLEAN`, cost `$1.162106`, duration `657532 ms`; all five current postchecks passed.
- Prior `NOT_RUN` native artifact/reference:
  - report `.exp-bundles/_reports/892b5083-7c2e-4df8-90bf-28c4184d07f3.json`, SHA-256 `ec97e922c644a73ac4c24b5f49a18b4b07be4821f9eb5da9a6a85c1b244363b2`;
  - retained bundle `.exp-bundles/runs/892b5083-7c2e-4df8-90bf-28c4184d07f3/001-case-164-heavy-direct-output-candidate-contract-5daee770-1d20-42d8-b63e-24699aba6e31/dpt_disp_case-164_eex_direct_output_candidate_2/`;
  - `case-164-subject-result.json` SHA-256 `5c5dbb5a4be56b40bc4f2cebe04b54dbd5405b3111991f3c2c3dd9fa7eeeca44`;
  - Subject transcript `case-164-subject-transcript.jsonl` SHA-256 `169d8b32af7e07d6522eea6b2d855d892c2a4383f17734b4eec8617f950cdade`;
  - first-child path index `case-164-first-child-evidence.json` SHA-256 `4ccb81bdfa6136cf4ce1583b313e26f6124919c46a4b665574bd37a9e75133f7`;
  - first-child `result.json` SHA-256 `4f483cf0990c6418037a6d7eeec76d7c75274f3cf156cfbe4c16440108a92848` and `runtime-receipt.jsonl` SHA-256 `f10f92a7b95e845f0489f0d78916f062fd2bb228ed9919b500006b707ef08166`;
  - native `case-164-turn1-dry-submit.json` SHA-256 `4f967c71e92f1f50d2bd869b7aa29f03139c10baf0c2145b40a0374c81d615e7`;
  - read-only `case-164-output-hashes.json` SHA-256 `4e35f2f88fb0a72e2a20c393414d0a5b977ba080e5ff45ba28815de3078b02a4`;
  - atomic adapter status SHA-256 `1b2f5a083325c33035cb246dcb6ceb08b00a036dfd9bf30e39aa76843a88af4f` and unavailable marker SHA-256 `07c78ddfbe47ff9cfe1995a03cfc2494adf9f60fc9e95763dec66441566e024d`;
  - native `rb_trace.jsonl` SHA-256 `7bc99bf5a3b2a77080cf0dc2c2e6ba2777ada82f4d9ed4acd1dd7dff690bd2dd`.
- Current `PASS` native artifact/reference:
  - report `.exp-bundles/_reports/50a38b65-9343-4dbe-ab91-a3a661157d6d.json`, SHA-256 `384940f20e107883e96dc93eb52c66afda341125b7174390d0fd967a5221900e`;
  - retained bundle `.exp-bundles/runs/50a38b65-9343-4dbe-ab91-a3a661157d6d/001-case-164-heavy-direct-output-candidate-contract-749c7100-8c5e-4ecd-b58b-82443bf3dc8e/dpt_disp_case-164_eex_direct_output_candidate_8/`;
  - Subject transcript SHA-256 `13681cb5713c29a91464295a318b80c107ebf67943e1ef6984275ee2dfeb26b6` and completed three-turn Subject result SHA-256 `2a4ae997e8c47f248e723062b3342cb6886d1cb12f72a81b371f599bd5f9b0c6`;
  - first-child result SHA-256 `4055332a0046f0c098aa6d1facc7126b6f2df2b54938838966434392d2473636`, native dry-submit rejection SHA-256 `6cbba593c2dbdd3d2bab0b9b109cc4bd2509dce287cde57edd3d9092647ae31b`, and output-hash observer SHA-256 `ef4d8a30d73767bbf823d418b757a95f218c5187a7abbfedc10ec1799032f5d6`;
  - second-child result SHA-256 `d839caadaeecfe2bb6ac682df40c45c4faffe6b19a8ce4bdc555c61699b3eef2`;
  - completion trace prefix SHA-256 `ab7d38f360c3f74cf69bc0c104a7c204d4e683596afb20833e8144f1a7178ce0`, 26 valid events, and five considered case checks all `passed: true` / `expected: true`.
- Observed PASS boundary: one Subject session completed three non-error result turns; first and replacement attempts used distinct work/queue IDs, delegated child records, source URLs, and cache trails; before/after turn-2 hashes were exact; only the first attempt failed with `semantic_contract:key_findings_missing_or_empty`; replacement dry-submit projected `submit`, formal submit returned ok, and the sole ledger row names the replacement.
- Result boundary: this is one setup-only real Subject/two-child/external-call recovery canary. It proves the specified semantic replacement procedure and no research quality, failure frequency, universal Agent compliance, artifact-byte immutability, or Wave-wide completion.
- Verdict: `PASS` for `real-agent-semantic-replacement` and task 7.4.
- Residual risk: the strict retained-filename/evidence contract is part of this canary's auditability; future Subjects that fail it remain honest `NOT_RUN` rather than observer-repaired evidence.

### AV-005 Production Markdown whitelist audit

- Commands: `git diff --name-only 6d5710b55 -- DPT_FRAMEWORK`, focused diffs for the approved owners, and added-line plus full-owner `rg` scans for `lint-agent-output`, `--schema`, `PATH_FORMAT_MAP`, `all Agent outputs`, and `all Markdown`.
- Native authority: production Markdown diff from the apply-start commit.
- Observed: Agent-facing behavior changed only in `DPT_FRAMEWORK/COMMANDS.md`, `workflows/nodes/phases/phase-wave1.md`, `workflows/nodes/shared/shared-schemas.md`, and `workflows/nodes/shared/shared-subagent-protocol.md`. Every hunk maps to assignment intent, narrow unclaimed repair, Engine-derived exact outputs, or candidate repair/replacement ownership. No other phase or role node changed. `DPT_FRAMEWORK/RUN.md` contains only task 9.2's v0.38 banner/current-release metadata. All prohibited product-language scans returned empty.
- Result boundary: proves the production Markdown ownership whitelist and language boundary; experiment playbooks, release notes, and tests are separate non-production verification/release assets.
- Verdict: `PASS`.
- Residual risk: any later Markdown edit before archive must rerun the name/hunk audit.

### AV-006 Verification-routing asset governance

- Command: `node openspec/governance/check-verification-routing.mjs --change reuse-delegated-output-contracts-at-submit --mode assets`.
- Native authority: verification-routing governance output over `verification-plan.yaml`, selected assets, playbook validation, and manifest registration.
- Observed: `Verification routing assets valid: reuse-delegated-output-contracts-at-submit (10 claims).`
- Result boundary: validates asset presence/classification and canonical boundaries; claim verdicts remain AV-003/AV-004's executed native authorities.
- Verdict: `PASS`.
- Residual risk: none beyond rerunning after later asset or manifest edits.

### AV-007 Requirement registry governance

- Command: `node openspec/governance/check-project-reqs.mjs`.
- Native authority: project requirement registry/spec occurrence governance exit.
- Observed: `All project requirement IDs consistent: 562 registered (53 retired, 0 orphan), 639 occurrences in main specs/active deltas.` The successful exit includes 0 duplicate, 0 unregistered, and 0 reused-retired violations.
- Result boundary: validates requirement identity hygiene, not executable behavior.
- Verdict: `PASS`.
- Residual risk: rerun after any later requirement-header edit.

### AV-008 Project spec governance

- Command: `node openspec/governance/check-project-specs.mjs`.
- Native authority: project spec hygiene governance exit.
- Observed: `All project specs valid: 77 main spec files under openspec/specs, 0 violations.` This covers 0 delta-header-in-main, missing Purpose, missing Requirements, and missing requirement-header violations.
- Result boundary: validates spec structure, not runtime behavior.
- Verdict: `PASS`.
- Residual risk: rerun after any later spec edit.

### AV-009 Strict validation and final ownership review

- Commands: `openspec validate reuse-delegated-output-contracts-at-submit --strict`, `git diff --check`, and focused source review/search over assignment-marker/legacy selection plus candidate/Wave rule ownership.
- Native authority: strict OpenSpec validator, Git whitespace checker, current schemas/validation code, and the executed focused tests in AV-003.
- Observed:
  - OpenSpec returned `Change 'reuse-delegated-output-contracts-at-submit' is valid`;
  - `git diff --check` returned no whitespace errors;
  - any index/manifest assignment marker presence requires both values to equal the sole current literal, manifest output contract reconstruction, and beacon three-way marker/output equality; partial, unknown, or drifted current projections fail before candidate acceptance, while legacy requires genuine marker absence and no projected `required_outputs`;
  - legacy Wave1 role normalization returns immediately for every marker-present record;
  - candidate submit calls only the shared required-target direct evaluator, while count, source URL, provenance, cache/queue coverage, depth, return-map, and phase-wide completeness checks remain implemented in the Wave evaluator/Gates.
- Result boundary: validates change structure, whitespace, and the two final ownership invariants. It does not turn case-164 `NOT_RUN` into PASS.
- Verdict: `PASS`.
- Residual risk: final commands are rerun after all task, harness, and evidence edits before apply completion is reported.

## Verification Claim Ledger

| Claim | Selected authority | Current verdict | Native reference | Residual risk |
|---|---|---|---|---|
| `assignment-contract-resolution` | unit | `PASS` | `tests/engine/work-unit-assignment-contract.test.mjs`; AV-003 | Closed matrix remains versioned; future versions require explicit resolver/schema expansion. |
| `bounded-direct-output-evaluation` | unit | `PASS` | `tests/engine/helpers/direct-output-contract.test.mjs`; AV-003 and PT-004 | Hardlinks and concurrent pathname replacement remain accepted/documented residuals. |
| `strict-work-unit-contract-schema` | unit | `PASS` | `tests/schema/contracts/work-unit.test.mjs`; AV-003 | Generated JSON Schema is structurally tested; Zod/candidate validation remains acceptance authority. |
| `candidate-checkpoint-lifetime` | integration | `PASS` | `tests/integration/cli/operate-work-unit.test.mjs`; AV-003 | Fresh reads are per invocation, not an atomic artifact/ledger commit. |
| `assignment-projection-and-supplementary-compatibility` | integration | `PASS` | `tests/integration/cli/operate-work-unit.test.mjs`; AV-003 | Genuine marker absence remains a bounded legacy compatibility surface. |
| `wave0-direct-evaluator-parity` | integration | `PASS` | `tests/integration/cli/check-gate-wave0-complete.test.mjs`; AV-003 | Count, provenance, cache, queue, and phase completeness intentionally remain Wave-only. |
| `wave1-assignment-mode-enqueue` | integration | `PASS` | `tests/integration/cli/operate-queue-validation.test.mjs`; AV-003 | Repair is intentionally limited to one genuinely mode-absent unclaimed card. |
| `wave1-direct-evaluator-parity` | integration | `PASS` | `tests/integration/cli/check-gate-wave1-complete.test.mjs`; AV-003 | URL, return-map, depth, provenance, and phase completeness intentionally remain Wave-only. |
| `direct-output-guidance-boundary` | integration | `PASS` | `tests/integration/md/work-unit-direct-output-guidance.test.mjs`; AV-003 and workflow validator | Markdown is a projection/flow owner, never contract or acceptance authority. |
| `real-agent-semantic-replacement` | Agent-flow | `PASS` | case-164 batch `50a38b65-9343-4dbe-ab91-a3a661157d6d`; AV-004 | One bounded canary does not establish research quality, frequency, or universal compliance. |

## Global Residual Risks

- Same-handle bounded evaluation does not prove hardlink ownership or eliminate every same-host concurrent pathname race.
- First acceptance evaluates a fresh snapshot but does not atomically bind artifact bytes into the ledger; no artifact-byte hash authority is added.
- Real-Agent evidence can prove one bounded recovery procedure, not research quality, failure frequency, or universal compliance.
