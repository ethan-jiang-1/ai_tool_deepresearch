# experiments_playbook

`agent_flow_e2e` 实验流程。由 coding Agent 按 Markdown playbook 逐步执行，每一步都是真实操作——真实 bundle、真实 gate、真实 trace——**不是 mock**。完整路由语义见 accepted `verification-routing` spec。

## 规则

### 一切来自 Trace

Playbook 的 PASS/FAIL 裁决必须来自 `rb_trace.jsonl` 里的 event，不是 console.log，不是肉眼判断，不是"看起来对了"。每个 check event 的 `passed` 字段是唯一裁决依据。

### 忠实执行，不改写

Agent 跑 playbook 时只许忠实执行每个 bash block 和 inline JS，不许读懂后自己写等价代码。自己改写的一定会引入偏差，产生假 FAIL。

### 不 Mock，不复用 Bundle

每个 playbook 创建独立的 `dpt_disp_*` disposable bundle，跑完即删（FAIL 时保留现场）。不复用上一个 case 的 bundle，不跨 case 共享状态。

## 目录约定

```
experiments_playbook/
  PLAYBOOK_MANIFEST.md          # 所有 case 的权威清单（Light/Standard/Heavy 三档表格）
  RUN_TUI_EXPS.md               # TUI 交互模式执行规则（Agent 读这个）
  RUN_CLI_EXPS.md               # CLI 自动化模式执行规范（host_tools/run-experiment.mjs 读这个）
  exp_*/                        # 各实验组的 playbook
    case-<NN>-<cost>-<what>.md  # 单个 playbook
```

## 两种执行模式

| 模式 | Instruction | 入口 | 谁裁决 | bundle 位置 |
|------|------------|------|--------|-------------|
| TUI（交互） | `RUN_TUI_EXPS.md` | coding Agent 直接读取 | Agent | repo root |
| CLI（自动化） | `RUN_CLI_EXPS.md` | `DPT_FRAMEWORK/host_tools/run-experiment.mjs` | Runner（JS） | `.exp-bundles/` |

Case 清单统一在 `PLAYBOOK_MANIFEST.md`，两份 instruction 均引用此文件。

## 编号约定：9NN 对偶（人类判断 case）

部分 case 的被测机制**含人类判断**——例如"Agent 的 rewrite 质量好不好"无法由 gate 的结构校验判定，必须人来看（"Gate pass ≠ Human pass"）。这类 case 用 **9NN** 编号段，并按"谁来扮演人类"分成对偶两半：

| 编号段 | 谁在环里 | 目录 | runner 行为 |
|--------|---------|------|------------|
| **901–949** | 真人 | （已移除） | 项目方向全面自动化，Human case 不再维护 |
| **950–999** | AI 扮演真人 | `exp_workflow-foundation/` | **自动可跑** |

**对偶规则（+50 配对）：** 同一个 case 的真人版与 AI 版用 **+50** 偏移配对——机制相同，只换"谁来扮演人类"。真人版（901–949）已因项目方向全面自动化而移除，AI-judge 版（950–999）保留自动执行。

- （已移除）真人审查 Agent rewrite 质量 ↔ `case-951`（AI 扮演审查者，对同一份 rewrite 给 verdict）

**为什么要对偶：**

1. **不阻塞自动化管线。** 901–949 需要真人，runner 跳过；950–999 是 AI 顶替真人，能自动跑，让 pipeline 不被人类判断 case 卡住。
2. **验证 AI 能不能顶替人。** 同一份 Agent 产出，真人 verdict（如 901）vs AI verdict（如 951）一对比，就能判断"AI 扮演这个人类角色是否合格"。
3. **诚实标注。** 950–999 的 verdict 在 trace 里必须显式标 `source: ai-judge`（或等价标记）——**它不是真人判断**。gate 结构 pass 不代表 AI verdict 等于真人 verdict。

> 编号约定的权威定义在 `guidelines/command-experiments.md` § Naming。常规 case 使用两位 (`MN`) 或三位 (`MMN`) 阿拉伯数字，其中前导数字标识 case group，末位是 group 内顺序。9NN 是"机制含人类判断"的例外段；+50 对偶是这一段的内部规则。

## 成本分级

| 级别 | 含义 | 什么时候跑 |
|------|------|-----------|
| Light | 纯 JS/CLI/gate/filesystem，无外部调用 | 改完代码就该跑 |
| Standard | 真实 bundle 多步骤，无外部调用 | 功能验证 |
| Heavy | real Agent/sub-agent、WebSearch/WebFetch、长链或其他昂贵/慢执行 | 完整验证 |

`PLAYBOOK_MANIFEST.md` 是当前可运行 proof surfaces 的权威清单。`RUN_TUI_EXPS.md` 和 `RUN_CLI_EXPS.md` 分别定义 TUI/CLI 两种执行协议。旧 relay/slot、旧 queue slot shape、旧手写 delegated ledger 不能作为当前 production path 证明；有价值的 case 应迁移到 current work-unit / queue v2 路径，否则移出当前 playbook surface。

## 跟其他目录的关系

```
experiments_playbook/ ← agent_flow_e2e：coding Agent 忠实执行 Markdown playbook，产出 trace 裁决
experiments_env/      ← 支撑工具：new-disposable-bundle、wff-utils 等
DPT_FRAMEWORK/        ← 被测试对象：engine、gate、schema、cli
tests/                ← JS-led unit + integration + deterministic_e2e
```
