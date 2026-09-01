# Design: lock-closed-vocabularies-and-clear-residue

## Context

见 proposal.md。全部裁定沿用 plan §4（Q1–Q4），本 design 记录落地级技术选择。C1 已完成 spec 侧重同步；本 change 代码向 spec 收敛。**层级规则（C1 用户评审确立）**：spec prose 不点名实现 `.mjs`；同理本 change 的代码注释与测试也不得把 spec 文件当实现归属，反向关联继续走 `@impl`。

## Goals / Non-Goals

- Goals：三个词汇锁（disposition zod 锁、candidate 枚举提升、checker）+ 死代码清零 + preflight SHALL 字段补齐 + `actor_guidance` 改名 + A7 文案；治理 16→17。
- Non-Goals：不改任何可达行为语义；`work-unit-lifecycle.mjs` 主体结构不动（仅 forcedTimeoutAudit 一行）；不填 CHI-004 决策表回归占位（独立债务）；不做 spec `.mjs` 全仓清扫（C3 任务 8）。

## Decisions

| # | 决策 | 理由 / 备选 |
|---|---|---|
| D1 | disposition 锁：`WORK_UNIT_ATTEMPT_DISPOSITIONS` 冻结数组 + `WorkUnitAttemptDispositionSchema = z.enum(...)` 定义在 `schema/contracts/work-unit.mjs`（schema 持有唯一清单），`work-unit-repair-vocabulary.mjs` re-export + `WORK_UNIT_ATTEMPT_DISPOSITION` key-map，`work-unit-attempt-disposition.mjs` 7 处字面量改常量 | 唯一发射 choke point（`projectWorkUnitAttemptDisposition`）已核实；镜像 `work-unit-repair-vocabulary.mjs` 实测模式（frozen map + frozen array + 专测）。备选：新 sibling 模块——功能等价但多一个文件 |
| D2 | checker 静态 import 七个代码导出（recovery/gate×2/timeout/StopAuthState/phase-audit/candidate+disposition 新导出），fail-closed derive + 子集 fixture pin（1–2 成员/集，不构成第二目录）；反引号 token + 单集 ≥2 成员 + 主导集归属 + 邻接闭合提示 + 无 hedge 才触发完整性规则 | Q4 实测定标：全仓零误报；GSK-011 对齐（无值清单副本）。regex 抽取只作文档化降级路径。扫描面 `openspec/specs/**`+`openspec/guidance/**`，与 check-gate-chain-prose（HARNESS md）互补不重叠 |
| D3 | 死代码删除采用**精确手术**：`validateSubmitRuntimeReceipt` 内删 `autofilled` 簇（identity fill loop + `receipt_binding_identity_autofilled` 记录）与 receipt nonce normalize 分支；`validateSubmitCandidateResult`（result 侧）删 nonce normalize 分支；删除 `allowNonceNormalization` 参数（validation 签名、submit :1261/:1702、supersession :223）。保留 strict throw 与 `receipt_schema_defaulted` | strict 分支永真（`assertCompleteCurrentWorkUnitProfile` 入口保证）；测试已断言 `receipt_binding_identity_autofilled===false`。备选：保留分支加注释——死代码就是漂移温床，删除是 C1 spec 口径的机械落实 |
| D4 | `preflight_candidate_projection: timeoutPreflight?.candidate_projection ?? null` 一行进 `forcedTimeoutAudit`（含 `work_unit_forced_timeout` 事件 payload——同一对象 spread，自动携带） | 投影已在强制路径上无条件计算且经 `WorkUnitTimeoutPreflightSchema.parse`；零新增计算、零新增 throw 面 |
| D5 | `actor_guidance` 改名：`evaluateActorDecision` 8 处 key + lifecycle `:656/:676/:713` 消费点（含 malformed 分支的 `recommendedAction` 变量与 `work_unit_claim_rejected` trace payload 内嵌对象——对象字段随 actor_preflight/结果对象整体更名） | 字段零 spec 引用、零测试断言、零外部 trace 消费者（Q3 已核）；封闭集字段名（dry-submit 5 值、timeout 6 值）保持不动。timeout-preflight 的 `recommended_action`/`preflight_recommended_action` 均不受影响 |
| D6 | A7 文案：`write_to` 改为 "submitted declaration recovery prerequisites for `<work-id>`; repair via `operate-work-unit submit` / `late-submit` / a fresh claim (the submit/late-submit/new-attempt boundary); do not edit rb_output_declarations.jsonl, index, status, queue, or hashes manually" | 满足 spec:532 "SHALL name the submit/late-submit/new-attempt boundary"；一行文案，无行为变化 |

## Risks / Trade-offs

- `WorkUnitRuntimeReceiptEventSchema` 的 Zod schema 要求四 binding 字段必填——删除 autofill 后"缺失即 throw"路径不变，安全。
- 检查器静态 import 若未来被 import 的模块长出副作用会拖慢/破坏 check-all：以头注释钉住 definition-only 不变量 + fail-closed derive（空集/缺 fixture 值即 exit 1）+ 文档化 regex 降级路径。
- 改名波及 `work_unit_claim_rejected` trace payload 消费者：Q3 已核实框架+测试内无消费者；若有 run bundle 历史包含旧字段，历史 trace 是 append-only 记录，无需迁移。
- 回归网：全量 `npm test`（2889）+ 文本锁测试（C1）必须全绿；锁测试断言 `allowNonceNormalization`/`receipt_binding_identity_autofilled` 在 engine 内消失，与 D3 互锁。
