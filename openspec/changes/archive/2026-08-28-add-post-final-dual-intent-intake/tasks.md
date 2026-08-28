# Tasks — add-post-final-dual-intent-intake

## 1. Plan Review（feedback lifecycle）

- [x] 1.1 `openspec-feedback:plan-review` 完成对 proposal/design/delta specs/tasks 的整体 plan review（对照 ACS-001..005、POF-001..004、CDP-003/004 既有契约确认无越界）；发现项以普通未完成 task 形式落回本清单后才进入 target edit。Done = 本 task 勾选且无未消化的 review finding task。（2026-08-28：polish 三轮 + operations/change-feedback-loop.md Apply Review 清单逐项核对，无 finding；semantic-closure not_applicable 理由对计划改动面成立。）

## 2. Requirement registry 直注册（SUD-008 先例：登记先于 target edit）

- [x] 2.1 在 `openspec/governance/req-registry.yaml` 直注册 ACS-006（`agent/agent-command-surface` 组）与 POF-005（`research/post-final-recovery` 组）——既有 live capability 新增 ID 走 registry 直注册，不用 reservation 文件。Done = 两个 ID 出现在 registry 对应组且格式与邻行一致。（2026-08-28 完成，plan 检查 669 registered / 0 orphan。）

## 3. Pre-edit plan 检查（apply guidance 要求）

- [x] 3.1 依序运行 `node openspec/governance/check-verification-routing.mjs --change add-post-final-dual-intent-intake --mode plan`、`node openspec/governance/check-semantic-closure.mjs --change add-post-final-dual-intent-intake --mode plan`、`node openspec/governance/check-project-reqs.mjs --mode plan`。Done = 三者均 PASS（registry 已含 ACS-006/POF-005，delta 声明各恰一次）。（2026-08-28：补建 verification-plan.yaml 后三项全 PASS。）

## 4. COMMANDS.md 意图路由映射（实现 ACS-006）

- [x] 4.1 在 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 的「Post-Final Rerun Recovery」节内增加意图→路由映射：evidence-expanding 措辞族（示例：再挖一轮/继续挖/rerun）→ `command_playbook/post-final-recovery.md`；presentation 措辞族（示例：整理/重写/自包含版/换个读者版）→ `workflows/nodes/phases/phase-final.md` 就地 refinement + `persist-artifact` 发布路径；混合/含混措辞指向既有 Agent-owned 语义分类边界与最小澄清规则。Done = 映射文本落盘且覆盖 ACS-006 四个场景的文本义务（两族各达既有路由、混合不自动选路、navigation-only 声明）。
- [x] 4.2 核对新增文本不复制命令行、不含 drift phrase（对照 `tests/engine/command-contract-docs.test.mjs` PHRASE_CLASSES）、不改动 ACS-001 受众声明与三组 helper marker。Done = ACS-003 所属 command-contract 文档回归零新失败。

## 5. post-final-recovery.md intake 小节（实现 POF-005）

- [x] 5.1 在 `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md` §2 之前新增编号节 "Intake from a dig list"：读 `_diagnostics/` 最新 next-dig-list → 按其优先级层提出 bounded scope 建议 → 用户经既有修正步定稿 → 选中条目 id 写进现有 `requested_scope`/`reason` 字符串 → 清单自带的死坑条目默认排除（显式用户决定可重开）→ 清单为 non-authority 输入、无清单时既有普通请求契约不变。Done = 小节落盘且覆盖 POF-005 四个场景的文本义务。

## 6. Doc-lock 测试、main spec 同步与回归验证

- [x] 6.1 新增 `tests/engine/post-final-intent-intake-docs.test.mjs`（verification-plan 三个 unit claim 的资产）：静态断言 COMMANDS.md 的意图路由映射（两族→既有路由、混合→既有分类边界、navigation-only）与 post-final-recovery.md 的 "Intake From A Dig List" 节（最新清单/分层 scope/用户修正/条目 id 进现有字段/死坑默认排除/non-authority/无清单契约不变）存在。Done = `node --test tests/engine/post-final-intent-intake-docs.test.mjs` 通过。
- [x] 6.2 把两个 ADDED requirement 全文同步进对应 main spec：`openspec/specs/agent/agent-command-surface/spec.md` 追加 ACS-006 requirement 并把 `> req:` 头补上 ACS-006；`openspec/specs/research/post-final-recovery/spec.md` 追加 POF-005 requirement 并把 `> req:` 头补上 POF-005。Done = main spec 包含与 delta 一致的 requirement 全文与场景，且 `node openspec/governance/check-project-specs.mjs` 零 deltaHeaderInMain。
- [x] 6.3 运行 ACS-003 静态校验所属回归面（`node --test tests/engine/command-contract-docs.test.mjs`）与 `openspec validate "add-post-final-dual-intent-intake" --strict`。Done = 两者均零失败。

## 7. Closeout Review（feedback lifecycle）

- [x] 7.1 `openspec-feedback:closeout-review` 完成对实际改动的 closeout review（对照 ACS-006/POF-005 场景逐条核对两文件文本、确认 semantic-closure.yaml 的 not_applicable 理由对实际改动面仍成立、delta/main 同步一致）；发现项以普通未完成 task 落回本清单。Done = 本 task 勾选且无未消化的 closeout finding task。

## 8. 归档前硬性收尾检查

- [x] 8.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change add-post-final-dual-intent-intake` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 8.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
