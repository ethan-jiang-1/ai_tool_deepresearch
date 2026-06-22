---
doc_id: openspec-change-map
title: "Workflow Foundation → OpenSpec Change 映射"
status: draft
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
---
# Workflow Foundation → OpenSpec Change 映射

## 1. 这份文档是什么

`_backlog/workflow/breakdown/` 下有 7 份需求拆解（00–07）加 1 份 meta review checklist（90）。本文件把拆解文档映射为具体的 OpenSpec change 编号、边界、产出物和依赖——让后续每个 `wff_*` change 的 `/opsx:propose` 有明确的上下文、范围和验收依据。

90-review-checklist.md 不是 change，是 reviewer 检查拆解文档一致性用的 meta checklist。

## 2. 引用源与为什么引用

| 文件 | 角色 |
|------|------|
| `_backlog/workflow/workflow-foundation-requirements.md` | 上游需求基准：lifecycle、authority model、node/gate/CLI contract、分阶段策略 |
| `_backlog/workflow/breakdown/00-directory-contract.md` | 目录归属 contract |
| `_backlog/workflow/breakdown/01-phase-a-workflow-contract-skeleton.md` | Phase A 拆解 |
| `_backlog/workflow/breakdown/02-phase-b-minimum-real-bundle-run.md` | Phase B 拆解 |
| `_backlog/workflow/breakdown/03-phase-c1-shared-and-instantiation.md` | Phase C1 拆解 |
| `_backlog/workflow/breakdown/04-phase-c2-hitl-and-setup.md` | Phase C2 拆解 |
| `_backlog/workflow/breakdown/05-phase-c3-wave0-wave1-wave2.md` | Phase C3 拆解 |
| `_backlog/workflow/breakdown/06-phase-c4-hitl2-readiness-final.md` | Phase C4 拆解 |
| `_backlog/workflow/breakdown/07-phase-d-wave1-subagent-boundary.md` | Phase D 拆解 |
| `guidelines/project-charter.md` | 最高层权威边界 |
| `guidelines/framework-runtime-boundary.md` | 目录和权威边界 |
| `guidelines/command-experiments.md` | 质量底线：不能 mock/fake |
| `DPT_FRAMEWORK/` | 当前 framework code、CLI、template、schema 的实际位置 |
| `openspec/config.yaml` | OpenSpec 规则和 conventions |

## 3. 拆解文档间依赖

```
00 (directory contract)
 └→ 01 (Phase A: skeleton)
     └→ 02 (Phase B: bundle run)
         └→ 03 (Phase C1: shared + instantiation)
             └→ 04 (Phase C2: HITL1 + setup)
                 └→ 05 (Phase C3: Wave0/1/2) ────┐
                     └→ 06 (Phase C4: HITL2 + readiness + final)
                 ┌──────────┘
             └→ 07 (Phase D: future boundary — 跳过 03/04，直连 05)
```

- 00–06 严格线性
- 07 只依赖 00, 01, 02, 05（它只管 Wave1 boundary，不涉及 HITL/setup）
- 90-review-checklist 依赖全部

## 4. 合并决策

| 拆解文档 | 合并方式 | 理由 |
|---------|---------|------|
| 00 | 独立 | 全域治理，与任何实现 change 不在同一层次 |
| 01 | 独立 | 一次性创建全部 ~31 个骨架文件，是所有 content change 的共同前提 |
| 02 | 独立 | 01 的 QA 闭环——review 关注"骨架能不能跑通"，与 01 的"骨架结构对不对"不同 |
| 03 + 04 | 合并为 `wff_pre-research`（原名 `wff_content-setup`） | 都在 research 开始前；04 强依赖 03（shared nodes 没建好，HITL1/setup 无 shared context）；合在一起是 pre-research 的完整交付 |
| 05 + 07 | 合并为 `wff_content-waves` | 07 只做 Wave1 boundary 标记（~1 文件），独立成 change 太薄；"实现 Wave1 placeholder + 标注 deferred capability"是一件事 |
| 06 | 独立 | Research 和 delivery 是不同 lifecycle segment，review 关注点不同；与 05 合计 ~16 文件偏大 |
| 90 | 不进入 OpenSpec | Meta checklist，reviewer 工具 |

