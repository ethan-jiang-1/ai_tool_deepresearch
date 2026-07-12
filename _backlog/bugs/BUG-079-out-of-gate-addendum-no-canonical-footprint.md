# BUG-079: Out-of-gate addendum topics leave no canonical footprint — Engine-invisible, structurally inconsistent bundle

**Reported:** 2026-07-12
**Bundle:** `dpt_rb_ai-era-bpm-process-disruption`
**Phase:** Final (terminal) → post-final out-of-gate addendum（BUG-078 workaround 的下游后果）
**Severity:** High — 新增 topic 的证据真实且保存了，但对 canonical 结构、gate/audit/recovery 工具**完全不可见**；bundle 结构自相矛盾
**Current status (2026-07-12):** Active / detectable / durability partial — C1 groups registry-external durable topic output, dangling metadata, and parallel namespaces into canonical recovery findings. C2 v0.23 adds crash-safe persistence for sanctioned content roots, so completed staging can survive rename-boundary crashes without unknown-temp promotion. Canonical materialization/progress and sanctioned post-final reentry remain open for C3/C5; C2 does not authorize the historical addendum namespace.

## Symptom

在 BUG-078 workaround 下把 post-final rerun 当作 out-of-gate addendum 补做后，新增的 4 个公司 topic 的产物落在一条**平行私有命名空间**里，与 canonical 管道结构完全脱节：

| canonical（gated topic 01–05 有） | addendum topic 实际落在 | 缺口 |
|-----------------------------------|-------------------------|------|
| `artifacts/wave0/<NN>_<topic>/source.yaml` | —（无） | 无 wave0 source 清单 |
| `_cache/wave0/primary/wave0-source-<NN>_…/` | `_cache/addendum/<company>/…/` | 缓存在私有路径 |
| `artifacts/wave1/<NN>_<topic>/evidence-summary.md` | —（无） | 无 wave1 深挖清单 |
| `_cache/wave1/primary/<NN>_…/` | （同上，addendum 侧） | — |
| `seed_topics/<NN>_<slug>.md` | —（手工补前不存在） | 证据卡 `related_topic` 悬空 |
| `rb_plan.md topic_registry` | —（手工补前不含） | topic 不入册 |
| `rb_queue.json` / `rb_status.json` | —（无感知） | 状态机不知道有新 topic |
| `rb_trace.jsonl` | —（**零事件**） | Engine 全程未记录 |

结果：从任何 canonical 表面看，这个 bundle 都像一个"5 topic 的已终结 run + 一堆看不懂的 `addendum/` 侧料"。gate / `audit-phase-status.mjs` / 未来的 recovery 工具**枚举不到** topic 06–09。

## Root cause

**根因链（门儿 + 设计缺口，二者兼有）：**

1. **门儿（gate 死锁）**：post-final rerun 触发后，gate 给出的 sanctioned advice 是**死循环**。`_diagnostics/gates/2026-07-11T13-28-49.265Z-hitl2-recorded.json`：
   - inspect: `"Latest deterministic handoff targets phases/phase-final.md, not current node phases/phase-hitl2.md."`
   - advice: `"Continue from the latest checked handoff target, or rerun the predecessor gate for phases/phase-hitl2.md and then: enter-phase … --node phases/phase-hitl2.md"`
   - 但按 BUG-078，rerun 前驱 gate **也**被 `handoff_preflight` 挡（棘轮级联）。于是 advice 指向的"正路"（`enter-phase hitl2`）本身必然失败——**框架给了一条走不通的路**。

2. **设计缺口（无 out-of-gate 落点）**：框架**没有任何 addendum / out-of-gate topic 的概念**：
   - `DPT_FRAMEWORK/rb_templates/` 里**无 addendum 模板**；框架代码不引用 `addendum`。
   - `_cache/addendum/`、`reference/addendum-*`、`final/addendum/` 全是 agent 在无路可走时**当场手搓**的命名空间（`_cache/addendum/` 连 README 都没有；meta.json 由 agent 手写，`fetched_via: "bash curl … (WebFetch blocked BUG-076)"`）。
   - 因为是 ad-hoc，**没有任何步骤**把这些产物映射回 canonical 的 `topic_registry ↔ seed_topics ↔ artifacts/waveN ↔ _cache/waveN ↔ rb_status/queue/trace` 结构。

