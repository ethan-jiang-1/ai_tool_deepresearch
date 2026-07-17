## 1. 共享 env 逻辑提取

- [ ] 1.1 从 `claude-deepseek.mjs` 提取 `.env` 解析和 env mapping 到 `DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`（`@impl EXA-001, EXA-002`）
- [ ] 1.2 修改 `claude-deepseek.mjs` 改为 import 共享模块，确认 `--check` preflight 行为不变

## 2. Runner 核心：环境初始化

- [ ] 2.1 创建 `DPT_FRAMEWORK/host_tools/run-experiment.mjs` 骨架：shebang、CLI arg 解析（`--case`/`--group`/`--tier`/`--cleanup-pass`/`--timeout`/`--json`/`--dry-run`）（`@impl EXA-001`）
- [ ] 2.2 实现 `.exp-bundles/` 初始化：mkdir、symlink `DPT_FRAMEWORK → ../DPT_FRAMEWORK`（幂等，已存在则跳过）（`@impl EXA-008`）

## 3. Runner 核心：发现与过滤

- [ ] 3.1 实现 playbook 发现：扫描 `experiments_playbook/`、解析 YAML frontmatter、按 `weight`/`case`/`experiment` 过滤（`@impl EXA-004`）
- [ ] 3.2 实现 Human case skip 逻辑：case ID 901–949 跳过，950–999 正常执行（`@impl EXA-006`）

## 4. Runner 核心：执行引擎

- [ ] 4.1 实现 prompt 构造：为每个 case 生成包含 playbook 路径、`--target-dir .exp-bundles` 指令、结果写入 `<bundle>/exp_result.json` 的 prompt（`@impl EXA-002, EXA-003, EXA-008`）
- [ ] 4.2 实现 Claude Code headless 调用：复用共享 env 模块，`spawnSync('claude', ['-p', prompt], { stdio: 'pipe', timeout })`（`@impl EXA-002`）
- [ ] 4.3 实现结果文件读取：Agent 退出后从 `<bundle>/exp_result.json` 读取，缺失或 malformed 时标记 ERROR（`@impl EXA-003`）
- [ ] 4.4 实现 per-case 串行循环：超时处理、错误隔离、剩余 case 继续执行

## 5. Runner 核心：报告与清理

- [ ] 5.1 实现 JSON report 生成：`summary` + `results` 数组，支持 `--json` 模式纯 JSON stdout 输出（`@impl EXA-007`）
- [ ] 5.2 实现 `.exp-bundles/_last_run.json` 写入：run_id、filter、summary、per-case results（`@impl EXA-008`）
- [ ] 5.3 实现 cleanup 策略：PASS+CLEAN 时删 `.exp-bundles/` 下的 bundle（仅 `--cleanup-pass`），FAIL 保留；追加审计日志到 `_temp/exp_verdicts.jsonl`（`@impl EXA-005`）
- [ ] 5.4 实现终端报告：ANSI 彩色 summary（PASS 绿色、FAIL 红色、NOT_RUN 黄色），preserved bundles 列表

## 6. 文档与 Gitignore

- [ ] 6.1 更新 `DPT_FRAMEWORK/host_tools/README.md`：新增 `run-experiment.mjs` 使用文档
- [ ] 6.2 `.gitignore` 加 `.exp-bundles/`

## 7. 需求注册与治理检查

- [ ] 7.1 在 `openspec/governance/req-registry.yaml` 注册 EXA prefix 和 EXA-001 到 EXA-008
- [ ] 7.2 运行 `node openspec/governance/check-project-reqs.mjs` 确认 PASS
- [ ] 7.3 运行 `node openspec/governance/check-project-specs.mjs` 确认 PASS

## 8. 集成验证

- [ ] 8.1 `--dry-run` 验证：`node DPT_FRAMEWORK/host_tools/run-experiment.mjs --group agentic-queue --dry-run` 输出预期 case 列表
- [ ] 8.2 `.exp-bundles/` 初始化验证：首次运行自动创建目录和 symlink
- [ ] 8.3 `--case case-41` 真实执行：确认 Claude Code 可成功调用，bundle 在 `.exp-bundles/` 下，exp_result.json 在 bundle 内
- [ ] 8.4 两个不同 case 并发安全验证：各自独立 bundle + 独立 exp_result.json
- [ ] 8.5 Human case skip 验证：`--case case-901` 应输出 HUMAN verdict
- [ ] 8.6 Cleanup 验证：PASS case 在 `--cleanup-pass` 下清理 `.exp-bundles/` 下的 bundle，FAIL case 保留
- [ ] 8.7 `_last_run.json` 验证：跑完后文件存在且内容正确
