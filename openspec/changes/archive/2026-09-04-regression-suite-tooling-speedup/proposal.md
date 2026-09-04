# Proposal: regression-suite-tooling-speedup

> 2026-09-04 | 来源需求：`_backlog/plans/regression-suite-runtime-profiling-and-speedup.md`
>（2026-09-03 profiling 底稿）+ 本会话实测复核（2026-09-04）+ 用户指示：
> ① 全量回归过慢必须解决；② Propose 后必须跟 polish；③ 范围决策（用户拍板）：
> 纯 tooling 分两步走；④ 长 e2e 链路"掰开看必要性"记为第二步章程。

## Why

全量回归 `npm test`（324 个测试文件）墙钟实测 220~282s，治理 finalizer 默认
60s 级超时会误杀。本 change 是两步路线的第一步（纯 tooling）：在不触碰任何
测试断言、覆盖与 verification-routing 证明边界的前提下，把全量墙钟压向实测
可达下限；第二步（另行 change）处理重型 e2e 的链路去重与分解。

**本会话实测修正了底稿的两个推断**（证据见 design.md「实测记录」）：

1. 底稿认为"concurrency=4 砍半并行度是最大免费损失"——实测 c4→c8 仅降
   15%（281.8s→239.0s），c10 无增益：runner 槽位早已过订，并发不是主杠杆。
2. 底稿 C 路线前提"重型文件逐 it 重新 instantiate"大部分已实现
   （共享实例化 + snapshot/restore 已在用）；剩余成本是 spawn 链串行总量，
   属第二步范围。

同时实测新增两个底稿没有的事实：全量套件总 CPU 仅 ~1061 CPU-s
（user 793.9 + sys 267.6），8 核理论打包下限 ≈ 133s——**纯 tooling 的可达
下限**；本机为多人共用机器，曾出现 load avg 112 的外部负载，导致一次 2209s
的无效运行，因此**所有墙钟验收必须记录机器负载水位**。

## What Changes

- `package.json` 的 `test` 脚本从裸 `find | xargs node --test
  --test-concurrency=4` 改为入口脚本 `node scripts/run-tests.mjs`，由 wrapper：
  - 按 `os.availableParallelism()` 设置 `--test-concurrency`（本机=8）；
  - 设置 `NODE_COMPILE_CACHE` 指向 repo 内 gitignored 缓存目录
    （跨进程共享 V8 编译缓存，实测约 -3%，零风险顺手项）；
  - 按"最重优先"（LPT，longest-processing-time-first）排序测试文件后再交给
    `node --test`，压缩尾部长文件的调度浪费（排序表由生成脚本产出并提交，
    未登记文件按发现序垫后）。
- 新增 `scripts/run-tests.mjs`（进程编排 wrapper）、
  `scripts/regen-test-weights.mjs`（逐文件计时并产出排序表）、
  提交 `scripts/test-weights.json`（性能投影数据，非行为 authority）。
- `.gitignore` 增加 compile-cache 目录。
- 文件发现语义保持与现行为逐字等价：跳过 `.test-*` 一次性目录与符号链接
  目录（复用 `scripts/test-shard.mjs` 已有 discovery 契约）。
