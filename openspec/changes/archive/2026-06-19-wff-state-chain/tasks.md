## 1. 注册 Requirement ID

- [x] 1.1 在 `openspec/governance/req-registry.yaml` 注册
  - TRT-001: transition-table file naming convention（`transitions.<impl>.json`）
  - TRT-002: transition-table transitions.chain.json structure
  - TRT-003: transition-table transition-chain.mjs engine（对等 FSM）
  - TRT-004: transition-table ask-next.mjs unified dispatch

## 2. Data: transitions.chain.json

- [x] 2.1 创建 `DPT_FRAMEWORK/workflows/transitions.chain.json`（8 gate → passed → next_node 映射）
- [x] 2.2 复制到 `experiments/prototype-wff-validation/transitions.chain.json`

## 3. Engine: transition-chain.mjs

- [x] 3.1 创建 `DPT_FRAMEWORK/engine/transition-chain.mjs`
  - `ChainDefinition` — Zod schema
  - `loadChain(path)` — readFileSync + JSON.parse + schema validate
  - `resolveTransition(chain, gate, state)` — 纯函数，返回 `{ next, found }`
  - `createChain(path, trace?)` — factory，返回 stateful tracker（与 `Machine` 互换）

## 4. Engine: ask-next.mjs

- [x] 4.1 创建 `DPT_FRAMEWORK/engine/ask-next.mjs`
  - `askNext(path, gate, state)` — 按文件后缀分发到 chain loader 或 FSM loader
  - `.chain.json` → `loadChain()` + `resolveTransition()`
  - `.fsm.json` → `loadFSM()` + `resolveTransition()`
- [x] 4.2 创建 `tests/engine/transition-chain.test.mjs`（21 tests：schema, load, resolve, createChain）
- [x] 4.3 创建 `tests/engine/ask-next.test.mjs`（含真实 transitions.chain.json 集成测试）

## 5. Gate 名统一（hyphens）

- [x] 5.1 修改 8 个 `gate-*.definition.json` 的 `gate` 字段：``_`` → `-`
  - `instantiation_complete` → `instantiation-complete`
  - `hitl1_recorded` → `hitl1-recorded`
  - `setup_ready` → `setup-ready`
  - `wave0_complete` → `wave0-complete`
  - `wave1_complete` → `wave1-complete`
  - `wave2_complete` → `wave2-complete`
  - `hitl2_recorded` → `hitl2-recorded`
  - `readiness_passed` → `readiness-passed`
- [x] 5.2 同步 prototype 中的 definition JSON

## 6. Gate CLI 适配

- [x] 6.1 修改 `check-gate-instantiation-complete.mjs`
  - 去掉 `--next` option，新增 `--transitions` option（可选，默认 `transitions.chain.json`）
  - 调用 `askNext(transitionsPath, definition.gate, passed ? 'passed' : 'failed')`
  - `check.next` 改为 `askNext()` 返回值
- [x] 6.2 修改其余 7 个 placeholder gate CLI（同上 pattern）

## 7. Manifest 清理

- [x] 7.1 修改 `DPT_FRAMEWORK/workflows/manifest.json`——去掉每个 phase 的 `next` 字段
- [x] 7.2 更新 `experiments/prototype-wff-validation/manifest.json`（同步）
- [x] 7.3 去掉 8 个 phase node frontmatter 的 `next` 字段（`DPT_FRAMEWORK/workflows/nodes/phases/`）
- [x] 7.4 同步去掉 prototype 中 phase node frontmatter 的 `next` 字段

## 8. Walker 适配

- [x] 8.1 修改 `walk-lifecycle.mjs`
  - 从 gate CLI 响应的 `check.next` 读 next_node
  - 不再读 manifest `next` 字段

## 9. Playbook 适配

- [x] 9.1 修改 `test-simple-happy-path.md`——去掉所有 `--next` flag
- [x] 9.2 修改 `test-medium-fail-repair.md`——去掉所有 `--next` flag
- [x] 9.3 更新 playbook 中 gate CLI spawn 调用：去掉 `--next`，改为 `--transitions experiments/prototype-wff-validation/transitions.chain.json`

## 10. Guideline 更新

- [x] 10.1 更新 `guidelines/framework-runtime-boundary.md` "Gate 通过 Transition Table 查询下一步" 节
  - 文件名约定 `transitions.<impl>.json`
  - chain/FSM 双引擎 + `askNext` 统一接口

## 11. 验证

- [x] 11.1 跑 `test-simple-happy-path.md` 确认 PASS
- [x] 11.2 跑 `test-medium-fail-repair.md` 确认 PASS（含 2-failure repair）
- [x] 11.3 运行 `node --test tests/` 回归全绿
- [x] 11.4 运行 `check-project-reqs.mjs` + `check-project-specs.mjs` PASS
- [x] 11.5 ⏸ 停——用户核实测试结果

## 12. ⚠️ 跨 Change 清理

`wff-state-chain` 实现后，`wff-skeleton-validation`（未归档）中以下内容变为过期——**在归档 `wff-skeleton-validation` 前必须修正**：

- [x] 12.1 `wff-skeleton-validation/design.md` D7 `--next` flag → 更新为 `--transitions` + `askNext()`
- [x] 12.2 `wff-skeleton-validation/design.md` D6 manifest `next` → 注记 "已被 transition table 取代"
- [x] 12.3 `wff-skeleton-validation/specs/lifecycle-walker/spec.md` LFW-001 spawn gate CLI → 加上 `--transitions`
- [x] 12.4 `wff-skeleton-validation/specs/gate-skeleton/spec.md` GSK-001 `--next` 场景 → 替换为 `--transitions`
- [x] 12.5 `wff-skeleton-validation/tasks.md` 相关 task 描述同步（`--next` → `--transitions`）
- [x] 12.6 ⏸ 停——用户核实跨 Change 清理结果
