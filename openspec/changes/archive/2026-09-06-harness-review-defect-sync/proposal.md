# harness-review-defect-sync

## Why

对 2026-09-01..09-06 仓促推进批次（55 commits）的代码与文档评审坐实了一组具体缺陷：两处引擎行为与文档/提交信息承诺不符（retire-final-version 在返回 blocked 前已突变文件系统；"human-controlled" 守卫在唯一 CLI 入口永远不可触发）、两份手工拷贝的 Progress block 解析器已产生行为漂移、tamper 证据窗口信任宿主文件中未校验的 spawn 时间戳、以及导向层（CONTEXT.md / invariants-brief）与 2026-09-06 已接受的 spec 出现三处失同步。这些缺陷会直接误导下一个在本仓库动手的 coding agent。来源：2026-09-06/07 评审记录（本会话四路评审 + 第一手核实），缺陷坐标见 design.md。

## What Changes

- **retire-final-version 修复（引擎行为与文档承诺对齐）**：
  - 将 aux 目录碰撞等全部 pre-check 移到第一次 `renameSync` 之前——blocked verdict 一律代表"零突变"（当前 `DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs:1505-1519` 先 rename 再可能返回 blocked）。
  - "human-controlled" 落为机制：CLI `retire-final-version` 新增必填 `--user-confirmation "<用户原话>"`；缺失或为空 → invocation error（exit 2，不进入引擎）。引擎侧 `retireFinalVersion` 增加 `userConfirmation` 入参并与 `requestedBy === 'user'` 联合校验；启用从未被 parse 的 `RetireFinalVersionRequestSchema`。
- **Progress block 解析器合一**：`gate-helpers-plan-progress.mjs`（writer）与 `phase-status-audit.mjs`（auditor）各自手写的 `parseProgressBlocks` 收敛为一个共享模块；auditor 的 fail-closed（unparseable header）语义成为唯一实现；writer 不再各自维护第二份 block 归属逻辑。
- **spawn 时间戳 fail-closed**：cycle block header 的 `spawned <ts>` 捕获从裸 `(.+)` 收紧为 canonical Engine 写出格式（ISO-8601 Zulu）；格式非法按既有 `plan_progress_tamper_suspected` fail-closed 处理；窗口比较从词法字符串比较改为解析后比较。
- **aux 目录语法单一真相源**：`final-delivery-backing.mjs`（3 处）与 `artifact-persistence.mjs`（1 处）中重复的 `final/final[_feature]_v<N>/` 语法正则抽为一个共享导出常量（含组合后的 terminator 变体），并注释说明 terminator 差异是有意的（primary `.md` target vs 目录内 backing path）。行为不变。
- **canon-sync pass（导向层拉回与 accepted spec 一致）**：
  - `CONTEXT.md:92` Final 行"追加版本"改为与 `openspec/specs/research/content-delivery-phase-content/spec.md`（presentation polish 不分配新版本）一致的表述；
  - `CONTEXT.md` 删除 `WorkerFallback` 词条（全仓库死指针，:64 与 :97 两处）；
  - `openspec/guidance/models/invariants-brief.md` 第 5 条真相源改指 `openspec/specs/agent/work-unit-submission/spec.md`；第 7 条幽灵字段 `resolution_owner` 改为实际存在的 `repair_kind`（`GATE_REPAIR_KINDS`）；
  - `openspec/specs/research/research-wave-gate-implementation/spec.md:60-61` 重复烂句修复（去重 + 补回被吞的句首，无语义变化）；
  - `CONTEXT.md:18` ADR 行补上 `docs/adr/0004`、`0005`。
- **两个小补**：
  - `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` Reload 步骤 6 补一句 `reconcile-plan-progress.mjs` 指针（该节已声明 Progress 勾选是 presentation，但未指名重建命令）；
  - `tests/engine/final-delivery-backing.test.mjs:74` 的析取断言收窄为精确错误码（拆成 missing 与 non-aux-existing 两个用例），使 `final_output_not_backing` 守卫真正被 pin。

