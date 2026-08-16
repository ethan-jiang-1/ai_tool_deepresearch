---
title: Guidance Drift Cleanup + Machine Guards
status: active
created: 2026-08-16
changes:
  - repair-current-guidance-contract-drift
  - make-work-unit-recovery-feedback-direct
  - add-doc-code-drift-guards
  - dedup-phase-closure-loading (deferred)
---

# Guidance Drift Cleanup + Machine Guards

## Background

2026-08-16 的四路深挖结论(证据全文一份:
[`cleanup-effect-verification.md`](cleanup-effect-verification.md)——Part I
(§1-6) = 历史失败模式 FM-1/2/3 + 当前树判定;Part II(§7-13)= 恢复指令↔代码
对照 M1-M10、权威分层漂移 B1-B5、路由热点 H1-H8、第一手核验清单、修复映射、
不变量候选与 reentry 追加发现):历史上
"agent 老是做不对"来自三个复发失败模式——spec/指引与代码漂移(FM-1/FM-2)、
状态真相过期(FM-3),以及"治理全靠 prose + 自守,checker 只活在 OpenSpec
流程内部、无任何强制执行"。FM-3 已被之前的清理结构性修好;本 plan 收敛
FM-1/FM-2 的剩余部分与执行器缺口,用**尽量少的 OpenSpec change**:三个
主 change + 一个 deferred。

## 执行上下文(新 session 起手必读)

本文件是被用户**显式选中**的计划入口(仓库规则:未经显式指定不读
`_backlog/`;用户在新 session 里点名本文件即视为显式选择)。接手顺序:

1. 先读 `openspec/constitution/project-charter.md` + 根 `CONTEXT.md`(仓库强制预读)。
2. 读证据文件 [`cleanup-effect-verification.md`](cleanup-effect-verification.md)
   全文(Part I/II),**不要跳过**:M/B/H 编号是下面 change 的直接依据,
   所有 file:line 已经核验过,不需要重新推导(§13 嵌套审计项除外,须先复核)。
3. 按 "## 顺序与依赖" 逐个 change 执行,每个 change 严格走
   `openspec/changes/` 生命周期:**propose → polish(/polish-openspec-change,
   至少两轮:Pass 1 整体一致性 + 至少一轮 risk-led,直到 `ready for apply`
   且 `openspec validate --strict` + `git diff --check` 通过)→ apply →
   archive**,目标文件在 `/opsx:apply` 前保持不动。
4. Tracking:每个 change 的 `- [ ]` 检查项勾选进度并更新本文件;change 归档后
   在 `_backlog/plans/README.md` 的活跃列表更新本 plan 状态;全部归档后按
   README 的关闭流程 `git mv` 到 `_backlog/_done/_closed_plans/`。
5. 如果某项证据与当前树不符(后续提交可能已改),以当前树为准,并把差异
   写回证据文件对应的行——不要带着过期 file:line 继续执行。

## Change 拆分

### C1 `repair-current-guidance-contract-drift`(纯事实校准,无 Engine 行为变化)

把已逐条核验的漂移一次修掉。全部是"让文档说真话",不是加规则
(逐条依据 = 证据文件 B1-B5、H1/H4/H5/H6 + 第一手核验清单):

- 停止授权真相:`DEEP_RESEARCH_HARNESS/README.md:138` 与
  `openspec/guidance/models/agentic-queue-mechanism.md:234` 改为指向枚举为
  唯一真相(`queue-manager-core.mjs:57`),写明 `final_delivery` /
  `decision_blocker` 是保留值、无代码写入。
- `RUN.md:32` submit 措辞:同 hash 重复 submit 是幂等成功
  (`delegated-work-units/spec.md:545`),只有不同内容重复才拒绝。
- `COMMANDS.md:55` 已记录在案的 exit-code 漂移:决定方向(代码补 exit 2,
  或改 header),补回归测试锁定。
