# BUG-069 — "静默自主执行"（stop:no waves）在当前框架下不可达：Agent-facing 契约不自洽，必须逐条读 Engine 源码逆向才能过 gate

| 属性 | 值 |
|------|-----|
| ID | BUG-069 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 直接击穿框架的核心卖点（HITL1 之后 Setup→SeedTopics→Wave0→Wave1→Wave2 静默无人值守自主跑）；实际每个 wave 都要人/Agent 介入逆向修复 |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（exploratory_map，5 topics）——单次 run 中 seed/wave0/wave1 首过失败均需读 engine 源码才修复 |
| 相关 Bug | [[BUG-066]]、[[BUG-067]]、[[BUG-068]]（均为本 bug 的**症状实例**）、[[BUG-060]] |
| 影响文件 | `workflows/nodes/phases/phase-*.md`（Agent-facing 指令）、`engine/work-unit-envelope.mjs`（emitted `result.schema.json`）、`schema/gate_definitions/*.definition.json`（真实 gate 规则）、`engine/helpers/*.mjs`（真实 validator）；根因是三者之间缺"单一真相 + 一致性测试" |

---

## 0. 一句话核心诊断

**框架承诺 HITL1 之后是"静默自主执行、可关终端、几十分钟到一两天无人值守"（见 `brief/hitl1.md` 出口语与 `shared-silent-execution` 契约）。但实际上，每个 stop:no phase 要产出能过 gate 的 artifact，Agent 必须先去读 `engine/helpers/*.mjs`、`schema/gate_definitions/*.json`、`schema/contracts/*.mjs` 的源码，才能知道真正的字段名/role/ref 格式/正则要求——因为 phase MD 和 emitted `result.schema.json` 里的说明要么不全、要么与 validator 矛盾。于是"静默自主"退化成"gate 失败 → 读引擎源码 → 逆向修复 → 重跑"的串行循环，每一步在交互式会话里都表现为"卡住/浮出水面"。**

---

## 1. 证据：本次单 run 中，每个 wave 的首过失败都需要读 Engine 源码才能修

| Phase | 首过失败点 | phase MD / emitted schema 是否说清 | 实际真相来自 |
|-------|-----------|-------------------------------|-------------|
| seed-topics | task card 用 `work_id` 被拒 | ❌ 模板就是错的（[[BUG-067]]） | `schema/contracts/queue.mjs` superRefine |
| wave0 submit | `source_claims/accepted_source_urls` 被 contract 拒 | ❌ emitted schema 反而广告了这两个字段（[[BUG-066]]） | `engine/work-unit-validation.mjs:303` |
| wave1 submit | `source_claims[]` 未知 key 被 `.strict()` 拒 | ❌ emitted schema 写 `items:{type:object}` 无约束（[[BUG-066]]） | `schema/contracts/work-unit.mjs:201` |
| wave1 gate | evidence-summary.md 的 output role 必须是 `evidence_summary` | ❌ contract 说 `other` 也合法，无 role↔path 绑定（[[BUG-068]]） | `gate-wave1-complete.definition.json` selectors |
| wave1 gate | depth-review `reviewed_work_unit_refs` 不能带尾斜杠 | ❌ phase MD 示例带斜杠（[[BUG-068]]） | `engine/helpers/wave-depth-contracts.mjs:378` |
| wave2 gate | ledger 六段、finding-index 契约、`00-cross` provenance、synthesis 需 `W2F-\d{3}` 与 `../wave1/.../evidence-summary.md` 链接 | ⚠️ 仅部分在 phase MD；精确正则/字段来自 gate def + helpers | `gate-wave2-complete.definition.json` + `wave-depth-contracts.mjs` |

**共同模式**：Agent 无法只靠"读 phase node + emitted schema"产出通过的 artifact；必须打开 Engine 源码。这与 `README.md`「不要浏览文件结构，直接走 playbook」的意图正好相反——playbook 不足以过 gate。

## 2. 为什么这是"静默自主"的致命伤

- `shared-silent-execution` 要求 stop:no phase 不提问、不汇报、不浮出水面；`RUN.md` 说被"抓到想浮出水面"只能记 `--surfacing-intent` 然后 abort。
- 但当 gate 因契约漂移失败时，修复需要**新知识**（真实字段/格式），这些知识不在 Agent 当前上下文里，只能去读源码——这在语义上就是一次"停下来搞清楚状况"。
- 结果：一个本应"关掉终端等 HITL2"的流程，变成需要持续的读码-修复介入。**无人值守的前提（首过成功或确定性自愈）不成立。**

## 3. 根因

不是任何单个 phase 的问题，而是缺少**单一真相源 + 一致性保证**：
- phase MD（Agent 指令）、emitted `result.schema.json`（sub-agent 契约）、gate definition JSON（gate 规则）、`.strict()` Zod validator（真实校验）——四份东西各自演进、互相漂移，没有测试把它们钉在一起。
- emitted schema 本应是"给 sub-agent 的可满足契约"，却既不完整（wave1 items 无约束）又矛盾（wave0 广告禁用字段）。
- phase MD 里的示例（work_id、尾斜杠 ref）未被任何 linter/checker 校验为"与当前 validator 一致"。

## 4. 修复方向

1. **契约生成单一真相**：per-work-unit `result.schema.json` 从 `.strict()` Zod（`work-unit.mjs`）用 zod-to-json-schema **生成**，不再手写；同理 gate def 的字段要求引用同一 schema。让"emitted schema == validator"成为构建期不变量。
2. **preflight / dry-run**：提供 `validate-artifact --against <gate>` 或 `operate-work-unit dry-submit`，让 Agent 在正式 submit / gate 前一次性拿到所有契约不符项，而不是 gate 一条条爆。把"串行逆向"压成"一次批量校验"。
3. **phase-doc 契约一致性测试**：扩展 `validate-phase-templates.mjs` / `validate-work-unit-hygiene.mjs`，静态解析 phase MD 里的所有内联 JSON/YAML 示例（task card、result、depth-review、finding-index），断言其字段/格式与当前 schema/validator 一致——把 [[BUG-067]]/[[BUG-068]] 那类"文档示例即错误"在 CI 拦截。
4. **自愈防御**：对可确定性修复的偏差（role 归一、多余 key strip、ref 规范化、尾斜杠）在 submit/gate 侧 auto-normalize + 记 `silent_degradation`，与 [[BUG-060]] 的 autofill 哲学一致，让 stop:no 真正能自愈而不浮出水面。

## 5. 严重性论证

本次 run 的研究质量很高（wave0 74 源、wave1 每 topic 8–9 新源含 peer-reviewed 研究/RCT、全部真实抓取）。但从 seed-topics 到 wave1 gate，**没有任何一个 wave 是"首过即通过"**——全部需要读引擎源码逆向修复。对一个以"HITL1 后静默自主跑到 HITL2"为核心承诺的框架，这是 P1：卖点在真实 run 里不成立。