**不产出**：不改变任何研究语义、gate 语义、版本分配规则、Final 交互节奏；不新增 CLI 动词；不引入 CI/hooks/新检查器；不改 `final-delivery-backing` admission 行为与 grammar 本身。

## Capabilities

### New Capabilities

（无——全部为既有 capability 内的缺陷修复与措辞同步。）

### Modified Capabilities

- `bundle/artifact-persistence-recovery`：retire-final-version 要求修订——(a) blocked verdict SHALL 先于任何文件系统突变完成全部 pre-check；(b) human-controlled SHALL 由显式 `--user-confirmation` 机制承载（缺失即 invocation error），request schema SHALL 在引擎入口被校验。
- `research/plan-hostfile-sections`：PHS-010 修订——cycle block spawn 时间戳 SHALL 为 Engine 写出的 canonical Zulu 格式，malformed 视同 manual interference fail-closed（`plan_progress_tamper_suspected`）；witness 窗口比较 SHALL 基于解析后的时间戳。解析器实现 SHALL 单一（writer 与 auditor 共享同一 block 归属判定）。
- `research/research-wave-gate-implementation`：Wave1 complete gate rule set 要求正文措辞修复（去除重复句、恢复断裂句），无可观察行为变化。

## Impact

- 代码：`DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs`、`gate-helpers-plan-progress.mjs`、`phase-status-audit.mjs`、`final-delivery-backing.mjs`、新增共享模块（progress blocks 解析 + aux grammar 常量）、`DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs`。
- 文档：`CONTEXT.md`、`openspec/guidance/models/invariants-brief.md`、`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`、`DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md`、`DEEP_RESEARCH_HARNESS/COMMANDS.md`（retire 用法补 `--user-confirmation`）。
- 测试：retire 相关（blocked 零突变、确认缺失 exit 2）、audit-integrity（malformed spawnTs fail-closed）、plan-progress writer/auditor 共享解析、final-delivery-backing 断言收窄；被编辑文档的 doc-lock / gate 测试配对更新（`tests/governance/feedback-vocabulary-gate.test.mjs`、`tests/engine/setup-preflight-docs.test.mjs` 不涉及；涉及 `tests/integration/md/continue-run-bundle-contract.test.mjs` 等，以实际 grep 为准）。
- 兼容性：`retire-final-version` CLI 面新增必填参数属于**BREAKING**（既有调用形态不再被接受）；其他行为对合法输入不变。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/artifact-persistence-recovery` | main spec retire 段（:239 起，:262-278 human-controlled 条款与 :350-352 Scenario）+ `artifact-persistence.mjs:1465-1522` + `cli/operate-artifact-persistence.mjs:176-199` | Modify | blocked-after-mutation 与 vacuous guard 是该 capability 已接受要求的实现缺陷，需修订要求文本 |
| `research/plan-hostfile-sections` | main spec PHS-010（:346-352）+ 两份 parser 拷贝 + `phase-status-audit.mjs:220-245` | Modify | spawn 时间戳 fail-closed 与单一解析器是对 PHS-010 witness 规则的修订 |
| `research/research-wave-gate-implementation` | main spec :19 起要求正文 :59-63（重复烂句，b1377f781 引入） | Modify | 仅措辞修复，无行为变化；delta 记录修复后正文 |
| `research/final-delivery-backing` | main spec :86-87 grammar 文字版 + `final-delivery-backing.mjs:244/451/457` | Verify-only | grammar 语义不变，仅代码内单一真相源与测试断言收窄；无要求级变化 |
| `bundle/run-entry` | main spec 全文 grep（无 Reload 步骤/audit/reconcile 内容）+ `continue-run-bundle.md:79-87` | Excluded | Reload 步骤 6 的 reconcile 指针是 playbook 导航层补充，spec 未 pin 该步骤内容，无要求级变化 |
| `research/post-final-recovery` | `CONTEXT.md:92` 与 `content-delivery-phase-content/spec.md:519` 对照 | Excluded | canon-sync 只改 guidance（CONTEXT.md / invariants-brief），owner spec（含 post-final-recovery、content-delivery-phase-content 等 canon 涉及 spec）均不动 |
