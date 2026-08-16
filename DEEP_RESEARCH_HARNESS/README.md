# DEEP_RESEARCH_HARNESS

Deep Research Harness (`DEEP_RESEARCH_HARNESS/`) 的运行时入口说明。

Harness 采用 recommendation-first 的两点交互节奏：HITL1 对齐，静默自主研究，HITL2 审阅，Final 交付；用户主动问答不会自动变成新的 checkpoint 或运行权力。

> 语言约定：精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文；同一控制面内不混用两套主语言。

## 共享项目上下文

开始 Deep Research Harness work 前，先读 [Project Charter](../openspec/constitution/project-charter.md)，再读
[root `CONTEXT.md`](../CONTEXT.md)。根 `CONTEXT.md` 是全项目唯一的术语对齐
glossary；它不替代 applicable accepted/executable contract，也不在
`DEEP_RESEARCH_HARNESS/` 创建第二份 `CONTEXT.md`。

这个 pre-read 不是 Deep Research Harness research entry，不选择 run，也不授权 request-specific
research；它不改变随后 `continue-run-bundle.md` / `RUN.md` 的 existing selection。
完成这个 pre-read 后，再按本文的触发规则、`COMMANDS.md` 和 selected playbook
进入具体操作。

> **最快触发**：把本目录下的 `RUN.md` 拖进对话——文件内容会直接进上下文，触发本 Harness，绕开"要不要进目录"的判断。

## 触发规则（最高优先）

**用户有研究意图 → 触发本 Harness。** 这是 Deep Research 触发信号，不是代码探索请求。Agent 主动的代码探索/上下文阅读（用户无研究意图、且未把本文件或 `RUN.md` 作为 entry 提供）不触发本 Harness、不选择 run。触发信号包括但不限于：

- 用户提到 `DEEP_RESEARCH_HARNESS`——**哪怕只是贴出本目录的路径**——并带一个问题；
- 用户说"研究/调研/deep research/research report/帮我查…/…是什么"等研究意图；
- 任何"我要就某个话题得到一份有来源、可核查的研究报告"的需求。

**本 Harness 就是项目的 Deep Research Harness。** 入口选择的完整规则只有一处 canonical 表述：`command_playbook/continue-run-bundle.md` 的 "Entry Selection (canonical)" 节；本文件只放指针。要点：已选择研究时，用户明确提供当前 workspace 内可达 existing bundle candidate（目录或其中的文件）并要求继续/检查，先验证同根 `BUNDLE_ENTRY.md` 与 `BUNDLE_MAP.md`；只有完整 pair 才走 `command_playbook/continue-run-bundle.md`，并将该目录解析为本次操作的 canonical absolute current run bundle root。显式 candidate 缺少任一文件即以 `unsupported_current_entry_contract` 停止。没有 explicit existing candidate 才读 `RUN.md`；扫描发现、只提文件名或不可达路径不选择 run；人仍可在 Harness operational contract 外直接阅读历史 Markdown。

在 selected entry 读完前，**不要**调用 `research`、`deep-research` 或等价 one-shot shortcut，不对该 request 直接 WebSearch/WebFetch，也不手工收集或综合 evidence。`RUN.md` 的 Section 2 随后进入 `command_playbook/start-research.md` 创建新 run 并加载第一个 phase node；HITL1 probe 和后续 phase research 仍由各自进入后的既有 contract 授权。本 guidance 不保证宿主不会预先匹配 skill 或注入工具。

## 第一条

**想做什么事？打开 `COMMANDS.md` 找到对应的命令。** 不要凭记忆工作。

运行具体 run bundle 时，先验证 current run bundle root 同时包含 `BUNDLE_ENTRY.md` 和 `BUNDLE_MAP.md`，然后读取 `BUNDLE_ENTRY.md`、`BUNDLE_MAP.md` 与控制文件。缺少任一 pair member 的目录不进入 Harness operation；legacy Markdown 不构成 fallback。

## 目录性质

`DEEP_RESEARCH_HARNESS/` 是 reusable Harness assets，不是某一次 run 的工作目录。

- `DEEP_RESEARCH_HARNESS/` 在 workflow 执行期间视为 read-only Harness surface。这是**运行时 scope** 的只读（run 内容不写回框架）；另有**生命周期 scope** 的只读（根 `AGENTS.md`/`CLAUDE.md`：`/opsx:apply` 前框架代码只读），两层不同，互相不替代。
- 同一套 `DEEP_RESEARCH_HARNESS/` 可以服务多个 `dpt_rb_*` production run bundle 或 `dpt_disp_*` disposable experiment bundle。
- 当前 research run 的 runtime truth 只来自 current run bundle root，不来自 chat memory，也不写回 Harness。
- “单主 workflow” 指 v1 只有一个 canonical Deep Research workflow package；不表示只能有一个 run bundle。

## 运行时边界