## 5. 最终 Change 列表和顺序

```
wff_directory-contract     ✅ done — 目录治理
      ↓
wff_contract-skeleton      ✅ done — 31 个骨架文件
      ↓
wff_skeleton-validation    ← 当前 — logger + engine 兼容 + lifecycle walker
      ↓
wff_content-setup ──→ wff_content-waves ──→ wff_content-delivery
```

Change 3 的 scope 在原 plan 基础上扩展了三层基础设施（logger、workflow-chain 兼容、lifecycle walker），确保在 `wff_content-*` 填真实逻辑之前，lifecycle shell 已经被端到端验证可跑通。
> 注：实际落地后 `wff_content-setup` 改名为 `wff_pre-research`，`wff_content-waves` 对应 `wff-research-waves` change，`wff_content-delivery` 即下一个 change。实际状态以附录 A 为准。

---

### Change 1: `wff_directory-contract`

**来源**：`breakdown/00-directory-contract.md`

**目的**：建立 workflow foundation 相关所有 artifact 的目录归属规则。阻止后续把需求、runtime state、实验结果、production CLI 混放。

**范围（owns）**：
- `_backlog/workflow/` 放需求和拆解
- `DPT_FRAMEWORK/workflows/` 放 Agent-facing node 和 manifest
- `DPT_FRAMEWORK/schema/gate_definitions/` 放 read-only gate definition JSON
- `DPT_FRAMEWORK/engine/gates/` 放 gate loader/evaluator
- `DPT_FRAMEWORK/cli/gates/` 放 gate CLI wrappers
- `tests/` 做 regression；`experiments_playbook/` 做 Agent-driven controlled E2E
- `dpt_rb_*` 是 runtime truth，不能写回 `DPT_FRAMEWORK/`
- 命名规则（`phase-<phase>.md`、`shared-<scope>.md`、`check-gate-<name>.mjs`、`gate-<name>.definition.json`）
- v1 单 canonical workflow package，一套 `DPT_FRAMEWORK/` 服务多个 `dpt_rb_*`

**范围外（does not own）**：
- OpenSpec change 目录和任务结构
- Gate definition JSON 的完整 schema
- Node frontmatter 的最终 validator
- 具体实现文件

**验收**：Reviewer 能回答任意 artifact 应放哪个目录，且能区分 framework assets vs runtime truth、regression test vs controlled E2E、gate definition vs gate result。

**关键引用**：
- `workflow-foundation-requirements.md` §§ 2, 5, 7, 8, 12
- `guidelines/project-charter.md`
- `guidelines/framework-runtime-boundary.md`
- `DPT_FRAMEWORK/rb_templates/`

---

### Change 2: `wff_contract-skeleton`

**来源**：`breakdown/01-phase-a-workflow-contract-skeleton.md`

**目的**：创建完整的 lifecycle shell——所有 phase/shared node 骨架（metadata 齐全、body 最小）、manifest、8 个 Gate definition JSON 占位、8 个 gate CLI 骨架。使后续 content change 只在已有文件里填内容，不再争论文件位置和 metadata shape。

**产出物（~31 文件）**：

```
DPT_FRAMEWORK/workflows/
  manifest.json
  nodes/
    phases/
      phase-instantiation.md
      phase-hitl1.md
      phase-setup.md
      phase-wave0.md
      phase-wave1.md
      phase-wave2.md
      phase-hitl2.md
      phase-readiness.md
      phase-final.md
    shared/
      shared-profile.md
      shared-gate-rules.md
      shared-schemas.md
      shared-repair-guidance.md
      shared-anti-cheating-rules.md

DPT_FRAMEWORK/schema/gate_definitions/
  gate-instantiation-complete.definition.json
  gate-hitl1-recorded.definition.json
  gate-setup-ready.definition.json
  gate-wave0-complete.definition.json
  gate-wave1-complete.definition.json
  gate-wave2-complete.definition.json
  gate-hitl2-recorded.definition.json
  gate-readiness-passed.definition.json

DPT_FRAMEWORK/cli/gates/
  check-gate-instantiation-complete.mjs
  check-gate-hitl1-recorded.mjs
  check-gate-setup-ready.mjs
  check-gate-wave0-complete.mjs
  check-gate-wave1-complete.mjs
  check-gate-wave2-complete.mjs
  check-gate-hitl2-recorded.mjs
  check-gate-readiness-passed.mjs
```