两者叠加：Engine 既不给合法前进路径，也不为"终态后新增 topic"预留 canonical 落点，Agent 只能自建平行结构，而平行结构对 Engine 隐形。

## Forensic evidence（历史留下的痕迹）

从 trace / log / diagnostics 复原（全部可查证）：

- **`rb_trace.jsonl` 在 `2026-07-11T13:34:40` 后彻底停止。** 最后 4 条是 rerun 的失败 gate attempt（hitl2-recorded ×3、wave2-complete ×1），全部 `passed:false, next:null, routing_kind:no_transition`。**其后 4 家公司的全部 addendum 工作 = 零 trace 事件。**
- **`grep -iE 'addendum|reopen|refill|rerun|new_topic' rb_trace.jsonl` → 空。** Engine 从未记录过 addendum 的存在。
- **`_logs/run.log` 有 48 分钟静默断口**：`13:34:40` 最后一次 gate WARN → `14:22:41` 一条**手写** `INFO POST-FINAL ADDENDUM START (BUG-078 workaround)`（非 CLI 产出的 event，是 Agent 叙述性写入）。这段空白正是 Agent 穷尽 sanctioned CLI、改走手工路的决策窗口。
- **canonical 目录只有 01–05**：`artifacts/wave0/`、`artifacts/wave1/`、`_cache/wave0/primary/`、`_cache/wave1/primary/` 均只含 topic 01–05；06–09 无一进入。
- **证据卡 `related_topic:` 悬空**：19 张 `reference/addendum-*` 卡的 `related_topic: 0N_<slug>` 在人工补 seed 前，指向**不存在**的 `seed_topics/` 文件与 registry 条目。
- **`rb_profile.yaml` 的 HITL2 记录与实际结构 drift（2026-07-12 发现）**：profile 里 `hitl2.user_decision: rerun` 是真实记录，但其 `rationale` 写的是"add 06 标杆企业画像 / 07 AI 影响"两个综合 topic——与最终物化（4 家公司深挖 06–09、无综合 topic）**不符**。因 BUG-078 无法重入 HITL2 重新记录 decision，profile 里卡着的是最初意向而非最终结构；已加 `rationale_reconciliation` 字段对齐。这是"out-of-gate 让 profile 的用户输入记录与磁盘产物脱钩"的又一实证。

## Impact

- **结构自相矛盾**：bundle 无法仅凭 canonical 状态枚举真实 topic 集；本次恢复只能靠 `rb_plan.md` Decisions 一行 + run.log + chat 记忆逆向重建（见 [`breakpoint-recovery-persistence-model`](../plans/breakpoint-recovery-persistence-model.md) 的 P2/P3）。
- **gate/audit/recovery 失效**：`audit-phase-status.mjs`、wave gate、任何按 canonical layout 工作的工具都看不到 06–09。
- **"伪装"泄漏**：把 addendum 说成"像正常深挖轮"是不成立的——canonical 结构有系统性空洞，且 Engine 无记录。

## 根本设计张力：human override vs anti-cheating（本 bug 最深层根因）

比 078/079 具体缺口更深的一层：**框架的 anti-cheating 严格性是为约束"自动化的 Agent"而设，却错误地一并锁死了"有授权的人"。**

- anti-cheating 规则（禁止手写 `rb_trace.jsonl`、禁止手改 `rb_status.json`、单向 handoff 棘轮、`stop:no` 不得 surface）本意正确——防止 LLM Agent 静默伪造进度/证据。
- 但框架**没有机制区分两种改动**：
  - **作弊** = Agent 静默、无审计地伪造状态（应禁）。
  - **授权修正** = 人类 authority 显式、有审计地覆盖 guardrail（应允）。