- `AGENTS.md:58` / `CLAUDE.md:58` 的 `tests/engine/, tests/engine/` typo;
  并加一条 AGENTS≡CLAUDE(除标题行)同步守卫测试——根对与 harness 对各一条。
- skill 死路径:`.agents/skills/source-command-opsx-{apply,archive}/SKILL.md`
  的 `guidelines/change-feedback-loop.md` → `openspec/operations/change-feedback-loop.md`;
  同一操作的两套 skill(`openspec-*` vs `source-command-opsx-*`)写明分工指向。
- `CONTEXT.md` 术语补全:`hints[]`、`repair_kind`、三坐标模型
  (`repo_command_root` / `framework_root` / `current_run_bundle_root`),
  并把 "Gate" 一行指向 `framework-runtime-boundary.md` 的五面表。
- 入口选择规则单一源化(H1/H5):完整规则只留
  `command_playbook/continue-run-bundle.md`,其余 6-8 个 surface 改为指针,
  消除 README↔RUN↔COMMANDS 环形路由。
- read-only 双规则(B3)、Final "deliver-first interactive"(B4)等措辞对齐。
- reentry 面追加(证据 §13):RA-M1(HITL1 search policy spec 文本)、
  RA-M2(RRD-008 vs POF-001 优先级冲突——propose 时决定真相 spec 并让对侧
  指向它)、RA-M4(`persist-final-report` 补进 COMMANDS.md)、RA-L1(命令带全
  可执行前缀)。RA-L5 不改。
- 新增"不变量简报":约 15 条可机器验证的不变事实,作为新 agent onboarding
  基线(AGENTS.md 首屏引用,其余 lazy-load)。

### C2 `make-work-unit-recovery-feedback-direct`(Engine 行为)

让反馈自带下一步,消除暗号与猜测(逐条依据 = 证据文件 M1-M10 +
恢复面心智模型一行版):

- 反馈面统一:五个反馈面(submit 拒绝 / late-submit 拒绝 / transaction 阻塞 /
  dry-submit / inspect)全部发出同一形状的 `attempt_disposition` + `next`。
- `repair_kind` 值改为 CLI 动词拼写(或反馈额外携带 exact 命令串),消灭
  下划线↔连字符暗号。
- `supersede` 返回把 `tx_id` / `successor_queue_item_id` 提到顶层(或
  RUN.md 写清嵌套——倾向代码侧压平,读者面更便宜)。
- `RUN.md:36-38` 恢复段改写为一张"被测试锁定"的决策表(disposition →
  发出面 → repair_kind → CLI 动词 → 重跑什么),测试断言每个 engine 侧的
  `repair_kind` 都有表行和匹配 CLI 动词。
- reentry 投影真话候选(证据 §13,propose 时确认行为 vs 文档后纳入):
  RA-M3(blocked 必须投影为 blocked,不得落入 `blocker: null` 的 reachable)、
  RA-M5(legacy load 识别:实现检测,或把 spec 保证收窄到 post-0edb58310 load
  并记录迁移边界——propose 时二选一)、
  RA-L2(sweep advice 不得对 primary workspace 说 retry persist)、
  RA-L3(`--feature` 在 persist 面要么生效要么显式拒绝)、
  RA-L4(delivery-pending 与 refinement 在投影中可区分)。
- 配套 spec deltas:`engine/check-inspect-feedback`、
  `agent/delegated-work-units`。

### C3 `add-doc-code-drift-guards`(governance + verification)

把"人肉审计"变成"永久检查",并解决执行器缺口(逐条依据 = 证据文件
H2/H8 + 第一手核验清单中的无 CI/hook 验证):

- 内容漂移检查器:校验 guidance/spec 散文中的路径、CLI 名、exit code、
  gate 规则清单与代码一致(把 spec-reality-sync 永久化;exit-code inventory
  测试已有胚胎,扩展它)。
- propose 链减税:req-registry(963 行)从"通读"改为"按新 capability 前缀
  查询",`check-project-reqs` 加 `--check-prefix` 支持。