- **明确不产出**：不修改任何 `tests/**` 断言或覆盖；不改
  verification-routing 四类证明边界；不动 finalizer 门禁语义；不做重型
  e2e 链路重构（第二步）；不删除任何测试。LPT 排序是**调度序变化**，
  不改变被执行的测试集合（`node --test` 逐文件独立，无跨文件顺序依赖契约，
  且现有 `npm run test:shard` 已按字母序分片并行运行全部文件，证明文件间
  执行序无关）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md`（catalog 行 + spec 检索） | Excluded | 该 capability 拥有的是 bundle validation/inspection 的**测试内容**契约（断言、fixture、真实文件 I/O）；本 change 只改测试**运行器编排**（并发、排序、缓存），不触碰任何测试内容 |
| `verification/verification-routing` | `openspec/governance/verification-routing-contract.mjs`（schema）+ `openspec/specs/verification/verification-routing/spec.md` 检索 | Verify-only | 四类证明边界（unit/integration/deterministic_e2e/agent_flow_e2e）的测试归属与路由不受影响；change 的 verification-plan.yaml 按现行 v1 schema 声明，apply 后复查路由不转红 |
| `engine/cli-exit-code-conventions` | catalog 行 | Excluded | wrapper 继承 `node --test` 退出码（`process.exit` 直传），不新增退出码语义 |
| `verification/test-runner-entry` | 假想候选，评估后排除。已检查 catalog 全部 `verification/`、`engine/` 行 + main spec 关键词检索（`npm test`、`test-concurrency`、regression） | Excluded | 不引入新 capability：没有任何已检查 contract 拥有"全量测试入口的进程编排方式"这一 observable behavior；它不是产品行为，是 repo tooling。故 `skip_specs: true`，delta-spec 不适用：**无 spec 级行为变化——测试集合、断言、证明边界、产品 CLI 语义全部不变，变化的只有编排性能**。为凑 delta 而发明 requirement 违反 catalog 纪律 |

## Source of Record / 责任边界 / 化简影响

- **Direct Source of Record**：`scripts/run-tests.mjs`（编排行为唯一权威）+
  `scripts/test-weights.json`（排序权重唯一权威，由 regen 脚本再生成）。
  现入口 `package.json#scripts.test` 退化为对 wrapper 的一行调用，不再是
  编排语义的 source。
- **最短合法闭环**：`npm test` 全绿（退出码直传）是唯一权威闭环；不引入
  新的 pass/fail 判定层。顺序、并发、缓存对 verdict 无发言权。
- **Net simplification impact**：净增一个 wrapper 文件与一个数据文件，但
  消除了 package.json 内嵌的 find 管道（难以测试、无法携带排序逻辑），
  并让 `test:shard` 与 `test` 共享同一 discovery 事实源（复用而非复制）。
  不新增 control layer：wrapper 无配置面、无状态。
- **Semantic-precision reflection**（新具名 surface 仅两个，简短）：
  - `run-tests.mjs`（wrapper）：读者是有意跑全量回归的人与 CI。有界问题：
    "如何把全部测试文件交给 node --test 跑完并如实回传退出码"。必须保留的
    区别：**编排 ≠ 判定**——wrapper 对测试结果无任何 opinion；正常推理
    止于"文件集合、顺序、并发度、环境变量"。它不解释测试语义。
  - `test-weights.json`：读者是 wrapper 与 regen 脚本。它是**性能投影**
    （上次实测的逐文件耗时），不是行为 authority；过期权重只影响调度收益，
    不影响正确性（未登记文件垫后、排序稳定性由单测钉住）。
- **责任边界**：user decision = 范围与验收目标（已拍板：tooling 分两步、
  静默机器验收）；Agent execution = wrapper/排序表实现与单测、验证执行；
  Engine verdict = `node --test` 退出码仍是唯一测试判定权威，wrapper 与
  本 change 的任何 artifact 都不创造新的 verdict 权限。

## Impact

- 受影响文件：`package.json`（test 入口一行）、`scripts/run-tests.mjs`（新）、
  `scripts/regen-test-weights.mjs`（新）、`scripts/test-weights.json`（新）、
  `.gitignore`（一行）、`tests/engine/`（wrapper 契约单测，沿
  `test-shard-partition.test.mjs` 先例）、`tests/README.md`（如需说明新入口）。
- 风险：`node --test` 的文件调度序是否等于 CLI 参数序需在 apply 时用
  instrumentation 钉死（design.md 风险 R1）；排序表过期只降收益不破坏正确性；
  共用机器负载是测量噪声源，验收协议要求记录 load 水位。
- 对 finalizer：本 change 不改 finalizer；墙钟下降后其 60s 级默认超时问题
  是否仍存在，留待第二步 change 评估。
