## 1. Registry & spec prep

- [x] 1.1 登记 `FRE-004` 到 `openspec/governance/req-registry.yaml`
- [x] 1.2 子模块文件头：`// @impl FRE-004` + 保留域内既有 `@impl`
- [x] 1.3 **影响面基线快照**（apply 前）— 32 public exports；consumers 仍指向 barrel
- [x] 1.4 **行数基线**（sanity only）：schemas-trace ~204, fork-dispatch ~201, stage ~496, slot-runtime ~475, collect-pipeline ~262

## 2. Scaffold

- [x] 2.1 创建 **5 个**子模块占位文件
- [x] 2.2 各文件头注释：职责域 + `@impl FRE-004`
- [x] 2.3 渐进迁移完成；barrel 纯 re-export

## 3. Extract schemas-trace @impl FRE-004

- [x] 3.1–3.6 trace/logger + Zod + path helpers；monolith re-export；tests pass

## 4. Extract fork-dispatch @impl FRE-004

- [x] 4.1–4.3 fork/repair 域 + repair 诊断块；`getDispatchMap()` 策略

## 5. Extract stage @impl FRE-004, SUD-001, SNC-001

- [x] 5.1–5.4 `stageSubagentSlots` 使用 `customDispatchMap || getDispatchMap()`

## 6. Extract slot-runtime @impl FRE-004, SUS-001, SUC-001

- [x] 6.1–6.4 slot status / receipt / commit；`buildSpawnPrompt` sibling export

## 7. Extract collect-pipeline @impl FRE-004, SUR-001

- [x] 7.1–7.5 collect/merge/pipeline；DAG 无 cycle

## 8. Barrel & cleanup @impl FRE-004

- [x] 8.1 纯 barrel（85 行）+ Sub-modules 列表
- [x] 8.2 **32** 个 public export 验收
- [x] 8.3 行数 sanity OK（均 <1000）
- [x] 8.4 `_trace`/`_log` 仅 `subagent-relay-schemas-trace.mjs`
- [x] 8.5 外部无 `subagent-relay-*.mjs` engine import（tests helpers 除外）

## 9. Mirror regression tests @impl FRE-004

- [x] 9.1 拆分 `tests/engine/subagent-relay.test.mjs` → 5 个 `subagent-relay-*.test.mjs` + `subagent-relay-helpers.mjs`
- [x] 9.2 映射：schemas-trace / fork-dispatch / stage / slot-runtime / collect-pipeline
- [x] 9.3 删除 monolith test；`node --test tests/engine/subagent-relay-*.test.mjs` — **61/61 pass**

## 10. Regression & governance

- [x] 10.1 `subagent-relay-*` + `queue-manager` + `relay-provenance-gate` — **179/179 pass**
- [x] 10.2 `subagent-logging-contract` integration — pass
- [x] 10.3 `drive-relay-slot.mjs` — `--check` pass
- [x] 10.4 `validate-subagent-logging-contract.mjs` — exit 0
- [x] 10.5 `check-project-specs.mjs` — PASS
- [x] 10.6 实验 smoke：`case-66` 路径 `drive-relay-slot stage` + beacon/dispatch 落盘 — PASS
- [ ] 10.7 archive 时 sync main spec + `> req: FRE-004` 进 `openspec/specs/framework-engine/spec.md`

## 11. Documentation touch (非阻塞)

- [ ] 11.1 （可选）更新 guidelines/backlog 行号与行数描述
