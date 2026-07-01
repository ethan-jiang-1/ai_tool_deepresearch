## 1. OpenSpec artifact revision

- [x] 1.1 Verify requirement ID registration for `EEX-001..004`, `CRC-005..006`, `AGO-006`, `RWP-014`, `RTI-006` in `openspec/governance/req-registry.yaml`（已预注册——确认无冲突）
- [x] 1.2 Revise delta specs to use explicit `MODIFIED Requirements` where existing `agent-output-declaration` behavior changes, including delegated `complete()` cache trail failure semantics
- [x] 1.3 Clarify `cache_trails` authority wording: Sub-agent slot result may declare candidate trails; only Engine writes verified ledger `cache_trails`; Agent MUST NOT directly append `rb_output_declarations.jsonl`
- [x] 1.4 Clarify `countReferences()` authority boundary: pass/fail decisions use Engine ledger / committed declarations only; filesystem scan is diagnostic-only and orphan reference files cannot help gate/fork pass
- [x] 1.5 Clarify transition behavior: legacy empty `cache_trails` warn in Phase 1, but new rerun `action:add` success requires non-empty verified trails
- [x] 1.6 Add `agentic-queue` delta for AGQ-018 failure-semantics change: incomplete cache leaf becomes Phase 1 filter + warning, unsafe/non-leaf remains hard-fail
- [x] 1.7 Clarify referenced cache retention: ledger-referenced cache leaves cannot be deleted before `cache_coverage` / reentry verdict evidence is recorded
- [x] 1.8 Clarify quality-proof boundary: case-163 NOT RUN is honest diagnostic state but cannot satisfy Agent extraction quality proof for archive/release claims

## 2. Engine: ref-count helper (EEX-001, EEX-002)

- [x] 2.1 Create `DPT_FRAMEWORK/engine/helpers/ref-count.mjs` with `isCountable(ref)` → `{ countable: boolean, reason?: string }` — 4 conditions (acceptance_status, Core Content Capture ≥ 100 chars, article-level URL, Key Facts ≥ 5 bullets) + unparseable fallback
- [x] 2.2 Add `countReferences(baseDir, options?)` — default `source: "ledger"` reads role=reference paths from Engine-written `rb_output_declarations.jsonl`; `targetGlob` / `topic` preserve gate target scope; return `{ count, uncountable: [{path, reason}] }` for audit transparency
- [x] 2.3 Add diagnostic-only filesystem mode if needed for file observability; it MUST NOT be used by gate pass/fork branch decisions
- [x] 2.4 Unit tests: `tests/engine/helpers/ref-count.test.mjs` — test all 4 conditions independently, unparseable files, no ledger / empty declared refs
- [x] 2.5 Unit/integration test: a countable orphan reference SHALL NOT affect default `countReferences()` output, `count_floor` pass, `mergeResults()` `ref_count`, or `content_dedup`; file observability / ledger coverage still reports it
- [x] 2.6 Unit/integration test: scoped count preserves target semantics (`reference/00-shared-*.md`, `reference/*{topic}*.md`) and global references cannot satisfy another topic's floor

## 3. Engine: cache trail validation (CRC-005, AGO-006)

- [x] 3.1 Extend `validateDelegatedCompletion()` in `queue-manager.mjs` — after output_files validation, validate each candidate `cache_trails` entry: path in bundle, under `_cache/`, leaf source dir, directory exists, contains `websearch.json`/`page.md`/`meta.json`
- [x] 3.2 Extend `appendOutputDeclarationLedger()` — write only verified path strings to `cache_trails`（保持 `z.array(z.string())` 格式，不存 status 对象）。未通过验证的路径不写入，emit warning 到 trace/log
- [x] 3.3 Write warning to trace/log when `cache_trails` is empty on a reference-producing task
- [x] 3.4 Unit tests: extend `tests/engine/queue-manager.test.mjs` — delegated completion with valid cache trail, missing/incomplete leaf（warning + 不写入 ledger），empty trail（warning），mixed trails
- [x] 3.5 Unit tests: path escape, absolute path, non-`_cache/` path, and parent cache directory SHALL hard-fail delegated `complete()` and SHALL NOT append ledger
- [x] 3.6 Update AGQ-018-related tests / expectations that previously required missing leaf hard-fail; assert Phase 1 filter+warning instead while preserving hard-fail for unsafe/non-leaf trails

## 4. Engine: ref_count switch (EEX-003)

