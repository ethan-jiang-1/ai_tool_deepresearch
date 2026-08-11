# BUG-224: Wave0 投影包无法表达"多个 work-unit 贡献各自 whole-contribution deferred"——`deferred_contribution` 单数 + slot_id 每包一次 的组合限制

> 状态: 活跃 | 优先级: P2 | 严重度: P3 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-safe-ai-harness wave0）

## Why

Wave0 seed projection 中，当**一个 topic 有多个已提交 work-unit 贡献**、且每个贡献都走
contribution-wide `deferred_contribution` 形式时，schema 无法在一个投影包内表达：

- `Wave0DeferredProjectionUpdateSchema`（`canonical-topic-state.mjs:365-368`）是
  `{ slot_id: literal('wave0_evidence'), deferred_contribution: <单数对象> }.strict()`——
  一个 update 只能携带**一个** `deferred_contribution`。
- `ProjectionPacketSchema` 的 superRefine（:383-386）强制 "each slot_id may appear only
  once in a Projection Packet"——不能为第二个 work-unit 贡献再开一个
  `slot_id: wave0_evidence` 的 update。

因此：一个 topic 有两个（或更多）work-unit 贡献、且都要 whole-contribution defer 时，
文档化的 `deferred_contribution` 形式**不可用**。唯一可用路径是把每个 source 展开成
`entries[]` 里的逐条 `relationship: defers / refs: [none] / status: deferred` 显式条目
（entry_id `<work_id>/<ordinal>`，每个 ordinal 一条）。

**文档与 schema 不一致：** `command_playbook/operate-topic-state.md` 写
"One work ID may contribute multiple entries or **exact deferred dispositions** in one
`wave0_evidence` update"，暗示同一 update 可承载多个 deferred disposition；但 schema
的 union（`ProjectionUpdateSchema` 或 `Wave0DeferredProjectionUpdateSchema` 二选一）
不支持在 entries 形式之外叠加多个 `deferred_contribution`。playbook 也未说明
"多个贡献全 defer 时必须改用逐条 entries 形式"。

实测：enterprise-safe-ai-harness 的 topic 02/03/04 各有两个 work-unit 贡献
（primary + supplementary），我用两个 `deferred_contribution` update 时 apply 报
`blocked: each slot_id may appear only once in a Projection Packet`，改生成逐条
deferred entries（12/11/11 条）后才 apply 通过。

## 复现

1. 一个 topic 有两个已提交 Wave0 work-unit 贡献（如 primary `wu-...-i0002` 与
   supplementary `wu-...-i0006`），都无 materializable consumer reference。
2. 按 playbook 构造两个 update，各含一个 `deferred_contribution`（分属两个 work ID）：
   ```json
   { "context":"wave_projection","action":"apply_seed_projection","topic_uid":"<uid>","wave":"wave0",
     "updates":[
       {"slot_id":"wave0_evidence","deferred_contribution":{...work_id A...}},
       {"slot_id":"wave0_evidence","deferred_contribution":{...work_id B...}}
     ]}
   ```
3. `operate-topic-state apply` → `verdict: blocked`, `reason_code: input_invalid`,
   `coordinate: updates[1].slot_id`, message "each slot_id may appear only once in a
   Projection Packet"。
4. 把每个 source 展开为 `entries[]` 逐条 `defers/refs:["none"]/deferred` 后 apply 才过。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`
  （`Wave0DeferredProjectionUpdateSchema` / `ProjectionPacketUpdateSchema` union）与
  `command_playbook/operate-topic-state.md`（文档）。
- 最小修复方向（三选一，倾向前两个）：
  1. **允许一个 update 携带 `deferred_contributions[]`（数组）**：把
     `Wave0DeferredProjectionUpdateSchema` 扩展为接受数组，多个 work-unit 贡献可在
     同一 `wave0_evidence` update 内各给一个 deferred_contribution。
  2. **放宽 slot_id 唯一约束**：允许同一 slot_id 多 update（superRefine 改为按
     work_id 去重而非 slot_id），使每个贡献一个 update 的写法合法。
  3. 若维持现状，则**明确文档**：多贡献全 defer 时必须使用逐条 `entries[]`
     `defers` 形式，`deferred_contribution` 仅限单贡献 topic。
- 验收：含两个 work-unit 贡献、各自 deferred 的 Wave0 投影包能一次 apply 通过，
  或文档明确给出等价合法路径。
