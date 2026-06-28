# command-experiments.md 调整思路 — Agent 产出声明原则

> 状态: 待 review | 日期: 2026-06-28 | 来源: openspec explore 对话
>
> 与 `ref-integrity-experiment-family.md` 并列。该文件设计了 6 个实验，本文补充实验和生产的 converge 机制。

---

## 背景

ref-integrity-experiment-family.md 设计了 case-12~17，覆盖 Engine 层和 Agent 层的 ref integrity 验证。但本次 explore 发现了一个更深的问题：**实验和生产的 converge 点在当前设计里不明确**，导致"同名文件/一会儿好一会儿不行"的问题反复出现却补不准。

核心洞察：**受控实验和真实生产应该在"Agent 产出声明"处汇聚，而非仅在"Engine 入口"处汇聚。**

当前 Engine 靠扫描目录（glob/readdir）发现文件，实验手写 fixture 路径是确定性的，生产 Agent 路径是非确定性的——两者验证的不是同一件事。

---

## 要在 command-experiments.md 加入的核心原则

### 原则：Agent 产出声明是结构化合同，Engine 消费声明，不扫描目录

**问题现状：**

- Engine 靠 `fs.readdir` / glob 扫描目录发现文件（gate `content_dedup` 扫描 `reference/*.md`）
- `complete()` 只检查单个 `completion_receipt`，不知道 Sub-agent 写了哪些其他文件
- Sub-agent 的文件命名决策（`source-slug`）没有被记录，Engine 无法验证命名一致性
- 实验手写 fixture 时路径确定，生产时路径由 Agent 非确定决定——两者验证的不是同一件事

**原则内容：**

> Engine 代码不得通过扫描目录来发现 Agent 的产出。Agent 的文件产出（文件路径、cache 目录、source 元信息）必须以结构化、schema-validated 的声明形式记录。Engine 消费声明做检查，不消费文件系统形状。
>
> 生产和实验在这个声明处汇聚：生产由 Sub-agent 产出声明（经 `commitSlotResult()` schema 验证），实验由 playbook 提供同样 schema 的 fixture 声明。声明之后的下游管道（`complete()` receipt 检查、gate `content_dedup`、trace verdict）走完全相同的代码路径。

**具体机制：**

Sub-agent 产出文件后，在返回的 result JSON 中包含 `output_files`：

```json
{
  "output_files": [
    {
      "path": "artifacts/wave1/01_xinhua/evidence-summary.md",
      "role": "evidence_summary"
    },
    {
      "path": "reference/01_xinhua-xinhua-box-office.md",
      "role": "reference",
      "source_url": "https://...",
      "source_slug": "xinhua-box-office"
    }
  ],
  "cache_trails": [
    "_cache/wave1/primary/01_xinhua/s01_xinhua-box-office/"
  ]
}
```

下游消费：
- `complete()`：遍历 `output_files[].path` 逐项检查文件存在；遍历 `cache_trails[]` 检查每目录 3 文件（websearch.json + page.md + meta.json）
- gate `content_dedup`：读 `output_files[]` 中 `role=reference` 的条目，按 `source_url` 去重、按 `path` 做 Jaccard 内容比较——**不再扫描 `reference/` 目录**
- experiment：写同样 schema 的 `result.json` → 后续所有 CLI/Engine 调用与生产完全一致

**汇聚图：**

```
生产                                实验
────                                ────
Sub-agent 产出文件 + 声明           Playbook 产出文件 + 声明（同样 schema）
        │                                  │
        └────────────┬─────────────────────┘
                     │
                     ▼    ← 从此处完全相同的代码路径
            commitSlotResult() schema 验证
            complete() 逐项 receipt 检查
            gate content_dedup（不扫描目录）
            trace verdict
```

---

## 与现有 guideline 的关系

这条原则补足了 `command-experiments.md` 里两个已有 section 之间的空白：

- **§Agent-Dependent Experiments**：说了"require each Agent actor to write its own runtime evidence"，但没有指定 evidence 的具体形式
- **§Framework Code Rules**：说了"Engine provides the deterministic loop; MD/Agent provides the intelligent strategy"，但没有说 Engine 和 Agent 之间的数据合同形式

新原则让这两个 section 衔接起来：Agent 的证据 = 结构化声明（schema-validated），Engine 的检查 = 消费声明（不扫描目录）。

---

## 在 command-experiments.md 的具体改动位置

### 改动 1：§Framework Code Rules（line 393-408），在现有规则列表末尾加一条

```
- **Engine 消费结构化 Agent 产出声明，不扫描目录。**
  Agent 的文件产出（写入路径、cache 目录、source 元信息）必须附带
  schema-validated 的声明。Engine 从声明中获取文件列表做 receipt 检查、
  content dedup 和跨文件一致性验证，不从 glob/readdir 推断。
  生产由 Sub-agent 在 result JSON 中提供声明，实验由 playbook 提供
  同样 schema 的 fixture 声明。声明之后的下游管道完全相同。
```

### 改动 2：§Anti-Patterns（line 430-448），在现有列表加一条

```
- Gate 或 Engine 代码通过 fs.readdir / glob 扫描目录来"发现" Agent 产出文件，
  而不是从结构化 Agent 产出声明中读取。声明之后的检查和验证均应以声明为合同。
```

---

## 相关代码改动（标注，不属于 guideline 改动范围）

这是给后续 OpenSpec change 的输入：

| # | 文件 | 改动 |
|---|------|------|
| 1 | `DPT_FRAMEWORK/engine/subagent-relay.mjs` | `SlotResult` schema 加 `output_files` + `cache_trails` |
| 2 | `DPT_FRAMEWORK/engine/queue-manager.mjs` | `QueueResultSchema` 加 `cache_trails`；`complete()` 对 delegated task 逐项检查 |
| 3 | `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` | 实现 `content_dedup` 五函数，消费 `output_files[]` 而非扫描目录 |
| 4 | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | Sub-agent prompt 加 `output_files` 要求 |
| 5 | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | 同上；Phase Agent 步骤加读取 `result.json` 填 `complete()` 的 `writes[]` |

---

## 与 ref-integrity-experiment-family.md 的关系

ref-integrity-experiment-family.md 设计了 case-16（`complete()` cache rejection）和 case-17（gate `content_dedup`），但实验 fixture 和真实 Sub-agent 产出在声明层面还没有 converge。本原则让这些实验的实现方式具体化：

- **case-16**：实验写 `result.json` fixture（含 `output_files[]` + `cache_trails[]`）→ `complete()` 按声明逐项检查，走与生产完全相同的检查代码
- **case-17**：实验写 `result.json` fixture（含 `role=reference` 的 `output_files[]`）→ gate 按声明做 dedup，不扫描目录，走与生产完全相同的 dedup 代码