Current run bundle root 是本次 research run、CLI invocation、task card 或实验明确选中的 `dpt_rb_*` / `dpt_disp_*` 目录。它是 runtime truth 的根；“current”只描述本次操作，不表示全局选择、最新 bundle 或生命周期状态。裸 runtime path（如 `rb_queue.json`、`rb_trace.jsonl`、`rb_output_declarations.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`final/`、`_work_units/...`）都相对于 current run bundle root，不相对于 repo root，也不相对于 `DEEP_RESEARCH_HARNESS/`。

例如，如果 current run bundle root 是 `dpt_rb_climate-policy/`，那么 `_work_units/wave1/wu-w1-b000-deep-i0001/` 指的是 `dpt_rb_climate-policy/_work_units/wave1/wu-w1-b000-deep-i0001/`。

运行时有三种坐标，不要混用：

- `repo_command_root`：执行 `node DEEP_RESEARCH_HARNESS/...` 的仓库根，只是命令位置。
- `framework_root`：`DEEP_RESEARCH_HARNESS/`，只读 reusable Deep Research Harness assets。
- `current_run_bundle_root`：本次操作显式选中的 `dpt_rb_*` / `dpt_disp_*`，唯一 runtime truth 根。

运行 workflow 时，不要把这些内容写入 `DEEP_RESEARCH_HARNESS/`：

- HITL answer / profile decision
- gate result / gate attempt
- repair attempt / retry state
- trace / receipt / runtime log
- research artifact / evidence / final output

这些内容必须写入 current run bundle root 下的 `dpt_rb_*` 或 `dpt_disp_*`。

## 当前可执行 surface

这些 surface 当前已经存在，可直接使用：

- `COMMANDS.md`：命令索引。
- `cli/`：当前 Harness-level CLI，核心工具包括 `instantiate-run-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`、`operate-queue.mjs`、`operate-work-unit.mjs`、`enter-phase.mjs`、`advance-status.mjs`、`check-reentry.mjs`、`audit-phase-status.mjs`、`log-event.mjs`；完整清单以 `cli/` 目录为准。
- `cli/gates/`：当前每个 gate 一个外部 CLI wrapper（`check-gate-*.mjs`，当前 10 个）。
- `schema/contracts/`：当前 executable schema contracts，包括 `plan.mjs`、`profile.mjs`、`queue.mjs`、`status.mjs`、`trace.mjs`。
- `engine/`：当前 deterministic engine code 和 trace utility。
- `rb_templates/`：实例化 run bundle 时 materialize 的初始模板。
- `command_playbook/`：Agent-facing command instructions and diagnostic/maintenance playbooks; not a human/operator co-runner surface for autonomous pipeline execution.

## Workflow Foundation / runtime surface

这些 surface 是当前 workflow-foundation 运行时结构；具体行为仍以已存在的 CLI/schema/engine contract 为准：

- `workflows/manifest.json` 和 `workflows/nodes/`：v1 只有一个 canonical Deep Research workflow，不使用 `workflows/<workflow-name>/` namespace。
- `schema/gate_definitions/`：read-only gate definition JSON，不保存 pass/fail。
- `workflows/transitions.chain.json`：当前 Gate transition source of record；`engine/ask-next.mjs` 的 `resolveNodeTransitionDetailed()` 提供详细查询。
- `engine/gates/`：per-gate engine modules 的目标位置；当前共享 helper 位于 `engine/helpers/gate-helpers.mjs`。

## Run Bundle 外形

Production run bundle 位于 repo root，当前命名形态：

```text
dpt_rb_<name>/
```

- 当前 production 实例化入口接收显式 `<name>`，创建 `dpt_rb_<name>/`；Agent-facing playbooks derive this name from the research request unless a name was already supplied before Harness execution.
- 如果目标目录已存在，CLI 报错退出且绝不覆盖；Agent 按 pre-research-phase-content 契约派生带 `-<hex6>` 后缀的 collision-safe 名称重试，经 trace/log 记录，不询问用户。
- Disposable experiment bundle 使用 `dpt_disp_*`，也是 mutable runtime bundle root when selected.

当前 canonical run bundle 目录外形：

```text
dpt_rb_<name>/
  BUNDLE_ENTRY.md      ← 极简入口：我是谁、Harness 在哪
  BUNDLE_MAP.md        ← 完整目录布局（户型图）
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl

  _logs/
    run.log

  seed_topics/
  reference/
  artifacts/
    wave0/
    wave1/
    wave2/
  final/
  _cache/
  _work_units/
```

`_cache/gate-results/` 和 `_cache/projections/` 是 workflow-foundation target/cache convention，不是当前 `inspect-bundle.mjs` required shape。

运行时只在 current run bundle root 同时包含 `BUNDLE_ENTRY.md` 与 `BUNDLE_MAP.md` 时进入 Harness operation。`BUNDLE_ENTRY.md` 是极简入口，`BUNDLE_MAP.md` 是 passive map，都不是 phase node、command playbook 或 Gate authority；`RUN_BUNDLE.md` 与 `START_FROM_HERE.md` 即使并存也只是 non-authoritative historical debris。`rb_profile.yaml` 承载 HITL/user decisions；`rb_status.json` 承载 phase/gate 状态摘要；`rb_trace.jsonl` 是 append-only audit。

## 执行模式

- 操作前 reload current run bundle root 的控制文件。
- Queue 为空且无法 refill 时才能停止。
- 停止授权: 唯一真相是 `engine/queue-manager-core.mjs` 的 `StopAuthorizationState` 枚举（4 值）。`syncQueueHealth` 实际写入 `empty_queue_after_refill`（drain 后停止）与 `unauthorized_continue_required`（继续）；`final_delivery` / `decision_blocker` 是保留值，当前无代码写入。指引不得另列"合法值"清单。
- 面向 research run 的命令必须显式接收 current run bundle root；现有 bundle 工具使用明确的 `<bundleDir>`。
- 新 bundle 的初始 `current_gate: setup_ready` / `state: not_started` 是 WNC-010 声明的 instantiation/HITL1 bootstrap status 例外（解释见 `workflows/nodes/phases/phase-instantiation.md`），不是漂移；从 setup 起各 phase 才走常规 enter-phase/advance-status handoff。
- 不要依赖 chat memory 判断当前 run 状态；必须以 current run bundle root、可用的 check/gate CLI output 和 trace 为准。

## 质量保障

- `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundleDir>` — bundle 控制文件 Zod 校验。
- `node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundleDir>` — bundle 目录结构检查。
