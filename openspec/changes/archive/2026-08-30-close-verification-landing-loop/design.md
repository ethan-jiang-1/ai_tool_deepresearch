# Design: close-verification-landing-loop

## Context

见 proposal.md 的 Why。直接相关现状事实：

- `finalize-change-archive.mjs` 的 `finalizeChangeArchive({ change, projectRoot, runCommand, fsApi })` 已有可注入 `runCommand` 与有序 `addCheck` 检查链，native archive 是最后一步（源码 447 行起）。
- 现行 CHF-004 明文禁止 finalizer "implement its own ... test runner"；本 change 是对该刻意排除的**窄幅修订**，不是绕过。修订正当性：原禁令防范的是 finalizer 长成测试框架/选择器；本设计恰好只放行"对 canonical 脚本的一次性调用 + 退出码读取"，禁令的其余部分全部保留并显式收紧（禁 selection/filtering/retry/partial-lane/per-change curation）。
- `tests/governance/change-feedback-finalizer.test.mjs`（unit，注入 fake runner）与 `tests/integration/governance/change-feedback-finalizer.test.mjs`（真 CLI + mkdtemp 隔离 root）已覆盖既有检查链；integration 断言的 blocked 点全部早于新检查，因此插入点不影响既有断言。
- 全量 `npm test` 实测 ~205s（2852 tests）；`runStep` 无内部 timeout。

## Goals / Non-Goals

**Goals:**

- 归档的机械前置含"canonical 回归套件退出码 0"，红灯无法通过 governed 归档落地。
- 两个过时锁回到与现行 accepted spec 一致，并保留防漂移牙口（负向证明）。
- 锁→文档的反向查询成本降到一条命令。

**Non-Goals:**

- 不改变 verification-routing 的四类分类，不引入 lane/test-class 新概念。
- 不做 git hooks / CI / deferral 机制 / 快车道 spec 化（proposal 已列升级条件）。
- 不改任何 `DEEP_RESEARCH_HARNESS/` 运行时行为；不改任何 main spec 除 CHF-004 外的内容。

## Decisions

### D1：检查位置与失败形状

新检查 `regression_suite` 插在 drift-guard 循环之后、native archive 之前（最后、最贵，符合既有"廉价先行短路"次序）。实现触点：`CheckSchema` id 枚举与 `RootCodeSchema` code 枚举各增一项。失败走既有 `makeBlocked`：code `regression_suite_failed`，observed 为 `summarizeProcess`（退出码 + 截断输出），owner `npm test (package.json scripts)`，repair 走既有 `RepairSchema` 的 `command` 字段（`{ command: 'npm test' }`，schema 已支持，无需改 RepairSchema）。**无内部重试**：flake 的合法路径就是"直接重跑确认 + 重跑同一 finalizer 命令"，与仓库"同一 checkpoint 重跑"教义一致，零新机制。

*备选否决*：finalizer 内建 retry-once（引入 failure-classification 逻辑，违反新禁令）；把 suite 放第一个检查（205s 挡住所有廉价短路，浪费）。

### D2：调用形状恰好等于 canonical 脚本

`runStep(runCommand, 'npm', ['test'], planningRoot)`——无参数、无过滤、无 env 覆写、无备用命令选择。测试注入只经既有 `runCommand` seam（生产路径不可注入选择逻辑，因为没有选择逻辑）。一个静态锁测试断言源码中该调用恰为 `['test']` 且无重试/过滤标记。

*备选否决*：env 可覆盖命令（`OPENSPEC_REGRESSION_CMD` 之类）方便测试——制造了绕过面与第二真相，弃。

### D3：planning root 无套件 = 诚实 blocked，不做条件豁免

"root 没有 package.json/test script 就跳过该检查"是 bypass 面。一个 root 声明不出可绿套件就无法证明绿——blocked 是诚实输出。本仓库生产使用中 planning root 恒为仓库根，唯一受影响面是 integration fixture：fixture 增加最小可绿套件（`package.json` + 一个恒过测试），属一次性测试基建调整，也顺带把 fixture 的"归档前置"完整性抬到与生产同构。

### D4：rebaseline 断言对齐"实质"而非"精确短语"

两个锁的新断言模式（详见 tasks）：

