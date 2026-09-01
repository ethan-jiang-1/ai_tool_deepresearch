# Tasks: lock-closed-vocabularies-and-clear-residue

- [x] 0.1 openspec-feedback:plan-review —— 首次 target edit 前完成 `/polish-openspec-change` 打磨（≥2 passes + validate --strict + diff --check）。Done condition 达成（2026-08-31）：validate --strict 绿、三查 PASS（修复 claim.2 枚举值后）、Pass 1-2 无修改需要。
- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成（2026-08-31）：实际 diff 复核（8 个 engine/schema 文件 + 4 个测试文件 + 新 checker + change 工件）；全量 npm test 2903/2903；governance 17 项含新 checker 全 PASS；死代码三 token 全仓零命中；`actor_guidance` 改名面零 spec/测试旧引用残留；无 open finding。

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`、`check-semantic-closure.mjs --change <name> --mode plan`、`check-verification-routing.mjs --change <name> --mode plan`。Done condition 达成（2026-08-31）：三查 PASS。
- [x] 1.2 运行基线：`npm test` 全绿记录（2889）与 `git status` 干净确认。Done condition 达成（2026-08-31）：2889 基线在案、工作区仅 change 工件。

## 2. 词汇锁（disposition + candidate 提升）

- [x] 2.1 `DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs`：新增 `export const WORK_UNIT_ATTEMPT_DISPOSITIONS = Object.freeze(['unsupported_current_contract','not_submitted','historical','unresolved','current'])` 与 `export const WorkUnitAttemptDispositionSchema = z.enum(WORK_UNIT_ATTEMPT_DISPOSITIONS)`（gate-definition 模式）。Done condition 达成（2026-08-31）：五值输出验证。
- [x] 2.2 同文件：`WorkUnitCandidateProjectionSchema.recommended_action` 改由提升导出的 `WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS = Object.freeze([...5 值...])` 喂 `z.enum(...)`。Done condition 达成（2026-08-31）：`WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS.options` 语义经 checker fixture pin 验证。
- [x] 2.3 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs`：re-export 两者 + `WORK_UNIT_ATTEMPT_DISPOSITION` frozen key-map + 头注释更新。Done condition 达成（2026-08-31）：三导出 import 验证。
- [x] 2.4 `DEEP_RESEARCH_HARNESS/engine/work-unit-attempt-disposition.mjs`：7 处内联字面量（:45,69,76,83,96,103,110 区域）改 `WORK_UNIT_ATTEMPT_DISPOSITION.*`。Done condition 达成（2026-08-31）：零裸字面量 + attempt-disposition/actor/terminal 测试绿。

## 3. 死代码清除（B1/B2）

- [x] 3.1 `work-unit-validation.mjs`：删 receipt 侧 autofill 簇（identity fill loop、`receipt_binding_identity_autofilled` 记录块）与 receipt nonce normalize 分支；删 result 侧 nonce normalize 分支（`hasCompleteBinding`/`insideAssignedDir` 仅喂死分支的计算一并清理）；`validateSubmitRuntimeReceipt` 签名删 `allowNonceNormalization`。Done condition 达成（2026-08-31）：三 token 引擎全域零命中（submit.mjs:732 第四处调用点一并清理）；strict throw 与 schema-version fill 保留。
- [x] 3.2 删参数穿透：`work-unit-submit.mjs` 两处调用点、`work-unit-supersession.mjs` 一处。Done condition 达成（2026-08-31）：零命中；锁测试新增引擎源断言。
- [x] 3.3 A7 文案：`work-unit-submit.mjs` recover-declaration 未提交拒绝 `write_to` 补点名 submit/late-submit/new-attempt 边界。Done condition 达成（2026-08-31）：文案点名 submit/late-submit/new-attempt 边界；锁测试断言。

## 4. preflight 字段补齐（B3/A6）

- [x] 4.1 `work-unit-lifecycle.mjs` `forcedTimeoutAudit` 加 `preflight_candidate_projection: timeoutPreflight?.candidate_projection ?? null`。Done condition 达成（2026-08-31）：terminal 测试 21/21（null 例 + deep-equality 例 + trace 携带）；integration mirror 由 verification-plan claims.2 的 integration asset 承接（operate-work-unit CLI timeout 场景既有断言面）。

## 5. actor_guidance 改名（B4）

- [x] 5.1 `work-unit-actor.mjs` `evaluateActorDecision` 8 处 `recommended_action:` → `actor_guidance:`；`work-unit-lifecycle.mjs` :656/:676/:713 消费点同步（含 malformed 分支变量名与 actor_preflight 内嵌字段）。Done condition 达成（2026-08-31）：actor 8 处 + lifecycle 5 处改名，timeout 字段未动；actor/terminal 测试绿。
- [x] 5.2 新增回归断言：claim no-claim 结果带非空 `actor_guidance` 且无顶层 `recommended_action` key。Done condition 达成（2026-08-31）：新增回归用例绿。

## 6. 治理 checker（Q4）

- [x] 6.1 新增 `openspec/governance/check-spec-enum-restatements.mjs`（Q4 设计全文：静态 import 七集 + fail-closed derive + 子集 fixture pin + 反引号/≥2 成员/主导集/邻接闭合提示/无 hedge 启发式；扫描 openspec/specs+guidance）。Done condition 达成（2026-08-31）：实测定标三轮修正后 0 FAIL 0 误报（修复：精确成员匹配、共享 token 豁免、复合 token 触发、句级切分）；自检 7/7。
- [x] 6.2 运行 `npm run governance:check`（check-all 自动发现，16→17）。Done condition 达成（2026-08-31）：17 项含新 checker 全 PASS。

## 7. 回归与收尾

- [x] 7.1 全量 `npm test`。Done condition 达成（2026-08-31）：2903/2903 exit 0。
- [x] 7.2 `node openspec/governance/check-project-reqs.mjs --mode archive --change <name>` 与 `check-project-specs.mjs` PASS。Done condition 达成（2026-08-31）：exit 0。
- [x] 7.3 归档转场与提交：本勾选表示 §1–§6 全部就绪；勾选后立即执行 `node openspec/governance/finalize-change-archive.mjs --change 2026-08-31-lock-closed-vocabularies-and-clear-residue`（唯一归档转场）与 git commit（引擎/schema + 测试 + 新 checker + change 工件一个提交），执行结果以归档后的 change 目录与提交哈希为证；快照 Post-C2 追加至 plan §10。
