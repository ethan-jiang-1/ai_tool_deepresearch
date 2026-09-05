## 0. 反馈生命周期评审（openspec/operations/change-feedback-loop.md）

- [x] 0.1 openspec-feedback:plan-review 按 §Apply Review 对 proposal / delta specs / design / tasks 做 scoped 评审（整变更一致性 + 触及 surface 的风险；semantic-closure.yaml not_applicable reason 对实际 surface 成立）。评审结论：无未决 finding；已记录假设（dpt_disp_* 排除见 design D4）与 apply 动作（ACS-007/008 registry 登记见 1.1）
- [x] 0.2 openspec-feedback:closeout-review 按 §Closeout Review 对实际 diff 做 scoped 评审（change-scoped 边界 = 本 change 触及文件清单；delta/main 同步已重比对且保真；semantic-closure 重新评估仍 not_applicable；验证证据：validate --strict / --specs 全过、check-project-specs / check-project-reqs 全过、command-contract-docs.test 16/16、git diff --check 干净）。评审结论：无未决 finding

## 1. Requirement 登记与入口契约（修改 continue-run-bundle.md + 根 AGENTS.md）

- [x] 1.1 @impl ACS-005 在 `openspec/governance/req-registry.yaml` 的 agent-command-surface 节登记 ACS-007、ACS-008（append-only、只增不删、格式 `ACS-NNN: agent-command-surface — <description>`，与 ACS-006 先例一致）。验证：`node openspec/governance/check-project-reqs.mjs`（plan 模式）PASS，0 unregistered
- [x] 1.2 @impl ACS-005 修改 `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` Entry Selection (canonical)：intent 族扩为 continuation / inspection / maintenance-repair——修理意图走同一 same-root preflight（BUNDLE_ENTRY + BUNDLE_MAP）与同一 unsupported_current_entry_contract 停边界（不新增 stop 名），preflight 通过后路由到 `command_playbook/repair-run-bundle.md`；分类措辞标注为导航线索、Agent 拥有语义分类、含混先最小澄清。验证：`grep -c unsupported_current_entry_contract DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` 数量与修改前一致（无新 stop 名）；新增文本与 ACS-005 delta 一致
- [x] 1.3 @impl ACS-005 根 `AGENTS.md`：Execution Brief 入口表加"修 bundle / 数据修复 / gate 修复 / 残留清理"一行（打开 `command_playbook/repair-run-bundle.md` §0、完成 = 手册已在上下文、此刻不要按研究/续跑流程走、不手改 authority、不新建 bundle），Deep Research Routing 节补 repair 入口指针。验证：行存在且指向 `command_playbook/repair-run-bundle.md`；不引用 `_backlog/` 路径作为入口目标

## 2. 修理 playbook（新增 command_playbook/repair-run-bundle.md）

- [x] 2.1 @impl ACS-007 创建 `DEEP_RESEARCH_HARNESS/command_playbook/repair-run-bundle.md`，诊断优先结构：定位 bundle → 基线三命令（`node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <b>` / `validate-bundle.mjs <b>` / `inspect-bundle.mjs <b>`）→ 消费引擎 structured verdicts（audit closed outcomes / check-reentry root_findings / wave inspect hints[]）→ 合法修复操作（supersede / recover-* / apply / persist）→ 重跑同一 checkpoint；合法结论含"没坏 → 落回 continuation"；边界：missing_contract 停、修 ≠ 改研究语义（语义修正走 rerun）、dpt_disp_* 不修。验证：文件存在；含基线三命令全前缀与 missing_contract 边界表述
- [x] 2.2 @impl ACS-007 场景映射表以引擎 structured verdicts 为坐标（rule_id / repair_kind / write_to / near_matches）；任何具体 bundle 坐标仅作占位示例。验证：grep 确认无硬编码 bundle 坐标出现在非示例位；示例统一标注（示例）
- [x] 2.3 @impl ACS-007 契约细节改为引用：packet 模板 / canonical 文件名规则 / supplementary receipt set 等一律指向 `COMMANDS.md` Copyable Contract Templates 与 owner spec，playbook 内不复制第二真相源。验证：grep 确认 playbook 无内联模板 JSON（如 `"kind": "submitted_work"` 仅允许出现在引用说明中）
- [x] 2.4 @impl ACS-007 每个可执行命令串带全前缀 `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs <verb> ...`（复制即执行）。验证：grep 命令串均含全前缀
- [x] 2.5 @impl ACS-007 手工权宜步骤（seed 污染清理等）按 §6.4 短期合法条件撰写：用户明示 + `_tmp/` 备份 + `log-event` 审计留痕 + 标注 interim 及其 verb 候补（Change B–D）；不默认自授权。验证：grep 相关步骤含备份与 log-event 要求

## 3. COMMANDS.md 修理节

- [x] 3.1 @impl ACS-008 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 新增 Run-Bundle Repair 节：登记 `command_playbook/repair-run-bundle.md` 行 + repair 意图路由 aid（navigation only；示例词为导航线索；Agent 拥有分类；混合/含混最小澄清；不自动选路；与 post-final 迭代路由 aid 同姿态）。验证：节存在；audience statement 的三个稳定 marker 组完好（command-contract 回归 PASS）
- [x] 3.2 @impl ACS-008 路由 aid 内任何可执行命令串保持全前缀。验证：grep

## 4. 静态校验与回归

- [x] 4.1 @impl ACS-003 运行 `node --test tests/engine/command-contract-docs.test.mjs`，新 playbook 自动进入扫描面并 PASS；如必须加 allowlist，四要素齐全（file / phraseClass / allowedContext / reason）且默认不加。验证：测试 PASS
- [x] 4.2 运行 `openspec validate add-run-bundle-repair-playbook --strict` PASS，`git diff --check` 干净。验证：两者 PASS
- [x] 4.3 文档级确定性验证：重读 Entry Selection 全文，确认 repair 分支与 continuation/research 分支互不渗透（repair 不进入研究 flow；research 不进入 repair flow）。验证：重读确认并记录于 change

## 5. 收尾检查（归档前硬性 done condition）

- [x] 5.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change add-run-bundle-repair-playbook` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired；ACS-007/008 已由 1.1 登记，archive 后 main spec 声明 → alive identity）。验证：exit 0
- [x] 5.2 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。验证：exit 0