- vocabulary 锁：`## 0. Execution Brief` 存在；`本 Harness 就是项目的 Deep Research Harness` 身份句存在；entry-selection 指针三件（playbook 路径、`Entry Selection (canonical)`、`unsupported_current_entry_contract`）在指针块内且不程序复述。句式变化不再误伤。
- RUE-004 锁：`DEEP_RESEARCH_HARNESS/RUN.md` 路由存在；禁用清单含 `research` / `deep-research` 工具枚举（对 Execution Brief 表格的"此刻不要"列断言）。

两者的负向证明义务（临时还原旧措辞/删除实质→锁必须红）进入 tasks 与 verification-plan。

### D5：锁查询是只读命令，不是索引

`scripts/list-doc-locks.mjs <path>`：纯函数核心（对给定 tests 文件集合，抽取 `readFileSync`/路径字面量引用 + 相邻断言行）+ CLI 壳。无缓存、无生成文件、无 CI 挂钩。**它是降低阅读成本的投影，不是第二真相**；`tests/README.md` 一句话指引。

### 宪法三问（repo 规定的 design 论证）

- **Semantic precision**：见 proposal 的 reflection；`regression_suite` 是一个退出码事实，非选择器/车道/重试器，读者问一句"绿吗"即停。
- **Simple reliable control**：直接 SoR（package.json 的 canonical `test` script 退出码）；最短闭环（红→blocked→修→重跑同一命令）；net simplification——用一次机械事实替代"每 change 手工枚举全部相关锁"这一不可能义务，删除"绿不可信"债务；新增状态为零。
- **Helper-oriented responsibility**：确定性裁决（退出码/blocked）归 Engine；修复、更新过时锁、重跑归 Agent；无新增 user decision 面（deferral 明确不做，升级条件在 proposal）。

### 防教条自检（本 change 自带退场条件）

1. 退场条件：若 canonical 套件时长使归档流程实际瘫痪（>15 分钟级），或出现记录在案的"被无关红卡死"，则按 proposal 的升级条件重新设计（车道 spec 化或 deferral），而不是静默绕过。
2. 阻塞必带最小下一步：blocked 根含直接 `npm test` 重跑坐标与 finalizer 重跑坐标。
3. 无静默绕过路径：无 flag、无 env、无豁免分支。
4. 加的是事实核查（一个退出码），不是新规则面。
5. 新 agent 一遍可读：spec 场景 + blocked 输出自解释，无需部落知识。

## Risks / Trade-offs

- [归档时长 +~205s（每 change 一次）] → 接受；自动化等待非人工成本。升级条件见上。
- [fixture root 无套件 → integration 测试需补最小套件] → D3 一次性调整；30s spawn timeout 对恒过迷你套件充足。
- [递归风险：测试内真跑 finalizer 且 planning root=本仓库] → 既有 integration 测试全部使用 mkdtemp root；新增断言沿用该模式，并加一条静态守卫注释/断言禁止在测试中以本仓库为 planning root 调真 finalizer（防未来引入者踩雷）。
- [`npm` 不在 PATH 的环境] → 与 package.json scripts 同一前提，不另设 fallback（不造第二真相）。
- [嵌套 node:test 环境] → 集成验证发现：从 node:test 进程内 spawn 的 `node --test` 会因继承 `NODE_TEST_CONTEXT` 跳过执行并 exit 0（假绿）。生产不受影响（finalizer 由 shell 直跑），但套件哨兵测试必须在 spawn finalizer 时剥离该变量（已实现于 `finalizerEnv()`）；此事实记录在案，防止未来有人在测试环境内"验证"套件绿。
- [锁放宽后漂移防护变弱] → 负向证明义务 + 实质级断言模式评审；`list-doc-locks` 让"更新锁"这一步可枚举。

## Migration Plan

单 change 内自举：rebaseline（tasks §2）先行 → finalizer 检查与测试（§3）→ 工具与文档（§4）→ 全量验证（§5）→ 归档。本 change 自己的归档即是新前置的首次生产运行（此时套件已因 §2 而 全绿）。回滚 = revert 该 commit，无状态迁移。

## Open Questions

（无——所有设计选择已闭环；唯一有意延后项 deferral 机制已带升级条件记录在 proposal。）
