# Design: align-version-scheme-major-minor-build

## Context

See proposal.md — Why. 现状要点:

- root `CHANGELOG.md` 已重置为双点号 `0.2.0`；历史 `v0.1 … v0.90` 条目已退役
  （git history 可查）。
- VEM-001 目前只描述「CHANGELOG 是简洁非权威人类历史 + RUN.md 不投影版本 +
  行为变更不强制更新 changelog」；没有任何可执行物能「自动往上调版本号」。
- 本 change 的价值是把版本 bump 变成**有工具、有测试、有规则约束**的机制，
  而不是只写一段规矩。

## Goals / Non-Goals

**Goals:**

- 提供一个可执行 bump 工具：读取 CHANGELOG 当前 `MAJOR.MINOR.BUILD` 标题，
  按显式段 flag 生成新标题并写回（`--build` / `--minor` / `--major` 三选一）。
- 落实粒度控制：bump 必须显式指定段（无 flag 即拒绝），不存在默认自动 bump；
  build 也只在「有较大变化」时由人显式触发，琐碎改动不 bump。
- 用确定性测试锁住工具行为（默认拒绝 / 三段 bump / 组合 flag 拒绝 / 非法版本
  拒绝 / dry-run 不写 / 历史条目保留）。
- 适配既有 `tests/engine/version-management.test.mjs`：把旧散文断言（root
  CHANGELOG 必须含 `retained human change history` 等短语）改为新契约断言
  （`## 0.2.0` 双点号标题存在、无 `## v0.x` 单点号标题），其余三个 subtest
  （RUN.md 无 banner / 无 Harness-local changelog / config 无 version
  choreography）不变。
- VEM-001 delta 与 main spec 同步。

**Non-Goals:**

- 不把 bump 挂进 OpenSpec archive 流程（VEM-002：行为变更不要求 changelog
  更新；本 change 不改变该边界——bump 是维护者显式触发的工具，不是归档副作用）。
- 不引入 package.json / npm / 外部依赖（纯 Node ESM，与其它治理 checker 一致）。
- 不改 `RUN.md`（VEM-003 已满足，无版本 banner）。
- 不改 `canonical-harness-vocabulary-contract.test.mjs`（其断言——spec 含
  「CHANGELOG is concise non-authoritative human history」与「RUN.md does
  not project a changelog version」——在新 spec 下仍成立）。
- 不新增 requirement ID（VEM 是 live prefix + 已有 main spec；reservation 机制
  只支持纯 New capability 的 pending，`!prefix` 条件不满足）。全部内容并入
  MODIFIED VEM-001。

## Decisions

### D1: bump 工具位置与形态 — `openspec/governance/bump-version.mjs`

- **选择**:与其它治理 checker 同目录的独立 Node ESM CLI，无外部依赖。
- **理由**:`check-project-reqs.mjs` / `check-project-specs.mjs` 等先例都在
  `openspec/governance/`，`--help` / 参数解析 / 退出码风格一致；Node >=20 内置
  `node:fs` 足够，无需 zod。
- **备选**:放 `DEEP_RESEARCH_HARNESS/cli/`。拒绝——那不是治理工具目录，且
  bump 作用于 repo root CHANGELOG，不属于 Harness 运行时面。

### D2: 显式段 flag 而非默认 build

- **选择**:`--build` / `--minor` / `--major` 三选一；无 flag 或组合 flag →
  exit non-zero 并提示。`--dry-run` 只报告不写。
- **理由**:用户明确要求「build 也不能随意调，较大变化之后才有 build 调整」。
  若默认 bump build，维护者顺手一跑就升版本，粒度约束落空。显式段 flag 使
  每次 bump 都是有意决定；`--build` 的「较大变化」判断权仍归人类。
- **备选**:无 flag 默认 `--build`。拒绝——违反粒度约束。

### D3: 版本解析与写回规则

- 解析:从 CHANGELOG 顶部起找第一个 `^## \d+\.\d+\.\d+$` 标题作为当前版本；
  无合法标题 → exit non-zero 并报告。
- 写回:在 `# Changelog` 标题行后、现有内容之前插入新标题块
  （`## X.Y.Z` + 空行），**不删除任何现有条目**；旧标题及内容整体下移。
- bump 语义:`--build` 第三段 +1；`--minor` 第二段 +1 且第三段归 0；
  `--major` 第一段 +1 且二、三段归 0。

### D4: 测试放 `tests/governance/bump-version.test.mjs`

- **选择**:与 `check-content-drift.test.mjs` 等同目录，用临时 fixture
  CHANGELOG 文件跑真实 CLI（child_process 或直接 import 导出函数）。
- **理由**:治理工具测试先例一致；不触碰真实 CHANGELOG（测试写临时目录）。
- 断言面:无 flag 拒绝 / 三段各自 +1/归0 / `--minor --major` 组合拒绝 /
  非法最新标题拒绝 / `--dry-run --build` 不写文件 / 写回后历史条目仍在 /
  `--help` exit 0。

## Risks / Trade-offs

- [bump 工具写坏真实 CHANGELOG] → 测试全部基于临时 fixture；工具内部先读后写
  单一原子 `writeFileSync`；写回前校验解析成功。
- [regex 误判其他 `## x.y.z` 标题] → 只匹配首个版本标题且要求三段数字；
  其它 Markdown 标题（如 `## 0. 禁用内置捷径`）不匹配 `\d+\.\d+\.\d+`。
- [「较大变化才 bump」无法机器判定] → 规则层面交给人类（每次 bump 是显式
  触发）；工具只保证「不会自动/默认 bump」。

## Migration Plan

- CHANGELOG.md 已是 0.2.0 双点号；无需迁移。
- 老 v0.x 条目不回填（git history 可查）。
- 部署:apply 后 `node openspec/governance/bump-version.mjs --build` 即可用。

## Open Questions

无。
