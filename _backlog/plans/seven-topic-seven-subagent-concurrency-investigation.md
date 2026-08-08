# 7 Topic 一次并发 7 个 Sub-Agent 的可行性调查

> 调查: 2026-08-09 | 来源: `dpt_rb_mature-open-source-deep-research-harness` run（7 topic 分两批 5+2 跑）
> 结论: **Engine 完全支持一次 claim 7 个，cap 5 只是文档层保守默认，可绕过（但无结构化配置位）。**

## 问题

7 个 topic 的 Wave0/Wave1 delegated sub-agent 工作时，为什么实际分两批（5+2），
不能一次并发 7 个？这是不是 bug？能不能做成一次 7 个？

## 结论（先说）

**不是 bug，且完全可以一次 7 个。**

- **Engine 层无并发上限**：`operate-work-unit claim` 只校验 `--count` 是正整数
  （`work-unit-lifecycle.mjs:531`），`previewClaimCandidates`
  （`work-unit-lifecycle.mjs:401`）按 requestedCount 顺序取 active_window 的
  item，仅当 role 不一致或 kind 不匹配时截断。7 个同 role item 会被一次 claim 全部。
- **cap 5 是文档层保守默认**：`phase-wave0.md` §3.2、`phase-wave1.md` §3.2、
  `shared-subagent-protocol.md` §3 都写 "conservative default cap no higher than
  5 when no accepted profile/runtime cap exists"。这是给 Agent 的 guidance，不是
  Engine 强制。
- **本次 run 用了默认 5**，因为未设置任何 cap。7 个 topic 因此分两批。

## 证据

### 1. Engine claim 无 cap

`engine/work-unit-lifecycle.mjs`：
- 531 行：`if (!Number.isInteger(requestedCount) || requestedCount < 1) throw` —— 只验下限
- 401-426 行 `previewClaimCandidates`：`for (index < effectiveCount)` 顺序取
  active_window，`roleKey !== plannedRoleKey` 才 break；同 role 就全 claim

实测：本 run 中 `--count 5`（wave0、wave1）与 `--count 3`（wave1 supplementary）
均成功，Engine 未报任何 cap 上限错误。同 role 的 7 个 topic item 若 `--count 7`，
按代码会全部 claim。

### 2. cap 5 只在 Markdown

| 来源 | 原文 |
|------|------|
| `phase-wave0.md` §3.2 | "accepted/default cap for the run, **conservatively no higher than 5** when no accepted profile/runtime cap exists" |
| `phase-wave1.md` §3.2 | "The conservative default cap is **no higher than 5**" |
| `shared-subagent-protocol.md` §3 | "Use an explicit profile/runtime cap when accepted; otherwise use the documented conservative default cap for the phase, **no higher than 5**" |

三处都是 guidance，无 Engine 执行。

### 3. 无结构化 cap 配置位

- `profile.mjs`（ProfileSchema）**无 cap/concurrency 字段**
- 无 `--cap` CLI flag、无 env var、无 profile key
- "accepted profile/runtime cap" 在文档里是口子，但**没有落地的配置机制**
  → 要并发 7，只能 Agent 运行时自行 `--count 7`（Engine 不拦）

## 为什么默认保守取 5（而非 7）

cap 5 的意图是控制风险，不是技术限制：
- **宿主容量**：一次 spawn 太多 sub-agent 可能打满 host 并发/上下文
- **超时风险**：同时 run 的 attempt 越多，单个 attempt 的 timeout（默认 600000ms）
  被共享资源拖慢的风险越高
- **噪声隔离**：delegated work 的 receipt/trace 噪声随 in-flight 数增长
- 这些是**经验性保守值**，不是对特定 host 的硬测量

## 怎么做成一次 7 个

既然 Engine 不拦，两条路：

1. **Agent 运行时直接 `--count 7`**（推荐，零改动）：只要 7 个 item 同 role、
   Engine admission 全过，就一次 claim 7。成本是宿主同时跑 7 个 sub-agent。
2. **如果希望它成为"默认"而非每次手动**：需要一个 OpenSpec change，把
   "accepted profile/runtime cap" 落地为结构化字段（如
   `rb_profile.yaml#/delegated_concurrency_cap`），让 phase guidance 读它而非
   硬编码 ≤5。**当前不存在这个字段**——这也是一个文档/配置 gap（见下）。

## 顺带发现：cap 配置机制缺失（潜在 bug/改进）

文档说 "use an explicit profile/runtime cap when accepted"，但 profile schema、
CLI、env 都无此配置位。结果是：
- Agent 想调高并发只能靠"违反文档默认"手动 `--count 7`
- Agent 想调低（如弱 host 只跑 2 个）也没有结构化方式，只能自行判断

这不是 blocking bug，但属于 **"文档承诺了不存在的配置位"** 的 contract gap，
值得一个 OpenSpec change 落地（字段 + phase guidance 读取）。

## 与本次 run 实际阻塞的关系

**并发上限 5 不是本次 run 爆掉的原因。** 真正阻塞 Wave1 gate 的是 Engine 缺陷链
（见 `_backlog/bugs/` BUG-212/213/214）：
- BUG-213（depth-review 拒 prior source_ref）→ 误判需 supersede
- BUG-214（supplementary task.md 空 output vs dry-submit 强制非空）
- BUG-212（supersede 后 bypass 误报）→ gate 硬阻塞

并发分批（5+2）本身运行正常，sub-agent 全部成功提交。

## 参考

- `DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs`（claim 无 cap）
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md` §3.2
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md` §3.2
- `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md` §3
- `DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs`（无 cap 字段）
