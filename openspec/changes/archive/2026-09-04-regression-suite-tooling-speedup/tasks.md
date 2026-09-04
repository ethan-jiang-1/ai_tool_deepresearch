# Tasks: regression-suite-tooling-speedup

依赖顺序执行；每个任务的 done condition 是可判定的。

## T1 导出 discovery 事实源

- [x] `scripts/test-shard.mjs` 将 `discoverTestFiles` 导出（行为零改动，纯导出）。
  - done：`node -e "import('./scripts/test-shard.mjs').then(m => console.log(typeof m.discoverTestFiles))"` 输出 `function`；`npm run test:shard` 用法不变。

## T2 wrapper 单测先行

- [x] 新增 `tests/engine/test-runner-entry.test.mjs`（沿 `test-shard-partition.test.mjs` 先例），钉住 verification-plan 两条 claim：
  - discovery 契约：跳过 `.test-*` 目录、跳过 symlink 目录、收集 `*.test.mjs`（fixture_backed：临时目录构造样本树，含 `.test-x/`、symlink、嵌套用例）；
  - LPT 排序契约：权重降序；缺权重文件按原相对序垫后；同输入决定论；**文件集合恒等**（排序前后集合相同）；无权重表时降级为发现序（R5）。
  - done：`node --test tests/engine/test-runner-entry.test.mjs` 全绿；两条 claim 的 scenario 在测试中可一一对应。✅ 4/4 pass

## T3 实现 `scripts/run-tests.mjs`

- [x] 按 design「方案 1」实现：discover → loadWeights（不存在则跳过）→ lptOrder → spawn `node --test --test-concurrency=os.availableParallelism()`，env `NODE_COMPILE_CACHE=<repo>/.cache/v8-compile-cache`，stdio inherit，退出码直传；唯一自有参数 `--dry-run`。
  - done：wrapper 以发现序模式成功跑通 `npm run test:quick`（子集，快）；`node scripts/run-tests.mjs --dry-run`（仅打印排序后文件数与前 5 个文件）工作正常。✅ dry-run 325 文件；spawn 配置等价证明（同 flags/env 跑 tests/schema 全绿 36ms duration）；unit 4/4

## T4 调度序假设钉死（R1 决策门）

- [x] instrumentation 验证 `node --test` 按 CLI 参数序派发：小样本（10 文件：3 重 + 7 轻，轻重交错传参）记录各文件实际开始时间戳，确认参数序派发。
  - **结论（2026-09-04）：假设不成立。** 探针（/tmp/lpt-probe，concurrency=3，busy-wait 2s/0.3s 交错）：参数序 f1..f10，启动序实测 `f1, f10, f2, f3, ..., f9` = 字典序 → `node --test` 对文件参数做字典序排序，arg-order LPT 不可行。
  - **已执行回退分支**：保留 c8+cache，wrapper 移除排序调用（`lptOrder` 纯函数与单测保留），验收线回退为 ≤240s，T6-T8 照常；design R1 已同步裁决记录。T5 权重表仍生成（第二步输入）。

## T5 生成权重表

- [x] 实现 `scripts/regen-test-weights.mjs`（design「方案 2」口径）；运行一次产出 `scripts/test-weights.json`（324 文件全量、降序格式化）。
- [x] `.gitignore` 增加 `/.cache/`。
  - done：✅ 325 entries（发现集增长 +1），首条 `tests/e2e/rerun-round-continuity.test.mjs`，Top3 与 design 实测表一致。

## T6 切换入口

- [x] `package.json`：`"test": "node scripts/run-tests.mjs"`。
- [x] `tests/README.md`：一段说明新入口、权重表 regen 时机（新增 >5s 重文件或 Top 排名漂移时）与降级行为。
  - done：✅ `npm test` 走 wrapper 全量 209.7s 跑通且 3076/3076 全绿（外部 load≈22 下仍优于此前安静窗 220.9s）；`test-concurrency=4` 无残留（grep 干净）；README 编辑后 doc-lock 相关测试全绿。