**范围（owns）**：
- 9 个 phase node 的 metadata contract（`node_type: phase`、`id`、`phase`、`gate`、`next`、`stop`、`requires`、`suggested_context`）
- 5 个 shared node 的 metadata contract（`node_type: shared`、`id`、`shared_scope`、`authority`）
- `manifest.json` 的 lifecycle navigation
- 8 个 gate 与 9 个 phase 的对应关系
- one gate per external CLI 的外部形态
- `phase-final.md` 是 terminal node（`gate: none`、`next: none`）
- 骨架验收须演示一个简单 fail → inspect/advice → Agent repair → rerun → pass

**范围外（does not own）**：
- 每个 phase 的完整研究能力
- Gate definition JSON 的最终完整 rule set
- 具体 CLI 实现
- body 内容（留给 content changes）

**验收**（A01-1 到 A01-9）：
- Lifecycle 顺序无歧义
- 正好 8 个 non-terminal gates
- 每个 node 的 frontmatter 字段完整
- Shared node 不能声明 `phase`/`gate`/`next`/`stop`
- One gate per CLI，命名 `check-gate-<name>.mjs`

**关键引用**：
- `workflow-foundation-requirements.md` §§ 4, 5, 6, 7, 8, 12
- `DPT_FRAMEWORK/engine/workflow-chain.mjs`
- `DPT_FRAMEWORK/engine/gate-loop.mjs`
- `openspec/specs/dynamic-node-loading/spec.md`
- `openspec/specs/check-inspect-feedback/spec.md`

---

### Change 3: `wff_skeleton-validation`

**来源**：`breakdown/02-phase-b-minimum-real-bundle-run.md` + 新增 infrastructure 需求

**目的**：在 `wff_content-*` 上真实逻辑之前，建立运行时基础设施（logger）和 lifecycle 通路示范（walker），端到端证明 skeleton loop 可以跑通。Trace 记大事件（gate attempt/pass/fail/phase transition），Logger 记诊断细节（加载进度、CLI 输出、错误）。两者独立、互补。

**产出物（三层）**：

Layer 1 — 基础设施：
- `DPT_FRAMEWORK/engine/logger.mjs` — 极简结构化 logger
  - **默认形式**：`createLogger()` → console only，零配置，所有人都这样用
  - **高级形式**：`createLogger({ file: 'dpt_rb_x/_cache/run.log' })` → console + 文件双写
  - 四个 level：`debug`/`info`/`warn`/`error`，默认 `info`
  - 零依赖（`node:fs` + `node:path`），API 与 `trace.mjs` 对称
- Logger 注入到所有重要 engine 节点（`logger = null` silent no-op）：

  注入点                            | 时机               | 内容
  ----------------------------------|-------------------|------
  `assessNode()`                    | 入口/出口          | "loading entry node", "load complete/failed"
  `readMarkdownFile()`              | 首次读取           | "reading file: phases/phase-wave0.md"
  `resolveDependencyClosure()`      | 解析完成           | "resolved N dependencies for entry"
  `loadMarkdownFile()`              | cache hit / 加载    | "cache hit", "file loaded"
  `walk-lifecycle.mjs`              | phase 进出          | "entering phase: wave0", "gate passed"
  `walk-lifecycle.mjs`              | gate spawn          | "running gate CLI", "gate returned: pass/fail"
  `walk-lifecycle.mjs`              | retry / escalation  | "retry 2/3", "escalation: max retries exceeded"

Layer 2 — Engine 兼容：
- 修复 `DPT_FRAMEWORK/engine/workflow-chain.mjs`：
  - `nodePath()` 允许 `phases/` `shared/` 子目录（当前只接受 flat filename）
  - `parseFrontmatter()` 兼容 YAML 子集（当前只接受 JSON）
  - 所有公共函数注入 `logger` optional parameter（与 `trace` 同样的注入模式）：
    `assessNode(fileRef, state, runtime, trace, logger)`、`readMarkdownFile(fileRef, runtime, trace, logger)` 等

