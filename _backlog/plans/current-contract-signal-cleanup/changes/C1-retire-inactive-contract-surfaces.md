# C1: Retire Inactive Contract Surfaces

> 候选 change：`retire-inactive-contract-surfaces`
>
> 状态：partially completed; remaining candidates need split decisions
>
> 风险：L1 for tombstones; L3 for gate utilities with current experiment consumers

## 要解决什么

清掉已经没有 current runtime authority、却仍被 catalog、spec 或文档说成当前能力的历史 surface。这里最大的价值不是减少几行代码，而是让 Agent 不再把“明确废弃的旧 FSM”或“纯 traceability tombstone”误认为实施入口。

## 已验证事实

| Surface | 现状 | 当前 consumer 证据 | 初步结论 |
|---|---|---|---|
| `engine/gate-content-dedup` spec | 所有 `GAC-*` 已 retired；spec 本身说是 tombstone | catalog wording 修正已由 `2026-08-12-correct-retired-content-dedup-catalog` archive；保持 tombstone spec/registry | **已完成的 L1 catalog-only slice**；不代表其余 C1 surface 已处理 |
| `bundle/bundle-start-from-here` spec | 全部 `BUS-*` 已 retired；spec 只描述旧文件 | legacy entry 仍有 current CLI/guidance success support | 不能单独删 spec 后假装兼容已消失；与 C3 绑定决策 |
| `schema/contracts/gate.mjs` | 文件开头明确声明 runtime 不使用；仅 barrel export 和专门 test import | `schema/index.mjs`、README、`shared-schemas.md` 仍展示它为 current transition contract | 需要先修正 current guidance；L1-L2 deletion candidate |
| `engine/gate-loop.mjs` / `gate-fork.mjs` | 未发现 Harness production import | 活跃 `experiments_playbook/exp_gate-loop/*`、`exp_gate-fork/*` 直接 import，并自称 production path | **不是无消费者；不可按 dead code 删除** |
| `workflow/fork-repair-converge` spec | 陈述 `convergeRepair()` / `sharedRepairStep` | repo current surface 除该 spec 外未找到实现或调用 | L1 spec correction/removal candidate |
| `shared-seed-topic-authoring.md` | 纯 compatibility pointer | current repo 未找到 requires/import/spec owner | L1 deletion candidate，仍需 proposal scan |
| `shared-return-map-authoring.md` | 大部分是 pointer，但含 Wave0 ordinal 规则 | 被四个 phase 的 `requires` 链和 `research-return-map` spec 明确拥有 | **当前 owner；不可作为纯指针删除** |

## 目标 contract

- Retired capabilities 只留 registry/archive 的历史身份，不在 current catalog 中表现成生产能力。
- current Gate routing 的唯一 truth 是 `workflows/transitions.chain.json` + current router，不是旧 `gate.mjs` FSM。
- 一个当前 playbook 仍直接 import 的 utility，要么保留为 current supported utility，要么在独立 change 中迁移/删除 playbook 后才能移除。
- Agent-facing shared guidance 只有在没有 `requires` 或 accepted spec owner 时才可删除；有 owner 的文件应被改造成真实 owner 或保留。

## 影响面

| 层 | 可能改动 |
|---|---|
| Accepted specs/catalog | `engine/transition-table`、`workflow/fork-repair-converge`、two tombstone specs、`openspec/specs/README.md` |
| Harness docs | `DEEP_RESEARCH_HARNESS/README.md`、`workflows/nodes/shared/shared-schemas.md` |
| Schema / exports | `schema/contracts/gate.mjs`、`schema/index.mjs` |
| Tests / experiments | `tests/schema/contracts/gate.test.mjs`；若处理 utilities，六个 active gate-loop/gate-fork playbooks 及 manifest |
| Agent flow | `phase-wave0/1/2`、`phase-seed-topics` 依赖 return-map shared guidance |

## 风险与不可碰项

- `gate-loop` / `gate-fork` 的 runtime call graph 没有 consumer，不代表没有 active product surface；experiment manifest 已把它们排入可运行 case。删除会改变 experiment 可执行性和 accepted `agent-testing` contract。
- `shared-return-map-authoring` 的约 1 段 Wave0 ordinal 规则不是纯转发。删除前必须给该规则一个明确新 owner，不能只留链接。
- `bundle-start-from-here` 的 tombstone spec 与 C3 的 current CLI compatibility 有耦合；不能让 spec 删除掩盖实际仍接受的入口。

## Proposal 前的 Go / No-go

- [x] 首个 C1a slice 已进一步收窄为 catalog-only：`2026-08-12-correct-retired-content-dedup-catalog` 已 archive；剩余 dead-surface 候选与 C1b 不在该 change 内。
- [ ] 对 `gate.mjs` 运行 repo-wide import and export inventory，确认没有 package consumers、generated assets 或 dynamic import。
- [ ] 决定 gate-loop/fork 的产品定位：保留为 experiment-only supported helper，或另立迁移/retire change；未决定则 C1a 不触碰它们。
- [ ] 给 `shared-return-map-authoring` 的 non-pointer rule 指定 owner，并证明 phase `requires` 链在删除/迁移后仍提供同等指引。
- [ ] 明确 `bundle-start-from-here` spec 的处置放在 C3，或在 C1a 中仅改 catalog wording，不删除 current behavior contract。

## 最小安全 change

优先仅做 C1a：移除/更正 pure tombstone catalog exposure、删除未消费的 `shared-seed-topic-authoring.md`、修复无实现的 fork-repair spec、把 gate FSM docs 指向真实 router；暂不删除 gate utilities、return-map guidance 或 legacy bundle spec。

## 验证

```bash
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
node --test tests/schema/contracts/gate.test.mjs
```

proposal 还应选择对应 Markdown/experiment tests；若移除 `gate.mjs`，需确认 `schema/index.mjs` 和每个 exposed import 的拒绝/删除行为。

## 何时算完成

- [x] current catalog 不再把 retired `gate-content-dedup` 当可用 capability。完成于 `2026-08-12-correct-retired-content-dedup-catalog` archive。
- [ ] no-implementation spec 不再宣称不存在的 API/repair loop。
- [ ] dead surface 已删或有明确 owner；仍有 current consumer 的 surface 没有被伪称 dead。
- [ ] C1a archived，并在总计划登记 C1b 的独立决策结果。
