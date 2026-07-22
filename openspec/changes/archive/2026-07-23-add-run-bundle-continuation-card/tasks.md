## 1. Template: `RUN_BUNDLE.md.tmpl`

- [x] 1.1 在 `DPT_FRAMEWORK/rb_templates/` 新增 `RUN_BUNDLE.md.tmpl`，内容：
  - `# {{name}}`
  - `Framework: ` + framework 相对路径 placeholder（creation-time 渲染，不含 repo
    command root——那是 `BUNDLE_MAP.md` 的职责）
  - 委托语句：Agent 先读本目录 `BUNDLE_MAP.md`（布局），再读 `COMMANDS.md`（命令）
- [x] 1.2 `RUN_BUNDLE.md.tmpl` 不含任何 lifecycle 状态、CLI 命令、route selector、
  mutable field、或 bridge 文件引用

## 2. Bundle Creators 渲染 `RUN_BUNDLE.md`

- [x] 2.1 `instantiate-run-bundle.mjs`（production creator）：在 template mapping 中
  新增 `RUN_BUNDLE.md.tmpl` → `RUN_BUNDLE.md`，复用已有的 framework 相对
  路径计算逻辑渲染坐标（RUN_BUNDLE.md 只需 framework 路径，repo 路径是
  BUNDLE_MAP.md 的职责）
- [x] 2.2 `new-disposable-bundle.mjs`（disposable creator）：同样渲染
  `RUN_BUNDLE.md`，确保 placeholder 不留空
- [x] 2.3 `inspect-bundle.mjs`：新增 soft check——`RUN_BUNDLE.md` 存在时确认其可读，
  不存在时 warn（不 fail），保持旧 bundle 兼容

## 3. 回退 `BUNDLE_MAP.md.tmpl` 的 Continuation Section

- [x] 3.1 移除 v0.43 添加的 "Continue This Bundle" continuation section
- [x] 3.2 保留 v0.43 的正确改进：creator-rendered framework/repo 坐标（去掉硬编码
  `../DPT_FRAMEWORK/`）、passive-map 边界声明

## 4. 简化 `continue-run-bundle.md` Playbook

- [x] 4.1 将 v0.43 的 7 步 procedure 简化为：读 `RUN_BUNDLE.md` → 解析 framework
  坐标 → 读 `BUNDLE_MAP.md`（布局）→ 读 `COMMANDS.md` → 按用户意图选命令
- [x] 4.2 添加旧 bundle fallback：`RUN_BUNDLE.md` 不存在时 → 读 `BUNDLE_MAP.md`
- [x] 4.3 移除 node-type branching logic（它属于 `COMMANDS.md` 和各 CLI，playbook
  不重复）

## 5. 更新 Routing 和 Documentation

- [x] 5.1 `DPT_FRAMEWORK/AGENTS.md` / `CLAUDE.md`：existing-bundle entry 优先检测
  `RUN_BUNDLE.md`，不存在时 fallback `BUNDLE_MAP.md`
- [x] 5.2 `DPT_FRAMEWORK/RUN.md`：已有 bundle 的入口指引更新为 `RUN_BUNDLE.md`
- [x] 5.3 `DPT_FRAMEWORK/COMMANDS.md`：continuation 命令入口指向简化的 playbook
- [x] 5.4 `DPT_FRAMEWORK/README.md`：bundle 目录结构描述新增 `RUN_BUNDLE.md`
- [x] 5.5 Repo-root `AGENTS.md` / `CLAUDE.md`：同步更新 existing-bundle routing
- [x] 5.6 Repo-root `CHANGELOG.md` 更新，Framework version bump → v0.44

## 6. Verification

- [x] 6.1 Integration test：production creator 在 non-sibling target 下渲染
  `RUN_BUNDLE.md`，assert 文件名存在、bundle 名正确、framework 坐标为实际相对
  路径（非硬编码 `../DPT_FRAMEWORK/`）、无 bridge/control 文件泄露
- [x] 6.2 Integration test：disposable creator 同样渲染 `RUN_BUNDLE.md`，assert
  所有 placeholder 已替换
- [x] 6.3 Integration test：`continue-run-bundle.md` 的简化 routing contract——
  `RUN_BUNDLE.md` 优先、fallback 到 `BUNDLE_MAP.md`、不存在的文件不触发路由
- [x] 6.4 Regression：现有 `validate-bundle.mjs` / `inspect-bundle.mjs` 对旧
  bundle（无 `RUN_BUNDLE.md`）仍 PASS

## 7. Governance

- [x] 7.1 `check-project-reqs.mjs` PASS
- [x] 7.2 `check-project-specs.mjs` PASS
- [x] 7.3 `check-verification-routing.mjs --mode assets` PASS