Layer 3 — Lifecycle 通路示范：
- `DPT_FRAMEWORK/cli/walk-lifecycle.mjs` — 读 manifest.json，逐 phase 加载 node，spawn gate CLI，写 trace + log，打印 summary
- 至少实现 **一个** gate 的最小真实 logic（如 `instantiation_complete` 检查 control files 存在），其余 7 个保持 placeholder pass
- Walker 通过故意缺文件 → gate fail → repair → rerun → pass 证明 bounded repair loop 闭环

**范围（owns）**：
- Logger 基础设施（与 trace 互补）
- `workflow-chain.mjs` 的 node 加载兼容
- Lifecycle walker 的通路逻辑（manifest → load → gate → advance → repeat）
- 通过真实 instantiation + walk 证明 skeleton 结构正确
- Gate CLI invocation chain 验证（spawn → JSON parse → exit code → trace entry）
- 至少一个 gate failure 走完整闭环：fail → inspect/advice → repair → rerun → pass
- Retry limit = 3（可配置），超限 escalation/block
- Trace 和 log 的双轨审计

**范围外（does not own）**：
- 完整资料搜集质量、多 subagent 并发、长时间真实联网 research
- 其余 7 个 gate 的完整 evaluation logic（保持 placeholder pass）
- Node body 完整内容
- 最终报告的正式产品形态

**验收**：
- `node walk-lifecycle.mjs --bundle dpt_rb_demo` 跑通 instantiation → final
- Logger 输出每一步进展
- `rb_trace.jsonl` 中每条 gate attempt 可审计
- traceSummary 8/8 gate pass
- 至少触发一次 gate fail → repair → rerun → pass
- `check-project-reqs.mjs` + `check-project-specs.mjs` PASS

**关键引用**：
- `workflow-foundation-requirements.md` §§ 4.5, 9, 10, 11, 12
- `DPT_FRAMEWORK/engine/trace.mjs`
- `DPT_FRAMEWORK/engine/workflow-chain.mjs`
- `DPT_FRAMEWORK/engine/gate-loop.mjs`
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`
- `DPT_FRAMEWORK/cli/validate-bundle.mjs`
- `DPT_FRAMEWORK/cli/inspect-bundle.mjs`

---

### Change 4: `wff_pre-research`（原名 `wff_content-setup`）

**来源**：`breakdown/03-phase-c1-shared-and-instantiation.md` + `breakdown/04-phase-c2-hitl-and-setup.md`

**目的**：填充 research 开始前所有 phase 和 shared node 的实际内容。V12 中关于 shared context、instantiation、HITL1、setup 的有效流程知识全量迁移到新 node/gate shape。

**产出物**：

```
DPT_FRAMEWORK/workflows/nodes/shared/
  shared-profile.md              ← 填内容: rb_profile.yaml 字段说明
  shared-gate-rules.md           ← 填内容: gate 用途解释（subordinate to JSON/CLI）
  shared-schemas.md              ← 填内容: schema 摘要
  shared-repair-guidance.md      ← 填内容: repair posture
  shared-anti-cheating-rules.md  ← 填内容: 禁止的行为

DPT_FRAMEWORK/workflows/nodes/phases/
  phase-instantiation.md         ← 填 body
  phase-hitl1.md                 ← 填 body
  phase-setup.md                 ← 填 body

DPT_FRAMEWORK/schema/gate_definitions/
  gate-instantiation-complete.definition.json ← 填完整 rule set
  gate-hitl1-recorded.definition.json         ← 填完整 rule set
  gate-setup-ready.definition.json            ← 填完整 rule set

DPT_FRAMEWORK/cli/gates/
  check-gate-instantiation-complete.mjs ← 填完整实现
  check-gate-hitl1-recorded.mjs         ← 填完整实现
  check-gate-setup-ready.mjs            ← 填完整实现
