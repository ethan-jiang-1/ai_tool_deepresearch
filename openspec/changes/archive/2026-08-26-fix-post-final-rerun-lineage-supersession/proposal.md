## Why

post-final 多轮 rerun 时，`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` 的
`supersededBy` 把**同一个 gate + 同一个 currentNodeRef** 的后续 gate_attempt 一律当成对先前 passed
pass 的「覆盖」，导致 (a) 后续失败 attempt（`passed:false`）吞掉一个先前合法 passed pass（BUG-244），
(b) 多轮 rerun 中同一 `hitl2-recorded` gate 在不同轮次被不同 `next` 合法使用（本轮 → `phase-rerun.md`，
最后一轮 → `phase-readiness.md`）时，较早轮次的回入 pass 被误判覆盖（BUG-241）。由此
`continuousNormalDescendant` 在 trace index 743 判 descendant lineage discontinuous，`advance-status`
/ `check-reentry` / `enter-phase phase-final` 多路阻断，readiness / Final 交付卡死（blocker）。
`enter-phase phase-final` 在同一调用中先 `validateEnterPhaseTarget` 报 ok、后 `evaluateFinalEntryAdmission`
失败的自相矛盾反馈（BUG-245）放大了误判，使人误以为「授权没问题、只需修 inventory」。

## What Changes

（本 change 只修 descendant lineage 的 supersession 判定与 Final entry admission 的单一反馈；不改
C5 event 写入、post-final recovery workspace、rerun 计数/风格投影、Final inventory series 等既有 authority。）

- **BUG-244**：`supersededBy` 不再把 `passed:false` 的后续 attempt 当作 superseder——一次失败的 gate
  尝试不得作废先前已通过的 pass。只考虑后续 **passed** attempt。
- **BUG-241**：`supersededBy` 不再把「同 gate + 同 node 但 `next` 不同」的后续 passed attempt 当作
  superseder——跨 rerun 轮次的同 gate 多 pass 是不同生命周期事件，不是「同 pass 被重新决定」。
  仅当后续 passed attempt 与 candidate **同 `next` 且之间没有其它 gate 的推进**（即字面意义的
  「同一点重跑同一次决定」）时才覆盖。由此 `continuousNormalDescendant` 对真实多轮 trace
  （post_final → rerun#1 → hitl2(再次 rerun) → rerun#2 → waves → hitl2(readiness) → readiness → final）
  构建出连续链，readiness / Final 交付恢复。
- **BUG-245**：`enter-phase phase-final` 的 Final admission（`evaluateFinalEntryAdmission`）并入
  `validateEnterPhaseTarget` 的授权判定，使最终 entry 只有**一个**非自相矛盾的裁决点；
  admission 失败时输出直接说明是 lineage/inventory 门禁未过，而不是先报成功再硬 fail。
- 相关回归测试（`tests/engine/handoff-helpers.test.mjs`、`tests/integration/cli/enter-phase.test.mjs`、
  `tests/integration/cli/advance-status.test.mjs`、`tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`、
  `tests/integration/cli/check-gate-readiness-passed.test.mjs`
  中六处编码「后续 failed attempt 覆盖先前 pass」旧语义的断言）同步改为断言修复后的正确语义（失败
  attempt 不吞合法 pass）。新增确定性回归覆盖真实 multi-round post-final rerun chain 场景。

## Capabilities

### New Capabilities

（无：本 change 不引入新 capability，也不新增 requirement ID / prefix。behavior 修改落在既有
`research/post-final-recovery`。）

### Modified Capabilities

- `research/post-final-recovery`: 新增两条规范 requirement，钉住既有 POF-003「one continuous
  descendant chain」的实现语义——(1) descendant supersession 只限「同点重跑同一次决定」（failed attempt 与
  跨轮不同 `next` 不再覆盖，多轮 rerun 链保持连续）；(2) Final entry admission 在 `enter-phase` 的单一
  非自相矛盾裁决。既有 POF-003 正文不变（只增加精化其满足方式的规范细节）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md`（POF-003「one continuous descendant chain」、`descendant_pipeline` owner；line 93-107） | Modify | supersession 判定与 descendant lineage 属此 capability 的 Engine 行为 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md`（C5 事件/lineage owner） | Verify-only | 不改 C5 event 写入/retirement witness 语义，仅修 handoff 读取侧 covering 判定 |
| `engine/check-inspect-feedback` | 本 change 上下文 | Excluded | BUG-245 反馈收敛通过 `enter-phase.mjs` + `validateEnterPhaseTarget` 实现，不新增 feedback vocabulary |
| `agent/delegated-work-units` | — | Excluded | 不触碰 work-unit surface |
| `bundle/cache-raw-web-content` | — | Excluded | 不触碰 bundle surface |

## Impact

- 直接源码：`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`
  （`supersededBy`、`continuousNormalDescendant`、`validateEnterPhaseTarget` 的 callers）、
  `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs`（Final admission 单一裁决）。
- 回归测试：`tests/engine/handoff-helpers.test.mjs`、
  `tests/integration/cli/enter-phase.test.mjs`、
  `tests/integration/cli/advance-status.test.mjs`、
  `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`（`runSupersededBranch`）、
  `tests/integration/cli/check-gate-readiness-passed.test.mjs`（test 13）——
  六处编码旧「失败 attempt 覆盖先前 pass」语义的断言更新为修复后语义 + 新增 multi-round 场景。
- 依赖/系统：无新依赖；Node >=20 ESM、zod/yaml 不变。
- 非目标：不改 C5 event 写入/recovery workspace/rerun_count/style projection/Final inventory series；
  不为真实 bundle 手改 trace/ledger/status。