- 接线决定项:本地 git pre-commit hook(跑 check-project-specs /
  check-project-reqs / verification-routing / semantic-closure + AGENTS≡CLAUDE
  守卫)。注意 `semantic-fact-closure-openspec-governance` plan 记过"CI
  明确不在范围内"——本项只做本地 hook、不做远程 CI;是否落地在该 change
  propose 时作一个明确决定项。

### C4 `dedup-phase-closure-loading`(deferred,独立触发)

共享文件(shared-profile/schemas/silent-execution 等)每 phase 重注入,
一整轮约 2,600 行重复散文(证据文件 H7)。收益是上下文效率,不影响正确性。
触发条件:一次真实 run 的上下文成本观察,或用户明确要求压上下文;否则保持
deferred。

## Progress TODO

### C1 — repair-current-guidance-contract-drift ✅

- [x] propose:语义反思 + 简洁准入两问 + delta specs(涉及
  bundle/run-entry、agent/agent-command-surface、agent/agent-context-routing、
  governance/guidance-constitution;实做 7 个 delta——另含 workflow-node-contract、
  runtime-reentry-debuggability、cli-exit-code-conventions)
- [x] polish:/polish-openspec-change,至少两轮(Pass 1 整体一致性 + 至少一轮
  risk-led),直到 `ready for apply`(`openspec validate --strict` +
  `git diff --check` 通过);发现的产品/范围决策升级给用户,不自行猜
- [x] design review:三原则审查(尤其"删除比增加多")
- [x] verification-plan.yaml:四类 test class 声明,含 AGENTS≡CLAUDE 守卫
  (integration)与 skill 路径存在性检查
- [x] apply:目标文件全部校准(README:138 / RUN.md:32 / COMMANDS.md:55
  方向决定 / typo / skill 路径 / CONTEXT / 入口单一源 / 不变量简报)
- [x] exit-code 方向决定落地 + 回归锁定(用户拍板:代码补 exit 2)
- [x] reentry 面校准(证据 §13):RA-M2 决定真相 spec 并收敛对侧(用户拍板:
  POF-001 为真相,RRD-008 对齐);RA-M1/RA-M4/RA-L1 文档校准;RA-L5 不改
- [x] npm test 相关子集绿(tests/integration/md/ 340/340 + exit-code inventory
  32/32 + command-contract-docs 16/16 + static-regression + reentry/persistence)
- [x] archive:finalizer 全绿,归档为 `2026-08-16-repair-current-guidance-contract-drift`;plan 关闭时统一登记 CLS 编号

### C2 — make-work-unit-recovery-feedback-direct ✅

- [x] propose:语义反思 + 简洁准入两问(对照 simple-reliable-control 的
  "quality control 比被校验的工作简单");RA-M5/RA-L3 两个方向决定已升级用户
  并拍板(RA-M5=收窄 spec 保证到 post-0edb58310 + 记录迁移边界,不做 legacy
  兼容;RA-L3=严格拒绝 `--feature` + 错误提示正确操作)
- [x] polish:/polish-openspec-change,三轮(Pass 1 整体一致性 + Pass 2 risk-led:
  枚举 engine 全域 repair_kind 12 值,CLI-动词规则收敛到 attempt-owned 恢复面,
  避免全仓词汇重命名;Pass 3 全绿),直到 `ready for apply`
- [x] design review:反馈形状与向后兼容边界(旧字段保留/迁移路径)
- [x] verification-plan.yaml:unit(repair_kind↔CLI 动词映射、journal 枚举、
  supersede 顶层、blocked 投影)+ integration(五面形状一致、`--feature` 拒绝、
  reentry 投影)+ deterministic_e2e(恢复链:busy→wait→rerun、
  suspect→recover-transaction→rerun、supersede→successor、late-submit)
- [x] apply:engine 五面统一(submit/late-submit 拒绝面补 attempt_disposition;
  dry-submit/inspect 已有;transaction 面补 next)+ repair_kind 对齐(连字符)+
  supersede 压平(`tx_id`/`successor_queue_item_id` 顶层)
