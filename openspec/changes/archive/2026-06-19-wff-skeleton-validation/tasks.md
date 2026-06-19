## 1. 注册 Requirement ID

- [x] 1.1 在 `openspec/governance/req-registry.yaml` 注册新 requirement
  - LOG-001: logger default zero-config usage（`logger` capability，缩写 LOG）
  - LOG-002: logger file output via option
  - LOG-003: logger injection pattern in engine
  - LFW-001: lifecycle walker reads manifest and walks lifecycle（`lifecycle-walker`，缩写 LFW）
  - LFW-002: walker demonstrates gate fail → repair → pass
  - LFW-003: walker logs progress via logger
  - LFW-004: walker requires --bundle flag
  - GSK-004: gate CLI evaluates rules from definition（`gate-skeleton` delta）
- [x] 1.2 确认 `workflow-node-contract` delta spec 中 WNC-006 的 MODIFIED 内容完整（含 workflow-chain 加载子目录 node + YAML frontmatter 解析场景）

## 2. Layer 1: Logger 基础设施

- [x] 2.1 实现 LOG-001: 创建 `DPT_FRAMEWORK/engine/logger.mjs`
  - `createLogger(options?)` factory，默认 console only
  - 四个 level：debug/info/warn/error，默认 info
  - ISO 8601 时间戳自带了
- [x] 2.2 实现 LOG-002: `{ file }` option 文件 append 输出 + 自动 mkdir
- [x] 2.3 实现 LOG-002: 验证默认 `createLogger()` + 带 file 的 `createLogger({ file })` 都能正常工作

## 3. Layer 2: Engine 兼容

- [x] 3.1 实现 WNC-006 delta: 修改 `workflow-chain.mjs` 的 `nodePath()` —— 允许 `phases/` `shared/` 前缀，保留 traversal 防护（`..`, `/`）
- [x] 3.2 实现 WNC-006 delta: 修改 `workflow-chain.mjs` 的 `parseFrontmatter()` —— JSON.parse 失败时 fallback YAML 子集解析
- [x] 3.3 实现 LOG-003: 所有公共函数注入 `logger = null` optional parameter
  - `assessNode()`, `readMarkdownFile()`, `resolveDependencyClosure()`, `loadMarkdownFile()`, `executeLoadPlan()`
  - 每个函数在关键节点调用 `if (logger) logger.debug/info(...)`
- [x] 3.4 验证 workflow-chain 可以加载 `phases/phase-wave0.md` 和 `shared/shared-profile.md`

## 4. Layer 3: Lifecycle Walker

- [x] 4.1 实现 GSK-004: 修改 `gate-instantiation-complete.definition.json` —— 替换 placeholder rule 为真实 `file_exists` rule
- [x] 4.2 实现 GSK-004: 修改 `check-gate-instantiation-complete.mjs` —— 加载 definition JSON，执行 rules，返回 check/inspect/advice
- [x] 4.3 实现 LFW-001, LFW-004: 创建 `DPT_FRAMEWORK/cli/walk-lifecycle.mjs`
  - `parseArgs --bundle`，必须提供；`--manifest` optional（默认 `DPT_FRAMEWORK/workflows/manifest.json`）
  - 加载 manifest.json，遍历 phases
  - 每个 phase：trace + log → load node → spawn gate CLI → parse JSON → advance
  - `phase-final`（gate=null）：skip gate，停止 loop
- [x] 4.4 实现 LFW-002: Walker 内置 fail → repair → retry loop
  - 第一次 pass 前故意缺文件（或直接依赖 gate 检测到缺失）
  - 读取 inspect/advice → 修复 → rerun same gate
  - Max 3 retries，超限 escalate/block
- [x] 4.5 实现 LFW-003: Walker 使用 logger 记录进度（`_logs/run.log`）

## 5. 验证通路（inline）

- [x] 5.1 用 `experiments/shared/new-disposable-bundle.mjs wff_val` 创建 disposable test bundle，记 `$B`
- [x] 5.2 跑 `node walk-lifecycle.mjs --bundle $B`，确认 all 8 gates pass
- [x] 5.3 触发一次 gate fail —— `rm $B/rb_plan.md` → walk → gate fail → repair → rerun → pass
- [x] 5.4 验证 `$B/rb_trace.jsonl` 包含 phase_enter + check 事件
- [x] 5.5 验证 `$B/_logs/run.log` 包含 logger 诊断行

## 6. Experiment 基础设施（persistent playbook + frozen fixtures）

- [x] 6.1 创建 `experiments/prototype-wff-validation/` frozen fixtures
  - 复制 `DPT_FRAMEWORK/workflows/manifest.json` → `experiments/prototype-wff-validation/manifest.json`（frozen）
  - 复制 `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md`（全部 9 个）→ `experiments/prototype-wff-validation/nodes/phases/`
  - 复制 `DPT_FRAMEWORK/workflows/nodes/shared/shared-*.md`（全部 5 个）→ `experiments/prototype-wff-validation/nodes/shared/`
  - 创建 `experiments/prototype-wff-validation/EXPERIMENT.md` —— 假设、范围、依赖说明
- [x] 6.2 创建 `experiments_playbook/exp_wff_validation/test-simple-happy-path.md`（11 steps + cleanup）
  - Step 1: 创建 bundle + 读 manifest
  - Step 2–10: 逐 phase（instantiation→final），每步 assessNode + spawn gate CLI + 验证 PASS
  - Step 11: trace + log 最终验证（≥9 loads, ≥8 checks, 0 FAIL）
  - Cleanup
- [x] 6.3 创建 `experiments_playbook/exp_wff_validation/test-medium-fail-repair.md`（12 steps + cleanup）
  - Step 1: 创建 bundle + 读 manifest
  - Step 2: `rm $B/rb_plan.md` 触发 fail
  - Step 3: phase-instantiation → gate FAIL → Agent 读 inspect/advice → 修复 → rerun → PASS（核心闭环）
  - Step 4–10: 其余 phase 逐个 PASS
  - Step 11: phase-final（无 gate）
  - Step 12: trace + log 验证（≥1 FAIL, ≥1 PASS, REPAIR 记录, final PASS）
  - Cleanup
- [x] 6.4 更新 `experiments_playbook/RUN.md` —— Light 表格追加两条 wff-validation entry
- [ ] 6.5 运行两个 playbook，确认全部 PASS

## 7. 收尾检查

- [x] 7.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
- [x] 7.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS
