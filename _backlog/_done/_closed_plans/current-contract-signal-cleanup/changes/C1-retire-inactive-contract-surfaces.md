# C1: Retire Inactive Contract Surfaces

> 候选 change：`retire-inactive-contract-surfaces`
>
> 状态：audit coverage closed; C1b-C1e map to dashboard item 10; C1f maps conditionally to experiment-history item 11
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

## 已知范围收口（2026-08-12）

这张卡所列的七个 surface 均已有最终分类。这里的“收口”只表示
**已知候选不再混在一个大桶中**；它不表示 C1 的 target edits 已完成，也不证明
Harness 的其他 broad-scan hit 已被全域审计；之后补充发现的 C1e/C1f 也已各自拆卡。

| Surface | 最终分类 | 证据与后续动作 |
|---|---|---|
| `gate-content-dedup` catalog exposure | 已完成 | C1a 已 archive；retired requirement identity/tombstone 保留，不再当成 current capability。 |
| `bundle-start-from-here` | 归入 C3 | current CLI/guidance 仍有 legacy entry success path；C1 不得靠删 tombstone spec 掩盖这个行为。 |
| `schema/contracts/gate.mjs` | L2 bounded cleanup candidate | 当前 runtime 不读它；仅 barrel、专属 tests、docs/models/specs 仍持有。详见 [C1c](C1c-retire-stale-abstract-gate-fsm.md)。 |
| `engine/gate-loop.mjs` / `gate-fork.mjs` | protected current experiment semantic | 六个 manifest-registered playbook、focused tests、`agent-testing` accepted spec 直接使用；不是 dead code。 |
| `workflow/fork-repair-converge` spec | L2 product-decision candidate | `convergeRepair()` / `sharedRepairStep` 不在 current Harness/runtime/test surface；retire 会放弃一个已写入 spec 的未来架构承诺。详见 [C1d](C1d-retire-unimplemented-fork-repair-contract.md)。 |
| `shared-seed-topic-authoring.md` | L1 bounded cleanup candidate | 无 manifest、`requires`、`suggested_context`、test 或 accepted-spec consumer；validator 不枚举未注册 shared files。详见 [C1b](C1b-retire-unreferenced-seed-topic-pointer.md)。 |
| `shared-return-map-authoring.md` | protected current guidance | 四个 phase 的 `requires` 和 `research-return-map` spec 共同拥有其 Wave0 contribution ordinal rule；不得作为 pointer 删除。 |

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

## 已完成的分类证据

- [x] 首个 C1a slice 已进一步收窄为 catalog-only：`2026-08-12-correct-retired-content-dedup-catalog` 已 archive；剩余 dead-surface 候选与 C1b 不在该 change 内。
- [x] 对 `gate.mjs` 完成 repo-wide static import/export inventory：当前 runtime 经 `schema/index.mjs` 使用的其他 exports 不引用该五个 stale exports；直接 consumers 是 barrel、专属 tests、docs/models/specs。未发现 dynamic import 或 package distribution evidence；`package.json` 为 private `0.0.0`。
- [x] `gate-loop` / `gate-fork` 已定位为 experiment-only supported helpers：manifest、playbooks、focused tests 和 `agent-testing` spec 都是 current consumer；C1 不触碰它们。
- [x] `shared-return-map-authoring` 的 non-pointer rule 已由四个 phase `requires` 链和 `research-return-map` spec 指定 owner；不删除。
- [x] `bundle-start-from-here` 的处置归 C3；C1 不删除其 current behavior contract。
- [x] `shared-seed-topic-authoring` 已确认不在 manifest、`requires`、`suggested_context` 或 explicit reader 中；没有目录枚举式隐含 consumer。

## Execution grouping

- [x] 全域 Coverage Gate 已完成；C1b-C1f 各自保留 decision-card approval 与证据门，但按下列 item 10/11 batch gate 进入 proposal。
- [ ] C1b-C1e 各自保留 exact consumer/rejection proof，但在相关决策一致后共用
  dashboard item 10 的 proposal/apply/archive。
- [ ] C1f 不进入 item 10；它与 C5b 共享 experiment-history owner，只有 policy
  对齐时才进入 dashboard item 11。
- [ ] 任一 card 的 policy、rollback 或验证边界不再对齐时，在 proposal 前拆分并
  更新 dashboard 分母。

## Decision cards and execution batches

- **Dashboard item 10**：C1b pointer、C1c stale Gate FSM、C1d unimplemented
  fork-repair promise、C1e unreachable YAML-subset helper。
- **Dashboard item 11 (conditional)**：C1f archive-only case-ledger helper 与 C5b
  retained experiment history。

这些 slice 都不得触碰 gate-loop/fork、return-map guidance 或 C3 的 legacy bundle-entry behavior。

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
- [x] C1 known-surface inventory 已逐项归类；仍有 current consumer 的 surface 没有被伪称 dead。
- [ ] C1b-C1f 逐项完成决策；按 dashboard item 10/11 的合并门进入 proposal。
