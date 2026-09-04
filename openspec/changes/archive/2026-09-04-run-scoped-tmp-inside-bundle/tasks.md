# Tasks: run-scoped-tmp-inside-bundle

## 0. Apply 预检（首次 target edit 前，RUS/CMI-011 registry 事实就绪）

- [x] 0.1 把 `CMI-011: cmd-bundle-instantiation — Run-scoped tmp directory scaffold (instantiation)`
  追加进 `openspec/governance/req-registry.yaml`（live prefix 只增不删先例，同 DEW-030/031：
  不经 reservation 生命周期，直接写 registry，plan 模式下为 pending）；RUS prefix 由本 change
  的 `requirement-reservation.yaml` 持有（pending）。代码注释 `// @impl CMI-011` 不适用（registry
  是 YAML）。验证：`grep CMI-011 openspec/governance/req-registry.yaml` 命中。
- [x] 0.2 在首次依赖 `bundle.run-scoped-tmp-artifacts` family 的 target edit 前，把该 family
  （id + bounded_question，与 semantic-closure.yaml `catalog_additions` 一致）追加进
  `openspec/governance/semantic-fact-families.yaml`（catalog addition 义务，语义闭包规则）。
  验证：`grep bundle.run-scoped-tmp-artifacts openspec/governance/semantic-fact-families.yaml` 命中。
- [x] 0.3 运行 `node openspec/governance/check-project-reqs.mjs --mode plan` 与 (openspec-feedback:plan-review)
  `node openspec/governance/check-semantic-closure.mjs --change run-scoped-tmp-inside-bundle --mode plan`
  与 `node openspec/governance/check-verification-routing.mjs --change run-scoped-tmp-inside-bundle --mode plan`，
  验证：三者对 plan 模式无未解决冲突；RUS-001..004 与 CMI-011 不与 live registry 或其他 active
  change 冲突；exit 0。

## 1. 框架 helper 与扫描模块（RUS-003, RUS-004）

- [x] 1.1 新增 `DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs`：
  `stagingFile(bundleRoot, slug, kind)` 纯函数——返回 `join(bundleRoot, '_tmp', `${kind}-${slug}.json`)`，
  对 slug/kind 做 sanitize（拒绝/中和 `/`、`\`、`..`、空值），保证结果不逃逸 `_tmp/`；
  代码注释 `// @impl RUS-003`。验证：`node --test tests/engine/helpers/run-scoped-tmp.test.mjs` 通过。
- [x] 1.2 同一模块导出 `scanHardcodedSystemTmpWrites(bundleRoot)` 纯函数：只读遍历
  `_scripts/*.mjs`，匹配写目标形态的 `/tmp/` 字符串字面量（引号包裹、含拼接语境如
  `'/tmp/enrich-' + slug`），返回 `[{file, literal, line}]`；不匹配仅出现在注释/说明文本中的
  `/tmp/` 引用。代码注释 `// @impl RUS-004`。验证：unit 测试覆盖命中/排除/多文件聚合。
- [x] 1.3 新增 `tests/engine/helpers/run-scoped-tmp.test.mjs`（unit，`tests/engine/helpers/`）：
  覆盖 stagingFile 的 bundle-scoped 解析、traversal/separator 拒绝、kind/slug 组合稳定且互异、
  重复调用幂等；覆盖扫描命中 `'/tmp/enrich-' + slug`、排除 bundle-local staging 脚本、排除注释
  引用、多文件聚合。验证：`node --test tests/engine/helpers/run-scoped-tmp.test.mjs` 全部通过。

## 2. Instantiation scaffold（CMI-011, RUS-001）

- [x] 2.1 `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`：`dirs` 数组新增 `'_tmp'`；
  templates 映射新增 `{ tmpl: '_tmp/README.md.tmpl', dest: '_tmp/README.md', parse: null, schema: null }`；
  成功报告行更新为 11 data directories、7 scaffolds（文案随现状递增）。代码注释 `// @impl CMI-011`。
  验证：`tests/integration/cli/instantiate-run-bundle.test.mjs` 扩展断言 `_tmp/` 与
  `_tmp/README.md` 存在、报告提及 tmp scaffold。