```

**范围（owns）**：

Shared nodes:
- `node_type: shared`、`shared_scope`、`authority: guidance-only | generated-summary`
- 不能成为 hidden phase 或第二套 rule source

Instantiation（Run Bundle 实例化）:
- 创建真实 `dpt_rb_*`，写入 canonical control files
- 创建 initial topic / seed-topic data、reference/artifact scaffold
- `dpt_rb_*` 名称 Agent/CLI 自动生成，英文 slug，CLI 负责 collision
- 不能问 HITL 问题、不能声称 evidence coverage、不能执行 wave research、不能做 synthesis judgment

HITL1:
- `stop: yes`，问用户 structured 问题
- 答案写入 `rb_profile.yaml`（`research_profile`、`root_must_answer_set`、HITL1 status）
- Gate 检查 `rb_profile.yaml` 存在且字段已填写

Setup:
- `stop: no`，验证 bundle consistency
- 检查：canonical control files 可达可解析、scaffold 存在、HITL1 已记录、plan/profile/status/queue 基本一致
- 不能替 Agent 做 research，不能把 setup pass 当 readiness pass

三个 gate 的检查方向：
- `instantiation_complete`：bundle path 存在且命名合法、control files 存在且可解析、scaffold 存在、trace 有 instantiation event、status 尚未跳过后续 phase
- `hitl1_recorded`：`rb_profile.yaml` 存在可解析、required HITL1 fields 已写入且非空、trace 有 HITL1 recorded evidence
- `setup_ready`：control files 可达、scaffold 存在、HITL1 已记录、plan/profile/status/queue 基本一致、无提前写入 wave complete 状态

**范围外（does not own）**：
- Wave evidence collection
- Wave1 topic deepening / subagent
- Wave2 synthesis
- HITL2 / readiness / final

**验收**（A03-1 到 A03-8 + A04-1 到 A04-7）：
- Instantiation 范围准确覆盖 "本次实例数据"，不吞掉 HITL/setup/wave
- Shared node boundary 足够硬
- HITL1 写入 bundle，gate 检查 bundle（不检查 chat memory）
- Setup 不膨胀成 readiness

**关键引用**：
- `workflow-foundation-requirements.md` §§ 2.2, 6.1, 7, 9, 11, 12
- `openspec/specs/cmd-bundle-instantiation/spec.md`
- `openspec/specs/schema-core/spec.md`
- `DPT_FRAMEWORK/rb_templates/`
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`

---

### Change 5: `wff_content-waves`

**来源**：`breakdown/05-phase-c3-wave0-wave1-wave2.md` + `breakdown/07-phase-d-wave1-subagent-boundary.md`

**目的**：填充三个 wave phase 的实际内容。Wave0 产出 minimum shared foundation evidence；Wave1 保持 topic-scoped placeholder skeleton（明确标记 capacity boundary，不假装 full subagent research 完成）；Wave2 从 verified artifacts 派生 minimum cross-topic synthesis。同时标记 Wave1 的 future expansion tracks。

**产出物**：

```
DPT_FRAMEWORK/workflows/nodes/phases/
  phase-wave0.md      ← 填 body
  phase-wave1.md      ← 填 body + future guidance/boundary 标记
  phase-wave2.md      ← 填 body

DPT_FRAMEWORK/schema/gate_definitions/
  gate-wave0-complete.definition.json ← 填完整 rule set
  gate-wave1-complete.definition.json ← 填完整 rule set
  gate-wave2-complete.definition.json ← 填完整 rule set

DPT_FRAMEWORK/cli/gates/
  check-gate-wave0-complete.mjs ← 填完整实现
  check-gate-wave1-complete.mjs ← 填完整实现
  check-gate-wave2-complete.mjs ← 填完整实现
```

**范围（owns）**：

Wave0:
- `stop: no`，产出少量真实 shared reference artifacts
- Reference metadata 必须可解析
- Gate 检查：artifact/index 存在、metadata 可解析、数量达 foundation floor、trace 有 completion evidence

Wave1:
- `stop: no`、`subagent: true`（foundation 阶段只是 future marker）
- 写入简单 topic-scoped skeleton artifact，标记 placeholder capability boundary
- 不得声称 full subagent coverage / deepening / candidate intake / fan-in review 已完成
- Gate 检查：skeleton artifact 存在可解析、明确标记 foundation placeholder、无 false completion claim

Wave2:
- `stop: no`，从 verified wave artifacts 派生 minimum cross-topic synthesis
- Synthesis artifact 必须引用已验证的 Wave0/Wave1 artifacts
- Gate 检查：synthesis artifact 存在、其引用已验证 artifacts、trace 有 completion evidence