- [x] RA-M3/RA-M5/RA-L2/RA-L3/RA-L4 候选复核:RA-M3(blocked 不得投影为
  reachable)、RA-L2(sweep advice 按 workspace 区分)、RA-L4(delivery-pending vs
  refinement 投影区分,`delivery_stage` 字段)确认为行为修复纳入;RA-M5 spec
  收窄 + 诚实边界错误信息;RA-L5 不改
- [x] apply:RUN.md 决策表(disposition → repair_kind → CLI 动词 → 重跑)+
  表↔代码锁定测试(`tests/engine/work-unit-recovery-decision-table.test.mjs`,
  3/3)
- [x] npm test 相关子集绿(tests/engine/work-unit-* 202/202、CLI 子集 95/95、
  e2e 65/65 含新增恢复链、md 340/340)
- [x] archive:finalizer 全绿,归档为 `2026-08-16-make-work-unit-recovery-feedback-direct`;
  semantic-closure consumers 角色复核(RUN.md/persist-artifact.md → overlap:
  derived;verdict consumer 只留测试/CLI)

### C3 — add-doc-code-drift-guards ✅

- [x] propose:内容漂移检查器范围(路径/CLI 名/exit code/gate 清单);hook 决定项
  升级用户并拍板 = **不做 hook,只交付 checker**(远程 CI 沿用既有边界)
- [x] polish:/polish-openspec-change,两轮;Pass 2 用原型扫描真实文档——24 个
  "缺失"引用分诊:glob/锚点/能力路径跳过,`CHANGELOG.md`/`new-disposable-bundle`
  确认为刻意否定引用 → checker 规则增加 negative/placement allowlist
- [x] design review:hook 接线决定项闭环(不做;不写脚本、不设 core.hooksPath)
- [x] verification-plan.yaml:unit(checker 规则 truth table)+ integration
  (真实文档零漂移、`--check-prefix`、exit-code 静态扫描)
- [x] apply:checker 实现(`openspec/governance/check-content-drift.mjs`,383 条
  引用零报错;gate 覆盖修复:shared-gate-rules 补 `rerun-ready` 表行)+
  req-registry 前缀查询(`--check-prefix <ABC>`)+ 无 hook
- [x] apply:finalizer 串入新 checker(content_drift 检查,12 项检查全过)
- [x] npm test 全量绿(governance unit 37、governance integration 35、
  exit-code 33、md 340、finalizer 单测 9)
- [x] archive:finalizer 全绿,归档为 `2026-08-16-add-doc-code-drift-guards`

### C4 — dedup-phase-closure-loading(deferred)

- [ ] 触发条件未满足:保持 deferred,本 plan 不主动开工

## 顺序与依赖

```text
C1(散文校准,先让文档说真话)
  → C2(Engine 反馈直达,散文随之变为被锁定的决策表)
    → C3(守卫:漂移清零后 checker 才绿;hook 决定项独立)
C4: deferred,无依赖
```

C1/C2 有轻微交叠(RUN.md 恢复段):C1 只把该段改成"准确描述现状"的最简
形式,C2 落地后同一测试文件更新为锁定新形状——避免 C1 承担 Engine 行为。

## Non-Goals

- 不做 Engine/workflow boundary hooks(`todo-hooks-deferral` 继续延后)。
- 不做远程 CI(沿用 `semantic-fact-closure-openspec-governance` 的边界;
  只有 C3 的本地 pre-commit 决定项可触及)。
- 不新增 lifecycle state、Gate、controller、平行路径。
- 不把两套 opsx skill 合并为一个(只写明分工指向)。

## Re-entry

通过各 change 自己的 proposal/design/tasks/verification-plan 续跑;本文件
只跟踪分组、顺序与检查项。目标文件在 `/opsx:apply` 前保持不动。
接手与 tracking 约定见上方 "## 执行上下文(新 session 起手必读)"。
