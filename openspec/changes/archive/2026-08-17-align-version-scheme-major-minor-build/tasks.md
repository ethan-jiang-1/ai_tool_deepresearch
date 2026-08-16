# Tasks: align-version-scheme-major-minor-build

## 1. bump 工具实现 (VEM-001)

- [x] 1.1 创建 `openspec/governance/bump-version.mjs`：Node ESM，无外部依赖；解析 argv 支持 `--build` / `--minor` / `--major` / `--dry-run` / `--help`（@impl VEM-001）
- [x] 1.2 实现版本解析：读 root `CHANGELOG.md`，从顶部找首个 `^## \d+\.\d+\.\d+$` 标题作为当前版本；无合法标题 → exit non-zero 并报告（@impl VEM-001）
- [x] 1.3 实现 bump 语义：`--build` 第三段 +1；`--minor` 第二段 +1 且第三段归 0；`--major` 第一段 +1 且二、三段归 0（@impl VEM-001）
- [x] 1.4 实现写回：在 `# Changelog` 后插入新 `## X.Y.Z` 标题块，现有条目整体下移、不删除（@impl VEM-001）
- [x] 1.5 实现拒绝路径：无段 flag / 组合 flag（如 `--minor --major`）/ 未知 flag → exit non-zero 并命名违规 flag；`--dry-run --build` 只打印目标版本不写文件；`--help` exit 0（@impl VEM-001）

## 2. 既有测试适配 (VEM-001)

- [x] 2.1 更新 `tests/engine/version-management.test.mjs` 的
  「keeps root CHANGELOG.md as non-authoritative human history」断言：将
  旧散文断言（`retained human change history` / `not a current Harness
  version` / `runtime compatibility...selector` / `execution Source of
  Record`）改为新契约断言——CHANGELOG 以 `# Changelog` 开头、存在双点号
  `## 0.2.0` 标题、不存在单点号 `## v0.x` 标题（@impl VEM-001）
- [x] 2.2 保留其余三个 subtest 不变（RUN.md 无 banner、无 Harness-local
  changelog、config 无 version choreography）；确认它们在新 CHANGELOG / 新
  spec 下仍绿（@impl VEM-001）

## 3. 测试 (VEM-001)

- [x] 3.1 创建 `tests/governance/bump-version.test.mjs`（node:test +
  node:assert），全部基于临时 fixture CHANGELOG，不触碰真实 CHANGELOG（@impl VEM-001）
- [x] 3.2 断言：无 flag 拒绝；`--build` 0.2.0 → 0.2.1；`--minor` 0.2.9 →
  0.3.0；`--major` 0.2.0 → 1.0.0；`--minor --major` 组合拒绝；非法最新标题
  拒绝；`--dry-run --build` 报告目标版本且不写文件；写回后历史条目仍在；
  `--help` exit 0（@impl VEM-001）
- [x] 3.3 红绿对照（可选）：临时改坏 fixture 证明测试能命中拒绝路径，恢复
  （不留在工作树）（@impl VEM-001）

## 4. 验证

- [x] 4.1 `node --test tests/governance/bump-version.test.mjs` 全绿（9/9）
- [x] 4.2 `node --test tests/engine/version-management.test.mjs` 全绿（4/4，含
  更新后的 CHANGELOG 契约断言）
- [x] 4.3 对真实 root `CHANGELOG.md` 跑一次 `--dry-run --build`，确认报告
  目标版本 `0.2.1` 且文件未变
- [x] 4.4 对真实 root `CHANGELOG.md` 跑无 flag，确认 exit non-zero 且文件未变
- [x] 4.5 `node --test "tests/governance/*.test.mjs"` + `tests/engine/version-management.test.mjs`
  相关子集全绿（governance 56/56，既有治理测试不回归）

## 5. 收尾检查（归档前硬性 done condition）

- [x] 5.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change align-version-scheme-major-minor-build` 必须 PASS（VEM-001 在 registry 且 main spec 声明，无 duplicate/orphan/unregistered）
- [x] 5.2 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [x] 5.3 `node openspec/governance/check-verification-routing.mjs --change align-version-scheme-major-minor-build --mode plan` 与 `node openspec/governance/check-semantic-closure.mjs --change align-version-scheme-major-minor-build --mode plan` 必须 PASS
- [x] 5.4 delta/main 同步：MODIFIED VEM-001 同步进 `openspec/specs/governance/version-management/spec.md`，`> req:` 头保持 VEM-001 且正文逐字一致（比对 MATCH: true）