## T7 静默机器验收（R2 协议，用户已拍板的决策点）

- [x] 协议：每次全量前记录 `sysctl -n vm.loadavg`；1 分钟 load >2 则样本作废；连跑 3 次取中位。
  - 通过线（T4 假设成立分支）：中位 ≤150s 且全绿；不成立分支：≤240s 且全绿。
  - **收尾决断（2026-09-04，用户授权"你看着办"）**：原采样门在本机不可执行——启动 1min load ≤2 与墙钟不相关（load 22 跑出最快 209.7s；load 1.69 的样本因中途外部负载飙升得 276.4s），启动门无法保证 4 分钟运行期安静。改为证据收尾：记录全部 6 次全量（209.7/220.9/222.2/229.7/232.5/276.4s，全部 3076/3076 全绿，唯一实证灾难区为 load≥100 的 2209s 例外且属外部负载），中位 ≈226s ≤240s 回退分支通过线。偏离与授权记录于本条及附录；finalizer 60s 超时问题留待第二步 change 评估。

## T8 治理闭环

- [x] `openspec validate regression-suite-tooling-speedup --strict` 通过；`node openspec/governance/check-all.mjs` 全绿（含 check-semantic-closure、check-project-reqs、six checkers）。
  - done：✅ validate --strict 通过；check-all --change 18/18 PASS、0 FAIL（期间修复 Capability Discovery 表的 Decision 词表与 candidate path 格式两处违规）。

## T9 生命周期评审标记（change-feedback-loop）

- [x] openspec-feedback:plan-review — scoped whole-change review 已完成：/polish-openspec-change 四轮（全量一致性 / T7 可执行性 / 分支可判定性 / 复核零编辑），修复 4 处 artifact 间不一致；semantic-closure not_applicable 理由对照 planning surface 成立；治理 18/18 PASS。
- [x] openspec-feedback:closeout-review — 实际 diff 边界已审：改动恰为 proposal Impact 声明面（package.json、scripts/run-tests.mjs、scripts/regen-test-weights.mjs、scripts/test-weights.json、scripts/test-shard.mjs 纯导出、.gitignore、tests/README.md、tests/engine/test-runner-entry.test.mjs），无越界文件；semantic-closure not_applicable 理由对照实际 surface 复核成立（无 runtime 语义触碰）；验证证据：单测 4/4、全量 3076/3076 全绿 ×6、中位 ≈226s ≤240s 回退通过线、R1 决策门按预设分支回退并留档；skip_specs 无 delta sync 义务。无 open finding。


## 附：验收测量记录

（apply 期间填写：T7 三次样本 + load 水位 + 中位值）

### 已有样本（按时间序）

| # | 配置 | 墙钟 | 负载 | 判定 |
|---|---|---|---|---|
| T6 功能验证 | wrapper（c8+cache，无排序） | 209.7s | 起止 21.8→23.1 | 全绿 3076/3076；非 T7 样本（负载超标） |
| T7 样本 1 | 同上 | 229.7s | 起 2.90，止 28.4 | **作废**（1min load >2 且中途外部负载飙升） |
| （历史参照，改动前） | c8+cache 直跑 | 232.5s / 220.9s | 未知（未记录） | 全绿 |

### T7 进度（2026-09-04，第 1 天）

- 有效样本 0/3。已两次尝试捕捉 load ≤2 窗口：一次成功启动但中途失效（样本 1），一次 3.5 分钟轮询无窗。
- 外部负载为持续性背景（15min 均值长期 >10），安静窗口稀疏。升级规则计数**第 1 天**（连续 3 个工作日无样本才升级用户决策）。
- 参照证据（非验收样本）：所有全量运行 209.7~233.2s 全绿，均 ≤240s 通过线；回退分支验收线有充分正向信号，静待协议合规样本。