- [x] 4.1 Modify `mergeResults()` in `subagent-relay.mjs` — use committed SlotResult declarations / Engine ledger + `isCountable()` instead of Agent `evidenceCount` accumulation; carry `baseDir` as needed
- [x] 4.2 Update fork router to consume Engine-computed `ref_count`
- [x] 4.3 **同步更新 `tests/engine/subagent-relay.test.mjs`** — 将所有 `evidenceCount` 断言改为 `countReferences()` 调用（~12 处，不可排在 §8 之后——避免测试套件在实现期间 break）
- [x] 4.4 **Migrate glob-based gate `count_floor` rules to `countReferences()`** — 仅迁移 glob 模式规则：`shared_ref_count_floor`（wave0，target 含 `*`）和 `per_topic_ref_md_count_floor`（wave1，target 含 `*`）。`per_topic_count_floor`（wave0，target 为 `artifacts/wave0/{topic}/source.yaml`，YAML 数组计数）保持原实现不变。Pass/fail count must use `source: "ledger"` and pass `targetGlob` / `topic`; glob may remain only as target scope / fast diagnostic, not as authority
- [x] 4.5 Tests: Agent `evidenceCount: 99` with only 3 countable declared refs yields `ref_count: 3`
- [x] 4.6 Tests: topic-a gate fails when only topic-b has countable declared references

## 5. Gate: cache_coverage rule (CRC-006)

- [x] 5.1 Add `cache_coverage` rule to `gate-wave0-complete.definition.json` — Phase 1: 非空 `cache_trails` 的路径缺失 → fail；空 `cache_trails` → warn 不 fail
- [x] 5.2 Add `cache_coverage` rule to `gate-wave1-complete.definition.json` — 同上
- [x] 5.3 Implement `check: cache_coverage` in gate CLIs (`check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`) — read declarations from `rb_output_declarations.jsonl`，对每条 role=reference 的 declaration 交叉验证 `cache_trails` 中的路径在文件系统中存在且含 3 文件，并且每个 reference maps to at least one cache leaf by `meta.json.url` / `source_slug` / filename qualifier
- [x] 5.4 Gate integration tests: extend wave0 and wave1 gate tests — 非空 trail 缺失路径 → fail，legacy 空 trail → warn，全部 verified + mapped → pass，non-empty trails but no per-reference mapping → fail / blocking gap
- [x] 5.5 Gate/observability tests: new rerun `action:add` success path requires non-empty verified `cache_trails`; empty trail is only legacy Phase 1 warning, not a valid new-rerun success
- [x] 5.6 Cache retention tests / playbook assertions: ledger-referenced cache leaves deleted before `cache_coverage` cause fail/gap; deletion after recorded verdict does not rewrite historical gate result

## 6. Phase MD: rerun cache fix (RWP-014)

- [x] 6.1 Update `phase-wave0.md` Rerun-Aware Behavior — `action: add` row: add note that cache writing is identical to first run（含 `_cache/` 完整写入）
- [x] 6.2 Update `phase-wave1.md` Rerun-Aware Behavior — same
- [x] 6.3 Update `phase-wave2.md` Rerun-Aware Behavior — one-line note: emergent search SHOULD write to `_cache/wave2/{backing,depth,emergent}/` for future auditability（enforcement 留待后续 wave2 cache coverage change；本 change 仅加 prose 提醒）
- [x] 6.4 Update `phase-rerun.md` — mention that added topics must follow full cache convention in downstream phases

## 7. File observability: cache gap detection (RTI-006)

- [x] 7.1 Extend `auditFileObservability()` in `file-observability.mjs` — add cache gap detection using existing classifications only: for each reference file in `reference/`, check if corresponding ledger/cache trail exists, report missing with `kind` or `check: "cache_gap"` while preserving `unplanned_needs_explanation` / `orphan_authority_blocking`
- [x] 7.2 Update `check-reentry.mjs` to include cache gap findings in its output
- [x] 7.3 Tests: assert cache gap findings do not introduce a seventh `FILE_CLASSIFICATIONS` value

## 8. Controlled experiment playbooks