Wave1 future boundary（来自 07）:
- Foundation 阶段 Wave1 明确标为 placeholder
- Future expansion tracks 至少包含：topic-specific deepening、subagent dispatch、candidate intake、repair/backfill、fan-in review、topic artifact quality gates
- 这些 tracks 不能成为 foundation gate pass 条件
- Future subagent 验收必须真实执行，不能 mock

**范围外（does not own）**：
- 完整 subagent dispatch/collection
- 复杂 queue scheduling
- 完整 source-quality ontology
- Production-grade synthesis quality
- Real-environment research E2E

**验收**（A05-1 到 A05-10 + A07-1 到 A07-6）：
- Wave0 的 minimum evidence 足够真实但不过重
- Wave1 placeholder 不会被误解成 full subagent research 已完成
- Wave2 synthesis 明确依赖 verified artifacts
- Future boundary 清晰，foundation gate 不包含 future capability 条件

**关键引用**：
- `workflow-foundation-requirements.md` §§ 2.2, 6, 8, 11, 12, 13
- `guidelines/command-experiments.md`
- `openspec/specs/subagent-dispatch/spec.md`
- `openspec/specs/subagent-collect/spec.md`
- `DPT_FRAMEWORK/engine/subagent-relay.mjs`

---

### Change 6: `wff_content-delivery`

**来源**：`breakdown/06-phase-c4-hitl2-readiness-final.md`

**目的**：填充 delivery 前后三个阶段。HITL2 记录 structured user decision；readiness 执行 final 前 deterministic precheck；final 从 verified bundle state 生成 report artifacts（terminal node）。

**产出物**：

```
DPT_FRAMEWORK/workflows/nodes/phases/
  phase-hitl2.md      ← 填 body
  phase-readiness.md  ← 填 body
  phase-final.md      ← 填 body

DPT_FRAMEWORK/schema/gate_definitions/
  gate-hitl2-recorded.definition.json  ← 填完整 rule set
  gate-readiness-passed.definition.json ← 填完整 rule set

DPT_FRAMEWORK/cli/gates/
  check-gate-hitl2-recorded.mjs  ← 填完整实现
  check-gate-readiness-passed.mjs ← 填完整实现
```

**范围（owns）**：

HITL2:
- `stop: yes`，产出 decision brief，记录 structured decision 到 `rb_profile.yaml`
- Gate 检查：decision brief 存在、decision 已记录、required fields 非空合法、trace 有 evidence

Readiness:
- `stop: no`，final 前最后一个 deterministic checkpoint
- 验证：required artifacts 可达可解析、所有 8 个 non-terminal gate 通过状态可审计、profile/status/queue/trace 无矛盾
- 不能判断语义质量，但必须阻止缺 artifact/trace/gate evidence 的 delivery

Final:
- `gate: none`、`next: none`、`stop: no`——current delivery pass 的 terminal node
- 从 verified bundle state 生成 final report artifact(s)
- 不允许 hidden next、hidden gate、隐式循环
- 用户 final 后反馈统一走 HITL2 repair/rerun：写入 `rb_profile.yaml` 的 HITL2/user feedback 字段，回到受影响 phase 或 repair path

**范围外（does not own）**：
- Wave artifact 生产
- Full report UI customization
- 单独 revision workflow
- Real-world long-running quality assessment

**验收**（A06-1 到 A06-10）：
- HITL2 decision 写入 bundle，不留在 chat memory
- Readiness 只做 deterministic precheck，不做语义质量判断
- Final terminal 语义清楚，无 hidden gate/next
- 用户 final 后反馈入口是 HITL2 repair/rerun，不是 final 暗中循环

**关键引用**：
- `workflow-foundation-requirements.md` §§ 2.2, 6, 9, 10, 11, 12
- `openspec/specs/schema-core/spec.md`
- `openspec/specs/repair-loop/spec.md`
- `DPT_FRAMEWORK/cli/validate-bundle.mjs`
- `DPT_FRAMEWORK/cli/inspect-bundle.mjs`
- `DPT_FRAMEWORK/engine/trace.mjs`

---

## 6. 全局约束（所有 change 共同遵守）

以下约束来自 `workflow-foundation-requirements.md` 和 `guidelines/`，每个 change 的实现必须遵守：

