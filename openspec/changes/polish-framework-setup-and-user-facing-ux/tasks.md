## 0. Installation Baseline Lock

- [ ] 0.1 验证 ACS-002：确认 `.nvmrc` 为 Node 20、`package.json` 声明 `zod`/`yaml`、`package-lock.json` 已 tracked、root README 含 `npm install`，且 `start-research.md` / `instantiate-run-bundle.md` 的前置条件可执行；将这些事实加入 `tests/engine/command-contract-docs.test.mjs`、同层 setup static test 或其他现有静态 regression，全部成立时不制造重复安装 diff。
- [ ] 0.2 验证 ACS-002：运行干净的 lockfile 安装/依赖加载检查（不新增依赖、不写 framework runtime state），确认当前安装 baseline 能加载 `zod` 与 `yaml`；记录可复现命令和 PASS 结果，若环境无法联网安装则用已提交 lockfile + installed dependency load check 明确说明验证边界。

## 1. Human Setup And Permission UX

- [ ] 1.1 实现 ACS-002：新增 root `SETUP.md` human-facing Source of Record，串起安装、Claude Code/Codex 权限准备、配置验证和 DPT trigger；明确 reviewed/interactive 与 autonomous-research opt-in、风险边界、最小能力类别、`dry-submit` 只做 work-unit submit 契约预检，以及不存在 gate `--non-interactive`。
- [ ] 1.2 实现 ACS-002：依据当前官方文档或已提交配置核实 Claude Code/Codex 项目/本地配置语法；文档不得复制 `.claude/settings.local.json`，不得静默扩大 `.codex/config.toml`，不得把 unrestricted/full-access/免审批配置写成无风险默认，并明确 workspace trust、组织/宿主策略或用户级配置可能覆盖项目配置。
- [ ] 1.3 实现 ACS-002：更新 root README，使安装命令保持短且在 framework trigger 前可发现 `SETUP.md`；更新 `DPT_FRAMEWORK/RUN.md`，只把权限写成 pre-trigger prerequisite/diagnostic pointer，读取 RUN 后不得要求用户成为 non-HITL pipeline co-runner。
- [ ] 1.4 验证 ACS-002：增加或扩展 `tests/` 下 Node static regression（优先 `tests/engine/command-contract-docs.test.mjs` 或同层 setup 文档测试），检查 setup 链接、Claude/Codex 双覆盖、风险与 opt-in 文案、配置验证、`dry-submit`/`--non-interactive` 边界，并确认 human permission setup 未进入 `DPT_FRAMEWORK/command_playbook/`。

## 2. Chinese-First User-Facing Surfaces

- [ ] 2.1 实现 HIU-004：在 `shared-agent-ux-guidance.md` 明确 HITL topic rewrite、topic preview、decision-brief summary、证据缺口、建议和确认等动态用户可见内容使用中文，同时保持 enum、路径、命令、字段名和来源标题 canonical form。
- [ ] 2.2 实现 CDP-004：在 `phase-final.md` 的合法 terminal delivery surface 增加极短 soft hint；用户未指定其他语言时，final report narrative 与 delivery summary prefer Chinese，且不得改变 Final entry/evidence、terminal、post-final HITL2 routing contract，或把 `final_delivery`/log/chat summary 写成 delivery authority。
- [ ] 2.3 实现 SWE-004：在 `shared-silent-execution.md` 增加 non-authorization guard，并移除或改写 §4 中允许用户主动消息后单轮状态回复/状态告知的旧许可；明确任何中文偏好都不授权 non-terminal `stop: no` 状态回复、进度回复、partial delivery、问题、approval request 或 acknowledgement。
- [ ] 2.4 验证 HIU-004、CDP-004、SWE-004：扩展 workflow/document static regression（优先现有 `tests/engine/static-regression.test.mjs`、`tests/engine/command-contract-docs.test.mjs` 或 `tests/integration/md/` 文档套件），确认三个提示位于实际加载 surface，且没有新增 locale/profile 字段、语言检测、silent reply permission、Final trace/delivery authority，也没有改写 wave/gate/routing instruction body。

## 3. Backlog And Version Closeout

- [ ] 3.1 收尾 ACS-002、HIU-004、CDP-004、SWE-004：实现与 focused/full regression 全部通过后，按现有 backlog done convention 归档或标记三份来源 plan：`ux-onboarding-install-setup.md`、`ux-coding-agent-permissions-setup.md`、`ux-user-facing-chinese-first-outside-waves.md`，并保留其被本 change 处理的可追踪说明。
- [ ] 3.2 实现 VEM-002、VEM-004：更新 `CHANGELOG.md`，新增 `v0.20` 条目，简述 pre-trigger setup/permission UX 与合法用户可见中文软提示，不 overclaim 宿主免审批或 LLM 语言服从度。
- [ ] 3.3 实现 VEM-003、RUE-001：同步 `DPT_FRAMEWORK/RUN.md` version banner 与 `v0.20` 最新 CHANGELOG 条目一致。

## 4. Verification And Governance

- [ ] 4.1 验证 ACS-002、HIU-004、CDP-004、SWE-004、VEM-003：运行新增/修改的 setup、command-surface、HITL、silent、Final 和 version focused tests，至少覆盖 `tests/engine/command-contract-docs.test.mjs`、`tests/engine/static-regression.test.mjs`、`tests/engine/version-management.test.mjs` 以及本 change 修改到的 `tests/integration/md/` 文件，必须全部 PASS。
- [ ] 4.2 验证 ACS-002、HIU-004、CDP-004、SWE-004：运行 `npm test` 全量回归，确认 Engine、gate、schema、transition、work-unit 与现有 command audience contract 无退化。
- [ ] 4.3 治理 ACS-002、HIU-004、CDP-004、SWE-004：核对 delta 与实现标注只复用已登记 requirement ID 后，运行 `node openspec/governance/check-project-reqs.mjs`，必须达到 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [ ] 4.4 治理 ACS-002、HIU-004、CDP-004、SWE-004：运行 `node openspec/governance/check-project-specs.mjs`，必须达到 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