- [x] 8.1 Add `experiments_playbook/exp_evidence-extraction/README.md` suite contract — new case-number segment uses the empty 16段 and starts at `case-161`, explains why this mechanism is not just engine-boundary/file-observability continuation
- [x] 8.2 Add `experiments_playbook/exp_evidence-extraction/case-161-light-complete-cache-trails.md` — fixture-backed Engine path: candidate `cache_trails` → delegated `complete()` → verified ledger trails; incomplete leaf warning + no ledger trail; unsafe/non-leaf trail hard-fail. Reality Distance Ledger MUST state no Agent actor and no external calls.
- [x] 8.3 Add `experiments_playbook/exp_evidence-extraction/case-162-standard-gate-reentry-cache-coverage.md` — disposable bundle path: `count_floor`, `cache_coverage`, file observability `kind/check: cache_gap`, and `check-reentry` cover verified+mapped pass, non-empty missing trail fail, non-empty unmapped trail fail/gap, scoped count_floor, orphan cannot help pass, and legacy empty trail warning. Reality Distance Ledger MUST state fixture-backed runtime files after bundle creation.
- [x] 8.4 Add `experiments_playbook/exp_evidence-extraction/case-163-heavy-rerun-add-real-cache-trail.md` — real Agent/Sub-agent canary for new rerun `action:add`: phase/task prose must drive `_cache` three-file leaves, reference files, slot result `cache_trails`, delegated complete ledger append, mapped cache_coverage, and gate/reentry feedback. It MUST report minimum quality metrics: cache trail coverage, grounding spot-check, URL precision, countable rate, and cache/orphan/empty-trail gap rate. If no real Agent actor surface exists, record NOT RUN and preserve bundle; MUST NOT mark PASS from fixtures; NOT RUN does not satisfy archive/release quality proof.
- [x] 8.5 Ensure each fixture-backed case includes production distance disclaimer and does not claim Agent search/judgment/writing behavior
- [x] 8.6 Update `experiments_playbook/RUN_EXPS.md` only after the runnable case files exist and have been executed successfully at least once; do not list planned-but-unimplemented cases as runnable inventory
- [x] 8.7 Before archive, either case-163 PASS with quality metrics or explicitly downgrade the change claim to Engine auditability only; do not claim Agent extraction quality from regression/fixture evidence

## 9. Governance and validation

- [x] 9.1 Run `node openspec/governance/check-project-reqs.mjs`
- [x] 9.2 Run `node openspec/governance/check-project-specs.mjs`
- [x] 9.3 Run all regression tests: `node --test tests/`
- [x] 9.4 Execute controlled experiment playbooks

## 10. BUG-009: checkCacheCoverage legacy ledger fallback

- [x] 10.1 Add `declId` fallback in `checkCacheCoverage()` — prefer `decl.work_id`, fall back to `record for <first-ref-path>` when work_id is undefined
- [x] 10.2 Verify: old format ledger (no work_id) produces readable messages, new format still uses work_id

## 11. BUG-011: Phase MD cache_trails declaration (CRC-005 Phase 2)

- [x] 11.1 Update `phase-wave0.md` task card `action` template — already included from task §6.1
- [x] 11.2 Update `phase-wave1.md` primary deepening task card `action` template — added `cache_trails[]` requirement
- [x] 11.3 Update `phase-wave1.md` supplementary task card `action` template — same
- [x] 11.4 `shared-subagent-protocol.md` already documents `cache_trails[]` in Agent Output Declaration table

## 12. BUG-008 partial: Anti-template-generation guardrails

- [x] 12.1 Add rule 16 to `shared-anti-cheating-rules.md`: "MUST NOT use scripts or templates to batch-generate reference files"
- [x] 12.2 Improve `checkContentDedup()` Jaccard clone advice to flag template generation and recommend sub-agent relay
- [ ] 12.3 Strengthen `phase-wave1.md` reference-file provenance language (defer — existing MUST NOT language already covers this)

## 13. BUG-010: validate-bundle ledger validation hardening

- [x] 13.1 Already handled by existing code — `validate-bundle.mjs` increments `failed` counter for each schema-invalid ledger line, exits 1. Production bundle's 49 invalid records were correctly detected; the gap is workflow (validate-bundle was not run or exit code was ignored), not code.
- [x] 13.2 Verified: `validate-bundle.mjs` correctly rejects the production bundle with 49 line errors

## 14. Artifact updates for discovered bugs

- [x] 14.1 Update `design.md` — added "Post-Implementation Discoveries" section documenting production bundle analysis
- [x] 14.2 Delta specs assessment — BUG-009/010/011 are implementation details not requiring spec changes; CRC-005 Phase 2 already covers BUG-011
- [ ] 14.3 Mark BUG-009/010/011 bugs as resolved in `_backlog/bugs/README.md` (after archive)
