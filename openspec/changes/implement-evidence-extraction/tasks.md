## 1. OpenSpec artifact revision

- [x] 1.1 Verify requirement ID registration for `EEX-001..004`, `CRC-005..006`, `AGO-006`, `RWP-014`, `RTI-006` in `openspec/governance/req-registry.yaml`（已预注册——确认无冲突）
- [x] 1.2 Revise delta specs to use explicit `MODIFIED Requirements` where existing `agent-output-declaration` behavior changes, including delegated `complete()` cache trail failure semantics
- [x] 1.3 Clarify `cache_trails` authority wording: Sub-agent slot result may declare candidate trails; only Engine writes verified ledger `cache_trails`; Agent MUST NOT directly append `rb_output_declarations.jsonl`
- [x] 1.4 Clarify `countReferences()` authority boundary: it supports quality/count decisions but does not grant ledger authority to orphan reference files
- [x] 1.5 Clarify transition behavior: legacy empty `cache_trails` warn in Phase 1, but new rerun `action:add` success requires non-empty verified trails

## 2. Engine: ref-count helper (EEX-001, EEX-002)

- [ ] 2.1 Create `DPT_FRAMEWORK/engine/helpers/ref-count.mjs` with `isCountable(ref)` → `{ countable: boolean, reason?: string }` — 4 conditions (acceptance_status, Core Content Capture ≥ 100 chars, article-level URL, Key Facts ≥ 5 bullets) + unparseable fallback
- [ ] 2.2 Add `countReferences(baseDir)` — scan `reference/` dir（排除 `_INDEX.md`/`README.md`），filter `isCountable`，return `{ count, uncountable: [{path, reason}] }` for audit transparency
- [ ] 2.3 Unit tests: `tests/engine/helpers/ref-count.test.mjs` — test all 4 conditions independently, unparseable files, empty dir
- [ ] 2.4 Unit/integration test: a countable orphan reference MAY affect `countReferences()` output but SHALL NOT become authoritative input for `content_dedup` or bypass ledger/file observability

## 3. Engine: cache trail validation (CRC-005, AGO-006)

- [ ] 3.1 Extend `validateDelegatedCompletion()` in `queue-manager.mjs` — after output_files validation, validate each candidate `cache_trails` entry: path in bundle, under `_cache/`, leaf source dir, directory exists, contains `websearch.json`/`page.md`/`meta.json`
- [ ] 3.2 Extend `appendOutputDeclarationLedger()` — write only verified path strings to `cache_trails`（保持 `z.array(z.string())` 格式，不存 status 对象）。未通过验证的路径不写入，emit warning 到 trace/log
- [ ] 3.3 Write warning to trace/log when `cache_trails` is empty on a reference-producing task
- [ ] 3.4 Unit tests: extend `tests/engine/queue-manager.test.mjs` — delegated completion with valid cache trail, missing/incomplete leaf（warning + 不写入 ledger），empty trail（warning），mixed trails
- [ ] 3.5 Unit tests: path escape, absolute path, non-`_cache/` path, and parent cache directory SHALL hard-fail delegated `complete()` and SHALL NOT append ledger

## 4. Engine: ref_count switch (EEX-003)

- [ ] 4.1 Modify `mergeResults()` in `subagent-relay.mjs` — use `countReferences()` instead of Agent `evidenceCount` accumulation
- [ ] 4.2 Update fork router to consume Engine-computed `ref_count`
- [ ] 4.3 **同步更新 `tests/engine/subagent-relay.test.mjs`** — 将所有 `evidenceCount` 断言改为 `countReferences()` 调用（~12 处，不可排在 §8 之后——避免测试套件在实现期间 break）
- [ ] 4.4 **Migrate glob-based gate `count_floor` rules to `countReferences()`** — 仅迁移 glob 模式规则：`shared_ref_count_floor`（wave0，target 含 `*`）和 `per_topic_ref_md_count_floor`（wave1，target 含 `*`）。`per_topic_count_floor`（wave0，target 为 `artifacts/wave0/{topic}/source.yaml`，YAML 数组计数）保持原实现不变——`countReferences()` 只扫描 `reference/*.md`，不适用于 YAML。glob 保留做快速预检（fail fast），实际计数用 `countReferences()`

## 5. Gate: cache_coverage rule (CRC-006)

- [ ] 5.1 Add `cache_coverage` rule to `gate-wave0-complete.definition.json` — Phase 1: 非空 `cache_trails` 的路径缺失 → fail；空 `cache_trails` → warn 不 fail
- [ ] 5.2 Add `cache_coverage` rule to `gate-wave1-complete.definition.json` — 同上
- [ ] 5.3 Implement `check: cache_coverage` in gate CLIs (`check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`) — read declarations from `rb_output_declarations.jsonl`，对每条 role=reference 的 declaration 交叉验证 `cache_trails` 中的路径在文件系统中存在且含 3 文件
- [ ] 5.4 Gate integration tests: extend wave0 and wave1 gate tests — 非空 trail 缺失路径 → fail，legacy 空 trail → warn，全部 verified → pass
- [ ] 5.5 Gate/observability tests: new rerun `action:add` success path requires non-empty verified `cache_trails`; empty trail is only legacy Phase 1 warning, not a valid new-rerun success

## 6. Phase MD: rerun cache fix (RWP-014)

- [ ] 6.1 Update `phase-wave0.md` Rerun-Aware Behavior — `action: add` row: add note that cache writing is identical to first run（含 `_cache/` 完整写入）
- [ ] 6.2 Update `phase-wave1.md` Rerun-Aware Behavior — same
- [ ] 6.3 Update `phase-wave2.md` Rerun-Aware Behavior — one-line note: emergent search SHOULD write to `_cache/wave2/{backing,depth,emergent}/` for future auditability（enforcement 留待后续 wave2 cache coverage change；本 change 仅加 prose 提醒）
- [ ] 6.4 Update `phase-rerun.md` — mention that added topics must follow full cache convention in downstream phases

## 7. File observability: cache gap detection (RTI-006)

- [ ] 7.1 Extend `auditFileObservability()` in `file-observability.mjs` — add cache gap detection using existing classifications only: for each reference file in `reference/`, check if corresponding ledger/cache trail exists, report missing with `kind` or `check: "cache_gap"` while preserving `unplanned_needs_explanation` / `orphan_authority_blocking`
- [ ] 7.2 Update `check-reentry.mjs` to include cache gap findings in its output
- [ ] 7.3 Tests: assert cache gap findings do not introduce a seventh `FILE_CLASSIFICATIONS` value

## 8. Controlled experiment playbooks

- [ ] 8.1 Add `experiments_playbook/exp_evidence-extraction/` playbook — cases: (a) isCountable excludes homepage + thin-content refs, (b) cache_coverage gate 两阶段行为， (c) complete() 后的 cache_trails 填充, (d) legacy empty trail warning vs new rerun non-empty verified trail success
- [ ] 8.2 Ensure production distance disclaimer on all fixture-backed playbooks

## 9. Governance and validation

- [ ] 9.1 Run `node openspec/governance/check-project-reqs.mjs`
- [ ] 9.2 Run `node openspec/governance/check-project-specs.mjs`
- [ ] 9.3 Run all regression tests: `node --test tests/`
- [ ] 9.4 Execute controlled experiment playbooks
