## 0. Delta spec 修稿（apply 前阻塞项）

> **状态：已完成（2026-07-04）** — 18 个 delta 已修稿；`check-project-reqs.mjs` PASS；MODIFIED 标题与 main spec 对齐。

- [x] 0.1 Req ID / header 修正（WTS/CRC/AGQ/WAI 等）
- [x] 0.2 MODIFIED 标题对齐 main spec（RWP/wave2/cache/subagent-slots 等）
- [x] 0.3 Wave2 三层同步（WTS-003 + AGQ-015 + RWP-003）
- [x] 0.4 去噪补全（RPG-010/013 等）
- [x] 0.5 Scope 扩展：5 个额外 capability delta（shared-node-content、content-delivery-*、research-wave-experiments、experiment-ref-integrity）
- [x] 0.6 Governance PASS + 标题逐字核对

---

## 1. Gate JSON：trace_event_present 补齐（design D4）

> apply 阶段修改 `DPT_FRAMEWORK/`；补齐后无 trace event 的 disposable bundle 可能 gate fail（预期）。

- [x] 1.1 `gate-wave0-complete.definition.json` 新增 `trace_event_present`（target: `wave0_completion`）
- [x] 1.2 `gate-wave1-complete.definition.json` 新增 `trace_event_present`（target: `wave1_completion`）
- [x] 1.3 `gate-wave2-complete.definition.json` 新增 `trace_event_present`（target: `wave2_completion`）
- [x] 1.4 在三个 wave gate CLI 中实现 `trace_event_present` check type dispatch（`readTraceEvents` reader 已存在于 `gate-helpers-core.mjs:846`，但 `check-gate-wave{0,1,2}-complete.mjs` 的 rule dispatcher 无 case 分支——当前 unknown check type fail-closed）。每个 CLI 增加 `else if (rule.check === 'trace_event_present')` 分支，调用 `readTraceEvents(bundlePath, rule.target)` 检查目标 event 是否存在
- [x] 1.5 回归：`tests/integration/cli/transition-integrity.test.mjs` + 新增 `trace_event_present` check type 单元测试（缺 event → rule fail / 有 event → rule pass；覆盖三个 wave gate CLI 的 dispatch 路径）

## 2. Delta spec 落地 → main spec sync

> 按 `specs/` 下 18 个 delta MODIFIED 逐 capability merge；Purpose denoise 一并更新（§3）。

- [x] 2.1 `relay-provenance-gate` — RPG-007..013
- [x] 2.2 `subagent-runtime-logging` — SRL-004 + Purpose
- [x] 2.3 `subagent-directory-contract` — Purpose + SDC-001
- [x] 2.4 `subagent-relay-driver` — Purpose + SRD-001
- [x] 2.5 `subagent-node-contract` — Purpose + SNC-001
- [x] 2.6 `subagent-slots` — SUS-001 `_beacon.json`
- [x] 2.7 `subagent-collect` — SUC-002
- [x] 2.8 `agentic-queue` — AGQ-007/008/013/015 + shared-subagent-protocol
- [x] 2.9 `research-wave-gate-implementation` — RWG-001/002/003
- [x] 2.10 `research-wave-phase-content` — RWP-001/002/003/006
- [x] 2.11 `wave1-intake` — WAI-001/002 + sub-agent write boundary
- [x] 2.12 `wave2-synthesis` — WTS-002/003/006
- [x] 2.13 `cache-raw-web-content` — CRC-002
- [x] 2.14 `shared-node-content` — SHC-003
- [x] 2.15 `content-delivery-gate-implementation` — CDG-002
- [x] 2.16 `content-delivery-phase-content` — CDP-002
- [x] 2.17 `research-wave-experiments` — RWE-001
- [x] 2.18 `experiment-ref-integrity` — EXR-003

## 3. Purpose 段 denoise（archive merge 时核对）

- [x] 3.1 `subagent-directory-contract` Purpose
- [x] 3.2 `subagent-relay-driver` Purpose
- [x] 3.3 `subagent-node-contract` Purpose
- [x] 3.4 `subagent-runtime-logging` Purpose
- [x] 3.5 `relay-provenance-gate` Purpose + RPG-010 body 残留

## 4. Stale 路径 grep 清零（design D7 allowlist 除外）

- [x] 4.1 normative `reference/<topic>/source.yaml` / `reference/{topic` → 0（allowlist: reference-flat-format、wave0-artifacts-directory Purpose、bundle-start-from-here）
- [x] 4.2 normative `_cache/search-results/`、`_cache/waveN/slot_MM/` → 0
- [x] 4.3 normative `reference/index.md`（小写）→ 0；canonical `reference/_INDEX.md`

## 5. 收尾验证与 archive

- [ ] 5.1 全量 `node --test tests/` 通过
- [ ] 5.2 `check-project-reqs.mjs` + `check-project-specs.mjs` PASS
- [ ] 5.3 `validate-subagent-logging-contract.mjs` 全绿（若 touch 控制面）
- [ ] 5.4 archive → delta sync 进 main specs