1. **Authority model**：Markdown controls Agent Flow；JS/CLI controls deterministic checkpoints；LLM Agent owns research judgment；Bundle state + trace hold runtime truth
2. **Dynamic loading**：Agent 只加载当前 node + required shared context，不把整个 lifecycle 塞进上下文
3. **Node 是 Agent 指令，不是 Engine 程序**：Engine 不执行 Markdown 里的 code block
4. **Gate 是 deterministic checkpoint**：Gate 只能检查存在性、可解析性、计数、状态值、trace event——不能做语义研究判断
5. **Minimum real verifiable action**：每个 phase 产出真实 files/state/trace，不能 fake
6. **Bounded retry**：默认 3 次 retry limit，可配置；no-progress 必须 escalation
7. **`dpt_rb_*` 目录名**：Agent/CLI 自动生成英文 slug，CLI 负责 collision detection
8. **V12 全量迁移**：V12 有效内容全量迁入新 node/gate shape，但能力按阶段启用（placeholder vs executable requirement）
9. **所有 gate CLI 必须显式接收 active bundle path**（`--bundle` 或等价 flag）
10. **`shared-gate-rules.md` 不长期人工维护**：应由 Gate definition JSON/tooling 生成或同步升级

## 7. 收尾要求（每个 change 归档前）

按 `openspec/config.yaml` rules.tasks 硬性要求：

1. 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
2. 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS

---

## 附录 A：实际落地 vs 原计划

> 计划不如变化快。原 plan 拟定了 6 个 change，但在落地过程中，lifecycle 需要的基础设施比预期多。下面记录实际顺序和与原 plan 的对应关系。

### 实际 Change 序列

```
wff_directory-contract          ✅ 已归档 — Change 1（按 plan）
        ↓
wff_contract-skeleton           ✅ 已归档 — Change 2（按 plan）
        ↓
wff_skeleton-validation         ✅ 已归档 — Change 3（原 plan + 扩展：logger、engine 兼容、lifecycle walker）
        ↓
wff_state-chain                 ✅ 已归档 — 【新增】 transition table + askNext + chain/FSM 双引擎
        ↓                        Gate 需要知道 "pass 之后去哪个 node"，这个 query 机制原 plan 没单独列
wff_transition-node-result-routing ✅ 已归档 — 【新增】 gate 统一输出 shape：check/routing/inspect/advice
        ↓                        原 plan 以为 gate CLI 输出 shape 在 Change 2 一次定好，实际推敲了 3 轮
wff_pre-research                ✅ 已归档 — Change 4（原 plan 的 wff_content-setup，改名）
        ↓                        合并了 breakdown/03（shared + instantiation）+ 04（HITL1 + setup）
        ↓                        新增：topic rewrite（HITL1 内）、7 个 light playbook、fault-tolerance 验证
wff-research-waves              ✅ 即将归档 — Change 5（含 seed-topic 物化阶段）
        ↓                        task 0.4 同步了 transitions.fsm.json——FSM 表最后一次更新
wff_content-delivery            ← 下一个 Change 6
  ├─ Phase 0：FSM 引擎清理（wff-research-waves 归档后开工）
  └─ Phase 1+：填 HITL2 / readiness / final（原 Change 6 内容）
```

### 差异对照

| 原 plan | 实际 | 说明 |
|---------|------|------|
| 6 个 change | 8 个 change（2 新增） | `wff_state-chain` 和 `wff_transition-node-result-routing` 是从 `wff_skeleton-validation` 里拆出来的独立工程 |
| Change 3 只做 logger + walker | 实际拆成 3 个 change：skeleton-validation → state-chain → transition-routing | 原 plan 低估了 gate routing 机制的复杂度 |
| Change 4 叫 `wff_content-setup` | 改名为 `wff_pre-research` | 原名太模糊，"content setup" 听起来像只填 skeleton；pre-research 清楚表达 instantiation → HITL1 → setup 的范围 |
| Change 4 只填内容 | 实际新增了 topic rewrite、7 个 playbook、fault-tolerance 验证 | HITL1 里用户可能只说一句话，Agent 必须展开成 structured original topic——这是 query rewrite，原 plan 未覆盖 |
| gate key 命名 | 全文统一 kebab-case | 原 skeleton 用了 underscore（`instantiation_complete`），实际落地发现 gate definition JSON 和 manifest 已经 kebab，统一到 kebab |
| 无 FSM 清理计划 | FSM 清理折进 Change 6 的 Phase 0 | lifecycle 从未实际查询 `.fsm.json`，FSM 是死代码。`wff-research-waves`（Change 5）已完成无法塞入，折进紧邻的下一个 change 避免 +1 change 且免命名 |

