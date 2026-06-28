# experiments_playbook

受控的端到端实验流程。由 Agent 按 playbook 逐步执行，每一步都是真实操作——真实 bundle、真实 gate、真实 trace——**不是 mock**。

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
  RUN.md                   # 跑 playbook 的行动指令（Agent 读这个）
  exp_*/                   # 各实验组的 playbook
    case-<NN>-<cost>-<what>.md   # 单个 playbook
  exph_*/                  # 需人类交互的 playbook（Agent 不能自动跑）
```

## 编号约定：9NN 对偶（人类判断 case）

部分 case 的被测机制**含人类判断**——例如"Agent 的 rewrite 质量好不好"无法由 gate 的结构校验判定，必须人来看（"Gate pass ≠ Human pass"）。这类 case 用 **9NN** 编号段，并按"谁来扮演人类"分成对偶两半：

| 编号段 | 谁在环里 | 目录 | runner 行为 |
|--------|---------|------|------------|
| **901–949** | 真人 | `exph_*/` | **跳过**（自动跑会卡住，必须人工手动跑） |
| **950–999** | AI 扮演真人 | `exph_*/`（与 90X 对偶**同目录**） | **自动可跑**（按编号段，不因 `exph_` 跳过） |

**对偶规则（+50 配对）：** 同一个 case 的真人版与 AI 版用 **+50** 偏移配对——机制相同，只换"谁来扮演人类"。

- `case-901`（真人审查 Agent rewrite 质量）↔ `case-951`（AI 扮演审查者，对同一份 rewrite 给 verdict）
- `case-902` ↔ `case-952`，依此类推

**为什么要对偶：**

1. **不阻塞自动化管线。** 901–949 需要真人，runner 跳过；950–999 是 AI 顶替真人，能自动跑，让 pipeline 不被人类判断 case 卡住。
2. **验证 AI 能不能顶替人。** 同一份 Agent 产出，真人 verdict（如 901）vs AI verdict（如 951）一对比，就能判断"AI 扮演这个人类角色是否合格"。
3. **诚实标注。** 950–999 的 verdict 在 trace 里必须显式标 `source: ai-judge`（或等价标记）——**它不是真人判断**。gate 结构 pass 不代表 AI verdict 等于真人 verdict。

> 注：常规 case 仍是两位 `MN`（见 `guidelines/command-experiments.md`）。9NN 是"机制含人类判断"的例外段；+50 对偶是这一段的内部规则。

## 成本分级

| 级别 | 含义 | 什么时候跑 |
|------|------|-----------|
| Light | 纯 JS/CLI/gate/filesystem，无外部调用 | 改完代码就该跑 |
| Standard | 真实 bundle 多步骤，无外部调用 | 功能验证 |
| Heavy | WebSearch/WebFetch/subagent 真实外部调用 | 完整验证 |

## 跟其他目录的关系

```
experiments_playbook/ ← E2E 流程：Agent 忠实执行 playbook，产出 trace 裁决
experiments_env/      ← 支撑工具：new-disposable-bundle、wff-utils 等
DPT_FRAMEWORK/        ← 被测试对象：engine、gate、schema、cli
tests/                ← 回归测试：更细粒度的 unit + integration
```