- [x] 2.2 新增 `DEEP_RESEARCH_HARNESS/rb_templates/_tmp/README.md.tmpl`：声明"这是本 run 的
  临时目录；run-scoped 脚本的中间产物写这里；随 bundle 归档、可删除、non-authority；禁止用
  系统 `/tmp/`（不归档、跨 run 串信息）；若已在 `/tmp/` 发现可归属本 bundle 的中间产物，可按
  本目录命名约定采纳进来作为恢复依据"，与 `_scripts/README.md.tmpl` 同风格。
  验证：instantiation 后 bundle 内 `_tmp/README.md` 含临时/归档/禁止 `/tmp/`/采纳恢复 声明。
- [x] 2.3 `DEEP_RESEARCH_HARNESS/rb_templates/_scripts/README.md.tmpl`：规则节补充"中间产物
  （queue 卡、enrich 输入、投影 packet、source 草稿、result 草稿）写 current run bundle root
  的 `_tmp/`，禁止写系统 `/tmp/`"，附一行正例与一行反例。验证：模板文本 grep 命中
  `_tmp/` 与 `/tmp/` 反例。
- [x] 2.4 `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`：bundle 结构描述
  补 `_tmp/`（与 `_scripts/` 同句），说明它是 run-scoped 临时产物落点、non-authority、
  `_tmp/` 缺失不构成漂移。验证：playbook 文本 grep 命中 `_tmp/`，且 instantiation 场景描述一致。

## 3. 规则与文档同步（RUS-001, RUS-002）

- [x] 3.1 repo 根 `AGENTS.md` Hard Rules：在 run-scoped 脚本规则后补一句"run-scoped 脚本的
  中间/临时产物一律写入 current run bundle root 的 `_tmp/`，禁止写系统 `/tmp/`、repo 根或
  `DEEP_RESEARCH_HARNESS/`"（frontmatter `req: RUS-002`）。先运行
  `node scripts/list-doc-locks.mjs AGENTS.md` 盘点受影响锁，受影响断言在本 change 内更新。
  验证：doc-locks 断言更新后 `node --test tests/engine/list-doc-locks.test.mjs` 与
  `tests/engine/static-regression.test.mjs` 通过。
- [x] 3.2 `DEEP_RESEARCH_HARNESS/README.md` 目录性质段：在 run-scoped 辅助脚本描述后补
  `_tmp/`（run-scoped 中间产物落点，non-authority 运行时区域，随 bundle 归档）。
  验证：README grep 命中 `_tmp/`。

## 4. Inspect 接入扫描诊断（RUS-004）

- [x] 4.1 `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs`：默认结构输出路径调用
  `scanHardcodedSystemTmpWrites(bundleDir)`，命中时打印 `run-scoped-tmp diagnostic`（命名文件与
  offending literal），沿用 BUI-003 的接入位置与 blocker 分级措辞；命中即 active-bundle
  blocker，与 BUI-003 同进 `process.exit(1)` 分支；不改变无关 surface 的 exit 语义。
  代码注释 `// @impl RUS-004`。
  验证：新增 integration 测试（见 4.2）确认命中输出与 exit 1、无命中静默且 exit 0。
- [x] 4.2 新增 `tests/integration/cli/inspect-bundle-tmp-diagnostic.test.mjs`（integration，
  `tests/integration/cli/`）：fixture bundle 的 `_scripts/process-all-seeds.mjs` 含
  `'/tmp/enrich-' + slug + '.json'` → inspect 报告 diagnostic 命名文件与 literal 且 exit 1；
  fixture 脚本只写 `_tmp/` → 无 diagnostic 且不因 run-scoped-tmp 原因 exit 1（exit 0）；
  diagnostic 不改变 unrelated surface 的 exit code。
  验证：`node --test tests/integration/cli/inspect-bundle-tmp-diagnostic.test.mjs` 通过。

## 5. 端到端与收尾（CMI-011, RUS-001, RUS-004）

- [x] 5.1 `tests/integration/cli/instantiate-run-bundle.test.mjs` 扩展：fresh bundle 断言
  `_tmp/`、`_tmp/README.md` 存在且 README 非空；移除 `_tmp/` 后 `inspect-bundle` 仍 exit 0
  （缺 `_tmp/` 不失败）。
  验证：`node --test tests/integration/cli/instantiate-run-bundle.test.mjs` 通过。
- [x] 5.2 收尾检查 1：运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change run-scoped-tmp-inside-bundle` (openspec-feedback:closeout-review)
  必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，selected reservation
  已 transition 为 live identity）。验证：退出 0 且输出无 failure。
- [x] 5.3 收尾检查 2：运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS
  （0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
  验证：退出 0 且输出无 failure。