- 二者被 anti-cheating 规则**混为一谈、一律堵**。后果：
  - HITL 名义上"人是 authority"，实际人被 anti-cheating 机器降格——想改 `rb_status`/重入 phase/重编号，全被"不能改这个不能改那个"挡回（本次全程亲历）。
  - **熟悉框架的人**都要跨 N 个面手工同步才能改对；**小白**几乎不可能自救。
  - 用户强烈、明确地要求某改动时，框架仍不 defer 到人的 authority——过度刚性变成"进得来、修不了"。
- **缺的不是"更松"，而是一个"有审计的松动口"**：一条 sanctioned 的 human-override 路径，把"人显式授权 + 记录 who/when/why"作为合法覆盖，与"Agent 静默伪造"在机制上分开。松动口有审计，就不是作弊。

## Suggested fix

择一或组合（建议 A+C）：

- **A. 修 BUG-078 让 rerun 走 gated 路径**：终态后 `user_decision:rerun` 由 Engine 转成受审计的 `phase-rerun` handoff，新 topic 走真正的 wave0/wave1 phase，**天然产出 canonical artifacts + trace**。根治。
- **B. 正式化 addendum 为一等结构**：若保留 out-of-gate 路径，给它 sanctioned 模板 + CLI（`addendum-open` / `addendum-add-topic`），Engine 负责物化 seed + registry 条目 + `artifacts/waveN/<NN>/` + `_cache/waveN/` stub + trace 事件，并在 `rb_status` 里记 addendum 进度面。
- **C. 加 canonical 一致性审计**：`audit-phase-status.mjs`（或新 `audit-bundle-integrity.mjs`）应报出：① 有 `reference/*` 卡 `related_topic` 无对应 seed/registry；② `topic_registry` 里的 topic 在 `artifacts/waveN` 无 footprint；③ 存在 Engine-trace 无记录的 `final/`/`_cache/` 侧产物。让"隐形 topic"变成可检出的 drift。
- **D. 修 gate advice 的死循环**：当唯一 advice（rerun 前驱 gate → enter-phase）本身会被棘轮挡回时，gate 不应给出这条注定失败的建议；应显式说明"终态后无 sanctioned 前进路径，见 BUG-078/079"。
- **E. 有审计的 human-override 松动口（针对上节根本张力，最高优先）**：加一条 sanctioned CLI（如 `human-override` / `authorized-repair`），允许**认证的人类**做通常被 anti-cheating 禁止的改动（手改 status、重入终态 phase、重编号 topic），但**强制留审计**（who / when / why，写入 trace + run.log，并打 `override` 标记）。核心区分：**作弊=静默无审计；override=显式有审计**。让人类 authority 在 HITL 框架里真正能覆盖 guardrail，而不是被降格。配合 C 的一致性审计，override 后可立即校验是否引入 drift。

## Workaround（本次已用，非 clean）

手工把 addendum 归一化回 canonical：补 `seed_topics/06–09`、注册 `topic_registry`、回填 `artifacts/wave0|1/<NN>/`、`_cache/wave0|1/primary/<NN>/`。真实但纯人工、无 Engine 背书、无 trace。

## Related

- [BUG-078](BUG-078-post-final-hitl2-rerun-reentry-blocked.md)（上游根因：rerun 重入被单向棘轮堵死；本 bug 是其下游结构后果）
- [BUG-076](../_done/_fixed_bugs/BUG-076-webfetch-domain-verification-blocks-research-fetch.md)（addendum 采证走 curl 的原因；框架侧已接受替代 fetch surface）
- Plan [`breakpoint-recovery-persistence-model`](../plans/breakpoint-recovery-persistence-model.md)（P2 状态落盘 / P3 意图落盘——本 bug 是"数据落在非 canonical 位置"的活样本）
- `DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs`、`DPT_FRAMEWORK/cli/audit-phase-status.mjs`、`DPT_FRAMEWORK/rb_templates/`
- Bundle: `/Users/bowhead/ai_tool_deepresearch/dpt_rb_ai-era-bpm-process-disruption`
