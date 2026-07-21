# BUG-098: Wave1 sub-agent output format doesn't match Engine validation contract

| 字段 | 内容 |
|------|------|
| **编号** | BUG-098 |
| **发现日期** | 2026-07-21 |
| **发现场景** | `dpt_rb_ai-agents-enterprise-bpm-productivity` — wave1 work-unit dry-submit |
| **严重度** | P1 — 4/5 work units 在 dry-submit 时因 section header 格式不匹配被拒 |
| **影响面** | 所有 wave1 topic deepening sub-agent (dpt-evidence-extractor) |
| **当前状态** | Active — v0.40 deterministic delivery wiring is implemented, but case-221's only native Autorun timed out before inspect/Gate/native completion |

## 结案决定（2026-07-21）

根因的 deterministic remediation 已由 archived `deliver-work-unit-role-contracts-to-actors`（v0.40）交付：actor 获得同源 role guidance 与 direct authoring projection，shared evaluator 仍是唯一 verdict owner。case-221 的 selected native completion authority 缺席，因此真实 first-return claim 仍为 `NOT_RUN`；该事实保留为 runtime observation pending，不伪称为 PASS，也不再为追逐它创建嵌套 test/runner work。

## 当前验证边界

2026-07-21 case-221 的两个 real actor 都留下 `work_done`、predictive dry-submit PASS、formal submit PASS，以及代表 actor paired target 的 pre/post hash parity；但 Supervisor 在 native completion 前报告 `ERROR: agent_timeout`，没有 native inspect/Gate verdict。该 partial run 不能关闭 BUG-098，也不能替代 general real-actor first-return routed claim。BUG 保持 Active，直到该 claim 从其 selected native authority 得到 PASS。

## 现象

5 个 dpt-evidence-extractor sub-agents 完成了实质性的 topic deepening 工作（每 topic 10-35 个 evidence particles，丰富的 mechanism/trend/limitation 分析），但 dry-submit 时 4/5 失败：

- `key_findings_missing_or_empty` — evidence-summary.md 缺少 Engine 期望的 `## Key Findings` section header
- `question_list_sections_missing_or_empty` — question-list.md 缺少当前 Engine/role contract 共同要求的 4 个 semantic sections（`## Topic Investigation Targets`、`## Question Reconciliation`、`## Emergent Question Protocol`、`## Exploration / Exploitation Decision`）

## 根因

当前 v0.38 Engine 与 canonical `dpt-evidence-extractor` role guidance 已经对齐：

- shared direct-output evaluator 要求 non-empty `Key Findings`，以及 `Topic Investigation Targets`、`Question Reconciliation`、`Emergent Question Protocol`、`Exploration / Exploitation Decision` 四个 question-list semantic sections；
- canonical role Markdown 已给出相同 authoring template；
- generated work-unit `task.md` / spawn prompt 只向真实 actor 显示 exact path、canonical role 和 opaque `direct_contract` ID，并要求读取 task/beacon/schema；actor 不直接加载 role Markdown，也没有拿到 minimum authoring projection；
- production actor 因此首次写出另一套 headings，后续 Phase repair 追加 required sections。该 repair 不能证明首次 actor output 合格。

因此根因是 **已有 authoritative role/direct contract 没有送到 actor decision point**，不是缺少 validator，也不是 Engine 与 role template 仍然不一致。Dry-submit 已经提供 deterministic enforcement；再加 fuzzy/semantic validator 会形成第二份 truth。

## 建议修复

1. 从 existing closed `delegated_role_key` 派生 canonical role guidance ref，并把该 ref 投影到 generated `task.md` / spawn prompt，要求 actor 在执行前读取。
2. 从 existing direct-output contract owner 投影 minimum authoring requirements，避免 envelope generator 手写另一份 heading inventory；projection 不是 verdict authority。
3. 保持 shared evaluator 为唯一 deterministic verdict owner，不新增 fuzzy/semantic validator、actor-selectable contract/role 或 persisted contract registry。
4. 同一 delivery change 把 role guidance 中既有 fetch behavior 送到 actor，并清理被触碰 surface 上的 Python fallback；用户不承担已授权的 search/fetch/dry-submit/repair mechanics。

## 相关 bugs

- BUG-096：WebFetch→curl fallback（同类：sub-agent 不知道替代路径）
- Wave0 source.yaml schema 不匹配（同类：Agent-facing vs Engine-facing format gap）
