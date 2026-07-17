## 1. 共享 env 逻辑提取

- [ ] 1.1 从 `claude-deepseek.mjs` 提取 `.env` 解析和 env mapping 到 `lib/env-deepseek.mjs`
- [ ] 1.2 `claude-deepseek.mjs` 改为 import 共享模块，确认 `--check` 行为不变
- [ ] 1.3 claude spawn 调用加 `--setting-sources project,local`（排除 user settings env block 干扰）

## 2. Runner instruction 分家

- [ ] 2.1 `experiments_playbook/RUN_EXPS.md` → 重命名为 `RUN_TUI_EXPS.md`，内容不变
- [ ] 2.2 创建 `experiments_playbook/RUN_CLI_EXPS.md`：CLI 模式执行规范（`--target-dir .exp-bundles`、skip verdict、skip cleanup、打印 BUNDLE=<path>）（`@impl EXA-002`）
- [ ] 2.3 确认所有 playbook `case-*.md` 文件不需要修改

## 3. Runner 核心：发现与过滤

- [ ] 3.1 创建 `run-experiment.mjs` 骨架：shebang、CLI arg 解析、读 `RUN_CLI_EXPS.md`（`@impl EXA-001, EXA-003`）
- [ ] 3.2 实现 playbook 发现：扫描 `*.md`、解析 YAML frontmatter、按 weight/case/experiment 过滤（`@impl EXA-004`）
- [ ] 3.3 实现 Human case skip：901-949 跳过，950-999 正常执行（`@impl EXA-006`）

## 4. Runner 核心：环境初始化

- [ ] 4.1 实现 `.exp-bundles/` 初始化：mkdir + symlink `DPT_FRAMEWORK → ../DPT_FRAMEWORK`（幂等）（`@impl EXA-008`）
- [ ] 4.2 `.gitignore` 加 `.exp-bundles/`

## 5. Runner 核心：执行引擎

- [ ] 5.1 prompt 构造：`RUN_CLI_EXPS.md` 内容作为前缀，追加 playbook 路径（`@impl EXA-002, EXA-003`）
- [ ] 5.2 Claude Code headless 调用：复用共享 env 模块 + `--setting-sources project,local` + `--allow-dangerously-skip-permissions`（`@impl EXA-003`）
- [ ] 5.3 诊断日志：Agent stdout/stderr 完整写入 `<bundle>/_diag_<ts>.log`，FAIL 时保留供排查
- [ ] 5.4 bundle 发现：扫描 `.exp-bundles/` + repo root，匹配短 case ID（`@impl EXA-003`）
- [ ] 5.5 verdict 提取：从 `rb_trace.jsonl` 解析 check events，按 `passed === expected` 裁决（`@impl EXA-003`）
- [ ] 5.6 health check 调用：spawn `verify-bundle-health.mjs`，解析 JSON 输出
- [ ] 5.7 写入 `<bundle>/exp_result.json` 作为结果摘要

## 6. Runner 核心：报告与清理

- [ ] 6.1 JSON report 生成：summary + results 数组，支持 `--json` 模式（`@impl EXA-007`）
- [ ] 6.2 cleanup 策略：PASS+CLEAN 时删（仅 `--cleanup-pass`），FAIL 保留（`@impl EXA-005`）
- [ ] 6.3 审计日志追加 `_temp/exp_verdicts.jsonl`（`@impl EXA-007`）
- [ ] 6.4 终端彩色 report（PASS 绿色、FAIL 红色、HUMAN 黄色）

## 7. 文档

- [ ] 7.1 更新 `DPT_FRAMEWORK/host_tools/README.md`：新增 `run-experiment.mjs` 文档
- [ ] 7.2 移除 Human case 文件（`exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md`），保留 AI-judge case-951

## 8. 需求注册与治理检查

- [ ] 8.1 在 `req-registry.yaml` 注册 EXA prefix 和 EXA-001 到 EXA-008
- [ ] 8.2 `check-project-reqs.mjs` PASS
- [ ] 8.3 `check-project-specs.mjs` PASS

## 9. 集成验证

- [ ] 9.1 `--dry-run --group agentic-queue` → 正确发现 3 个 case
- [ ] 9.2 `--case case-41` 真实执行 → PASS, 9 checks, bundle 在 `.exp-bundles/`
- [ ] 9.3 `--case case-901` → HUMAN skip
- [ ] 9.4 `--cleanup-pass` → PASS bundle 被清理
- [ ] 9.5 `.exp-bundles/DPT_FRAMEWORK` symlink 自动创建验证
