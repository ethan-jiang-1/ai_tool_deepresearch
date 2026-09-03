# Tasks: bundle-isolation-and-creation-consent

## 1. 创建器 sibling 预检（CMI-010）

- [ ] 1.1 在 `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs` argv 解析中新增 `--acknowledge-existing-bundle <name>`（至多一次），实现 CMI-008 同型的解析失败路径（未知/重复/缺值在文件系统副作用前报错），验证：`tests/engine/` 新增 unit 覆盖合法/非法 argv 形态并全部通过
- [ ] 1.2 实现纯函数 sibling 预检：readdir 目标目录过滤 `dpt_rb_*`，前缀相似判定 + sibling `rb_status.json` Final 判定（读取失败视为非 Final，fail-closed），验证：unit 测试覆盖前缀命中（`x` vs `x-v2`）、非 Final 命中、Final sibling 不触发、无 sibling 直接放行
- [ ] 1.3 接线：预检失败 → 非零退出 + 单条诊断（sibling 名、状态、consent 路径 `--acknowledge-existing-bundle`）；ack 有效 → 既有成功创建行为不变；验证：`tests/integration/cli/` 用临时 target-dir 场景测试拒绝、ack 放行、ack 指向非 flagged sibling 拒绝，全部通过

## 2. 跨 bundle 引用内容诊断（BUI-003）

- [ ] 2.1 新增 `DEEP_RESEARCH_HARNESS/engine/helpers/cross-bundle-reference-scan.mjs`：扫描 `rb_plan.md`、`seed_topics/`、`artifacts/`、`reference/`、`final/` 中 `dpt_rb_[a-z0-9][a-z0-9-]*` token（排除本 bundle 自身名），输出 `{file, citedBundle}` 列表，验证：unit 测试覆盖命中、自身名排除、多文件聚合
- [ ] 2.2 `inspect-bundle.mjs` 接入扫描结果，按 BUI-002 既有 cleanup/blocker 分级报告 bundle isolation diagnostic，验证：integration 测试对含 `dpt_rb_chinese-ai-inference-chips-vs-nvidia/final/final_v7.md` 引用的 fixture bundle 产出命名文件与 cited bundle 的诊断
- [ ] 2.3 `audit-phase-status.mjs`（经其委托的 `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs`，harden-wave1 归档后的当前结构）接入同一扫描模块（不重复实现），验证：integration 测试确认 audit 报告包含同一 diagnostic 且不改变其余 audit 输出

## 3. Playbook 文本改写

- [ ] 3.1 `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`：删除"collision-safe 名称后重试"条款，替换为 stop-and-ask（呈现 sibling 局面与三个合法去向：继续 / accepted recovery reopen / 用户同意后带 ack 新建），验证：文本 grep 无 collision-safe 重试措辞，且与 CMI-010 spec 场景一致
- [ ] 3.2 `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` Entry Selection 节补一句同向指针（创建同意由 CMI-010 拥有），不重述规则，验证：该节仍保持 single canonical statement 结构，只新增指针句

## 4. 端到端与收尾

- [ ] 4.1 `tests/integration/cli/` 端到端：临时目录中先建 bundle A（模拟非 Final），再尝试 instantiate `A-v2` → 拒绝；带 `--acknowledge-existing-bundle A` → 成功且 bundle 内无 ack 痕迹（非 durable state），验证：测试通过且 exit code 符合 cli-exit-code-conventions
- [ ] 4.2 运行 `node openspec/governance/check-project-reqs.mjs --mode plan` 与 `node openspec/governance/check-semantic-closure.mjs --change bundle-isolation-and-creation-consent --mode plan`，验证：两者对 plan 模式输出无未解决冲突；BUI-003/CMI-010 不与 live registry 或其他 active change 冲突