### 为什么 FSM 清理不能进 Change 5

`wff-research-waves`（Change 5）已全部完成——所有 task 勾选、3 个 review gate 全 PASS、governance 双 check PASS，处于归档门口。task 0.4 刚刚同步了 `transitions.fsm.json`。往一个已完成的 change 里塞删除 scope 会：否定刚做完的 0.4、改动已过 review 的 scope。因此 FSM 清理推迟到 Change 6 的 Phase 0——在 `wff-research-waves` 归档后、`wff_content-delivery` 填内容之前，作为 cleanup pass。这同时满足「降噪发生在后续内容工作开始前」和「不多开 change」两个目标。

### 为什么 wff_pre-research 改名

原名 `wff_content-setup` 的问题：
- "content setup" = 听起来像只是把 5 个 shared node + 3 个 phase node 填满文字
- 实际做的事远超 "填内容"：gate definition 从 placeholder 升级为完整 rule set（16+6+18 条）、gate CLI 从 hardcoded pass 升级为 8 种 check type、HITL1 加入 topic rewrite、7 个 playbook 证明 PDCA 闭环
- `wff_pre-research` 准确表达范围：wave0 之前的所有工作，从用户开口到 `setup-ready` gate pass

### 归档状态

- **wff_pre-research**（Change 4）：✅ 已归档。123 IDs registered, 0 orphan。
- **wff-research-waves**（Change 5）：✅ 即将归档。所有 task 完成（含 seed-topic 物化阶段扩展），3 个 review gate PASS，governance 双 check PASS（152 registered / 174 occurrences / 37 main spec files）。task 0.4 同步了 `transitions.fsm.json`——这是 FSM 表的最后一次更新。
- **下一个：wff_content-delivery**（Change 6）：Phase 0 = FSM 引擎清理（前置：`wff-research-waves` 归档），Phase 1+ = 填 HITL2 / readiness / final。

### Change 6 Phase 0：FSM 引擎清理

> **前提**：`wff-research-waves`（Change 5）已归档——active changes 中零 `.fsm.json` 引用后开工。

**意图**：lifecycle 从未实际查询 `.fsm.json`（gate CLI 默认值硬编码为 `transitions.chain.json`，无一处用 FSM）。FSM 引擎是死代码，保留它制造双引擎噪声，迷惑 AI coding agent。在 content-delivery 填内容前彻底移除，纯机械删除，无设计决策。

**删除文件**：

- `DPT_FRAMEWORK/engine/transition-fsm.mjs`、`engine/workflow-fsm.mjs`
- `DPT_FRAMEWORK/workflows/transitions.fsm.json`
- `openspec/specs/workflow-fsm-definition/`、`workflow-fsm-runtime/`、`workflow-fsm-transition/`（3 个 spec 目录）
- `tests/engine/transition-fsm.test.mjs`、`tests/engine/workflow-fsm.test.mjs`
- `experiments/prototype-workflow-fsm/`、`experiments_playbook/exp_workflow-fsm/`

**修改文件**：

- `engine/ask-next.mjs`：移除 `.fsm.json` 分支、`loadFSM` import、FSM 注释；suffix dispatch 收敛为单 chain 路径
- `engine/consistency-validator.mjs`：移除 FSM 校验块、`loadFSM` import、`transitionsFsmPath` opt
- `openspec/specs/transition-table/spec.md`：移除 FSM backend 描述，只保留 chain
- `tests/engine/ask-next.test.mjs`：移除 8 个 FSM case
- `guidelines/README.md`：engine 计数 6→5，去掉 workflow-fsm
- `openspec/config.yaml`：注释去掉 `.fsm.json`

**不变**：`transitions.chain.json` 结构、gate CLI、chain 引擎——lifecycle 路由行为零变化。不删 `engine/workflow-chain.mjs`（节点加载层，名字含 "chain" 但不是 transition engine，保留）。
