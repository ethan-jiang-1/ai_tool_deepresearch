# Design: harden-test-lane-signal-hygiene

## Context

- 失败机制（实测 + 源码核对，Source of Record：`tests/integration/governance/check-all.test.mjs`）：该文件的三个 `it` **各自** `spawnSync` 完整运行一次 `check-all.mjs`（每次聚合启动全部 ~15 个 checker），`spawnSync` 自带 `timeout: 120000`。满载并行下单次聚合超过 120s → `result.status` 为 `null`（SIGTERM）→ `assert.equal(result.status, 0)` 失败 → 套件级联报红。2026-08-31 两次全量实测（16 fail 受压 / 1 fail 干净 / 孤立 3/3 pass）与该机制吻合。
- `tests/README.md` 是 `verification-routing-knowledge-surfaces` 的 POINTER_SURFACES 成员（仅断言其指向 verification-routing），纯增量编辑安全。
- 可删产物口径的唯一既有真相：`.gitignore` 的 `tests/.test-tmp/`、`tests/.test-bundles/`、`tests/**/.test*` 三行。
- 动机与范围见 proposal.md「Why / What Changes」。

## Goals / Non-Goals

**Goals:**

- 满载失败有唯一成文定性规则（孤立复跑），且该规则与实测证据一致。
- `check-all.test.mjs` 在满载环境下的超时鲁棒性提高，且 RET-007 断言语义零弱化。
- 一次性测试产物有一条机械清理入口，口径不偏离 `.gitignore`。

**Non-Goals:**

- 不改 `check-all.mjs` 及任何 checker 的行为；不调测试并行度/分片策略；不动 verification-routing 分类；不新增依赖；不做 engine 提取（plan 非目标）。

## Decisions

### D1: triage 规则落 `tests/README.md`「How to Run」之后新增小节

内容三要素：(1) 现象陈述——subprocess 密集套件（点名 check-all aggregation）满载并行可能超时级联，孤立通过不应判回归；(2) 操作——`node --test tests/path/to/file.test.mjs` 孤立复跑失败文件；(3) 定性——孤立绿 = 资源竞争伪影（不得据此修改被锁行为或"修"不坏的代码），孤立红 = 真回归信号。
备选：落在根 `AGENTS.md`——否决，AGENTS.md 是任务路由面，测试运行知识归 `tests/README.md`（其开头即声明 own 全部 JS-led 测试）。

### D2: deflake = 合并冗余 spawn + 提高单次容忍，两者都做

- 原 test 1（聚合断言）与 test 3（read-only 快照）本就各自调用一次 `run([])`；由于 `node:test` 文件内 `it` 顺序执行、而 read-only 快照必须包住真实 spawn，跨用例缓存会引入执行顺序依赖——故将两者**合并为一个 `it`**：before-snapshot → 单次 `run([])` → after-snapshot，同一次调用同时证明聚合覆盖与 read-only。spawn 次数 3 → 2，describe 名 `check-all aggregation entry (RET-007)` 不变，`it` 数 3 → 2，全部断言（脚本覆盖遍历、不含自身、`--change` 转发、快照比对、fixture 建删）原样保留，无执行顺序依赖。
- `spawnSync` `timeout` 120000 → 300000。正常单次聚合 ~7s，5 分钟容忍 ≈ 40x 余量；受压首跑整体 ~50x 减速是观测到的最坏档位，300s 覆盖之。
- 断言零弱化：合并只是把"两次独立调用"收敛为"一次调用的双重证明"；read-only 性质是单次调用的确定性属性，效力不变。
- 外部假设核查（2026-08-31 grep）：`tests/` 中仅 `code-impl-ids-guard.test.mjs` 引用 check-all.mjs 且只断言其输出含 PASS 行，无任何 spawn 次数/结构假设，合并无外部破坏面。
- 备选否决：(a) 仅提 timeout——留下 3 次冗余 spawn，最坏串行墙钟更长；(b) 跨 `it` 缓存共享——顺序依赖，否决；(c) 让 check-all 内部缓存/并行化——触碰 governance 行为，超范围；(d) `npm test` 改串行——README 明文 parallel 是 canonical 模式，否决。

### D3: `test:clean` 为 `package.json` 内联 find 一行

`"test:clean": "find tests -type d -name '.test*' -prune -exec rm -rf {} +"`。`-prune` 保证只删最顶层匹配目录、不递归报错；**目录**口径与 `.gitignore` 的 `tests/**/.test*` 一致（含 `.test-tmp`、`.test-bundles`、`.test-chain-tmp` 及嵌套变体）；gitignore 第三行还匹配 `.test*` 文件，而 script 限定 `-type d`——这些文件本就不入库，盘上残留无害，script 不扩删文件面。`tests/fixtures/` 与版本库文件不受影响（fixture 目录不以 `.test` 开头）。
备选否决：独立 `scripts/test-clean.mjs`——为一次机械删除引入新文件面；本仓 `test`/`test:shard` script 已确立 npm 内联 shell 的先例。

### 宪法三步检（对新增具名 command `test:clean` 与被改测试面）

- Abstraction as Semantic Precision：读者有界问题 = "哪些盘上产物可安全删除"；停止点 = 与 `.gitignore` `tests/**/.test*` 口径一致的目录，其余不动。
- Simple Reliable Control：一条 find、无新状态、无新检查器；triage 规则把"满载红如何定性"从隐性经验收敛为一条直接事实。
- Helper-Oriented Agent：删除一次性产物与孤立复跑均为 Agent 的普通 mechanical work；一切 pass/fail 仍由 `node:test` + checker 的 deterministic verdict 拥有，规则本身不创设权限或生命周期状态。

## Risks / Trade-offs

- [合并后聚合与 read-only 的证据来自同一次调用，若 check-all 存在 run-to-run 方差则独立复证次数减少] → read-only 是单次调用的确定性属性；聚合断言仍遍历全部 checker 输出行；风险不触及 RET-007 语义，且原第三条 `it` 对同一 `run([])` 的重复调用本就无增量证据。
- [timeout 提到 300s 拉长真挂死时的最坏等待] → `it` 合并后净调用次数下降抵消部分墙钟；真挂死属罕见路径，5 分钟仍在单文件开发反馈可接受范围。
- [find 口径若与未来 gitignore 新增 `.test*` 变体漂移] → 两者物理相邻（package.json ↔ .gitignore），且 design 已声明 gitignore 段是唯一口径真相；后续新增产物目录时同一 change 内同步两处。
- [`rm -rf` 误删] → 模式限定 `tests/` 子树 + `.test*` 前缀目录；fixtures 目录名不匹配；script 不含任何变量插值。

## Migration Plan

无迁移：零运行时行为变更，四处落点（tests/README、check-all.test.mjs、package.json、tests/engine/test-clean-script-contract.test.mjs）均为独立小编辑，回滚即逐文件 revert。

## Open Questions

（无——deflake 的两个参数（it 合并、300s timeout）由实测数据与源码机制直接支撑，无需再决策。）
