## Context

`subagent-execution-logging` change 归档后，对 `openspec/specs/` 做了两轮审计：
1. **协作自洽性审计** — subagent/logging 六件套内部一致，但 phase/gate/queue spec 与框架现状脱节
2. **现实对齐审计** — 以 `DPT_FRAMEWORK/schema/gate_definitions/*.definition.json`、`phase-wave*.md`、`shared-subagent-protocol.md`、`drive-relay-slot.mjs` 为基准，发现 15 处失配

**同步原则**：框架现状 = 客观事实；spec 向代码对齐。唯一例外：`trace_event_present` — spec/phase MD 已要求，gate JSON 未实现 → **补代码**（用户裁决）。

**Delta 修稿完成（2026-07-04）**：18 capability delta 已对齐 req registry、MODIFIED 标题、wave2 三层（WTS-003 / AGQ-015 / RWP-003）。Governance PASS。Apply §1 须同时补 gate JSON rule 和 gate CLI dispatcher（见 D4）。

## Goals / Non-Goals

**Goals**
- 消除 delta 语气噪声，使 accepted spec 可读、无时态
- wave0/wave1/wave2 路径、cache 布局、gate 规则清单与 gate JSON + phase MD 一致
- wave1/wave2 phase spec 描述 driver-first relay 协作模型
- 三个 wave gate JSON 落地 `trace_event_present` 规则

**Non-Goals**
- 不重新设计 subagent logging / provenance 架构
- 不改 RPG-007..013 diagnostic-only 语义
- 不修改 phase MD 控制面（已是现状基准）
- 不跑 experiments_playbook（仅 spec 引用修正）

## Decisions

### D1. 基准文件优先级

```
gate definition JSON  >  phase-wave*.md  >  shared-subagent-protocol.md  >  CLI --help
         ↓
    openspec/specs/ (被修正)
```

### D2. Wave0 产物路径 canonical 形态

| 产物 | 路径 |
|------|------|
| per-topic thin YAML | `artifacts/wave0/{topic}/source.yaml` |
| shared rich MD | `reference/00-shared-*.md` |
| inventory | `reference/_INDEX.md` |
| human nav | `reference/README.md` |

### D3. Cache 布局 canonical 形态

`_cache/{wave}/{batch}/{scope}/sNN_{source-slug}/` — 按工作组织，不按 relay slot 编号。

### D4. trace_event_present — 补 gate JSON + gate CLI dispatch（apply §1）

在三个 gate definition JSON 各加 `trace_event_present` rule（status rules 之前）。`readTraceEvents` reader helper 已存在（`gate-helpers-core.mjs:846`），但三个 wave gate CLI（wave0/wave1/wave2）的 rule dispatcher 中 **无** `trace_event_present` case 分支——当前 unknown check type 会 fail-closed（`"Unknown check type: ... — must fail"`）。Apply 时须同时补 rule + dispatcher + 回归测试。

### D5. Purpose denoise 在 archive merge 时手动合并

Delta 聚焦 Requirements；Purpose 段 denoise 见 tasks §3，apply merge 时一并更新 main spec。

### D6. wave2 执行模型

- synthesis task = **单轮**（`phase-wave2.md` §3.2）
- 质量/收敛缺口 → §3.3.2 Quality Re-Fill Loop
- 参数来源 → `rb_profile.yaml#/research_style_params`

### D7. Grep allowlist

以下 normative 命中为**历史/对比 prose**，不修改：`reference-flat-format`、`wave0-artifacts-directory` Purpose、`bundle-start-from-here` 负向禁令。

## Risks / Trade-offs

- **[Risk] trace_event_present 导致无 trace 的 bundle gate fail** → 预期；phase MD 已指示写事件
- **[Risk] archive merge 冲突** → 18 个独立 delta；apply 逐文件核对
- **[Risk] agentic-queue 历史重复 producer-rule 段** → apply 时若 main spec 有同名重复 heading，合并全部活跃副本（见 archive 2026-06-24 align-specs 先例）

## Migration Plan

0. **Prep §0**（已完成）：delta spec 修稿——req ID/header 对齐、MODIFIED 标题对齐 main spec、wave2 三层同步、governance PASS
1. **Apply §1**：补 gate JSON trace rules + gate CLI dispatcher + 测试
2. **Apply §2**：delta merge 进 `openspec/specs/` + Purpose denoise（§3）
3. **Apply §3**：Purpose 段 denoise——archive merge 时逐文件核对 5 个 capability 的 Purpose 段
4. **Apply §4**：grep 验证（allowlist 除外）
5. **Apply §5**：全量测试 + governance + archive

## Open Questions

（无）
