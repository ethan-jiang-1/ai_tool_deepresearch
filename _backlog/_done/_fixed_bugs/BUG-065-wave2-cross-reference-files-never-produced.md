# BUG-065 — Wave2 cross-topic reference 文件从未被产出，reference/ 中无 00-cross-*.md

| 属性 | 值 |
|------|-----|
| ID | BUG-065 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 与 BUG-064 同类：消费路径缺失 wave2 层面的 reference 文件 |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run |
| 相关 Bug | [[BUG-064]]（同类问题在 wave1）、[[BUG-060]]（sub-agent contract mismatch 背景） |

---

## 0. 一句话

**Phase-wave2.md §4 明确列出 `reference/00-cross-*.md` 为 expected artifact（"only for real, fetched sources"），但在本次 run 中 wave2 产出了 synthesis.md + cross-topic-ledger.md + finding-index.yaml 三个文件，reference/ 目录中没有任何 `00-cross-*.md` 文件。同 BUG-064 一个根。**

---

## 1. 现象

本次 run 的 wave2 产出：

```
artifacts/wave2/
  synthesis.md            ✅ 存在（8 个跨 topic 发现）
  cross-topic-ledger.md   ✅ 存在（15 条）
  finding-index.yaml      ✅ 存在（8 个 finding + 2 deferred）

reference/
  00-cross-*.md           ❌ 全部缺失
```

Phase-wave2.md 的 expected artifacts（§4）明确写了：
> `reference/00-cross-*.md` — cross-topic discovery reference files, only when real targeted evidence exists

但即使 wave2 发现了 X09（retreat model as meta-finding）、X10（Loop Engineering as next paradigm）、X13（TW internal contradiction）这些真正的跨 topic 涌现发现——都没有被物化为独立的 reference 文件。

---

## 2. 根因

Wave2 有两条路径，reference 文件的生成在这两条路径之间的 gap 里：

**Path A — Delegated evidence（sub-agent 搜索新证据）：**
- Task card template §3.1（line 108）的 `action` 字段写 "Write reference/00-cross-<slug>.md"
- 但如果 Phase Agent 选择 pure synthesis path，根本不 enqueue delegated task → 这个路径不会触发
- 而且即使触发了，sub-agent 也会遇到 BUG-064 同样的问题（不在 required_receipts 里，不写）

**Path B — Pure synthesis（Phase Agent 直接写）：**
- Phase-wave2.md 允许 Phase Agent 直接写 synthesis artifacts（§0 "Pure synthesis path"）
- 但 allowed actions 里没有显式说 "Phase Agent MUST write reference/00-cross-*.md"
- Phase Agent 自然地 focus 在三个核心产出上（synthesis.md + ledger.md + finding-index.yaml），reference 文件被遗漏

**结果**：无论走哪条路径，`00-cross-*.md` 都不会被产出。两条路径之间有一个 reference 文件生成的 responsibility gap。

---

## 3. 与 BUG-064 的关系

| 维度 | BUG-064 (wave1) | BUG-065 (wave2) |
|------|----------------|-----------------|
| 缺失文件 | `reference/0N-*.md` | `reference/00-cross-*.md` |
| 预期生产者 | Sub-agent | Sub-agent（delegated path）或 Phase Agent（pure synthesis path） |
| 实际生产者 | 没有（sub-agent 跳过） | 没有（两条路径都跳过） |
| 根因 | required_receipts 不包含 reference | responsibility gap：两条路径之间没有明确谁写 reference |
| BUG-060 关联 | Sub-agent 产出不完整 | Phase Agent 不知道该写 |

---

## 4. 修复方向

与 BUG-064 一致的策略：**Phase Agent 负责物化 reference 文件，不依赖 sub-agent。**

具体做法——在 phase-wave2.md 的 pure synthesis path（§3.1 或新的 §3.1.x）中增加一条明确的 allowed action：

> After writing synthesis artifacts, Phase Agent reads cross-topic-ledger.md for findings with `synthesis_eligibility: synthesized` and `gap_status: closed` or `emergent`. For each such finding that has concrete source backing, Phase Agent writes a `reference/00-cross-{slug}.md` file following `shared-reference-template.md` (9 metadata fields, 5 standard sections). The source data comes from already-submitted wave0/wave1 evidence and the synthesis artifacts themselves — no new search required.

**为什么这符合 BUG-064 的 Option C 策略：**
- 数据已经有了（wave0/wave1 evidence-summary + wave2 synthesis）
- Phase Agent 能精确遵循 canonical 格式
- 不给 sub-agent 增加责任
- 不改 engine contract
- 不增加 gate 失败点

**变动**：只在 phase-wave2.md 加一段 prose 指令。一页以内。
