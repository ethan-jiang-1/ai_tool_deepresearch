## Context

post-final 恢复链路四面（spec 657 行 / playbook 116 行 / phase-final 273 行 / CLI 61 行薄封装 + helper 578 行）的 propose 期核实事实：

- spec L201-204 已规定 "Exit codes remain `0` for successful/eligible/unchanged/cleaned, `1` for deterministic blocked/recover-required, and `2` only for invalid invocation or inability to construct the validated envelope. Selected-bundle runtime contract failures SHALL use blocked exit `1`"。CLI 的 catch（`operate-post-final-recovery.mjs:53-60`）：`ZodError → 'invalid_configuration'`、其余 `→ 'operation_failed'`，一律 exit `2`。
- helper 已提供 closed blocked verdict 的完整形状（`engine/helpers/post-final-recovery.mjs:96-120`：`PostFinalRecoveryResultSchema` 要求 `operation/verdict/reason_code/reason` + 默认填充，`blocked` 对 inspect/apply/recover 三操作均合法、无 `next_action` 强制），CLI 可直接构造同形状结果，无需改 helper。
- helper 定义了类型化 `PostFinalRecoveryCrashError`（L155）；其抛出点在 apply 期核对，落在"运行时结果"类。
- spec 对 `check-reentry` 零覆盖（grep 0 命中）；playbook L116 承载三条 post-final 特定事实（双形式、phase-ref 读法、entry 同步后正确目标 = `hitl2_recorded`）。
- dig-list intake 规则 spec 已有完整 requirement（L622-657，4 scenario）；playbook §1.5 与其是投影关系。ReopenResearchPass 命名在三面无变体。
- `engine/cli-exit-code-conventions` spec 不管辖此 CLI（grep 零命中）；`tests/integration/cli/exit-code-convention.test.mjs` 的 inventory 锁仅断言无参数调用 → exit 2（A2 不改变它）。

See proposal.md – Why。

## Goals / Non-Goals

**Goals:**

- CLI 异常出口收敛到 spec 已声明的 closed verdict 形状：运行时契约失败 = blocked/exit `1`；exit `2` 严格保留给 invocation/envelope 构造失败。
- POF-006 回灌：post-final 入口诊断的目标选择语义成为 accepted spec 文本；playbook 相应段落退化为指针。
- 全程不改 helper、不改 `check-reentry.mjs`、不改任何合法 verdict 语义。

**Non-Goals:**

- 不做 helper 的防御性改造（把 throw 点逐一改成返回 verdict）——CLI 薄层收敛是最短合法闭环（D1）。
- 不改 dig-list 合同与 playbook §2/§3 的操作内容（§1.5 只指针化规范性描述，命令示例保留）。
- 不改 `check-reentry.mjs` 的 `--at` 解析机制与 `engine/runtime-reentry-debuggability` 契约。
- 无 ReopenResearchPass 改名（无变体，深挖报告该项撤消）。

## Decisions

**D1 — A2 在 CLI catch 内按异常类别收敛出口，helper 零改动。**
分类：`ZodError`（`--input` 请求 JSON 解析/envelope 构造失败）保留现状 exit `2` `invalid_configuration`——这是 spec 唯一允许 exit `2` 的类别；其余一切未捕获异常收敛为 `emit` 一个 `PostFinalRecoveryResultSchema` 同形状的 closed blocked result（`verdict: 'blocked'`、`reason_code: 'operation_failed'`、`reason: error.message`、其余字段取 schema 默认）并 exit `1`。helper 抛出的类型化 `PostFinalRecoveryCrashError` 落入后者（它是 helper 有意的运行时结果，对 CLI 调用者即运行时契约失败）。备选"改 spec 放宽 exit 2"被否：spec 文本与 fail-closed 精神一致且先于本 change 存在，错的是代码。备选"helper 全量防御性改造"被否：578 行逐点改风险大、收益与薄层收敛相同，违背 Simple Reliable Control 的最短合法闭环。

**D2 — B1' 范围相对 backlog 计划修正：只回灌 check-reentry 语义，dig-list 与命名两项撤消。**
逐项核实：(a) dig-list intake 规则 spec 已有完整 requirement（L622-657）——playbook §1.5 不是孤本而是投影，本 change 仅将其规范性内容收敛为指针（dedup），不新增 spec 文本；(b) ReopenResearchPass 命名三面无变体——撤消；(c) check-reentry 入口语义 spec 零覆盖、playbook 独载——确认为真孤本，ADDED POF-006 回灌，playbook §4 末段指针化。落点选择 ADDED 聚焦 requirement 而非 MODIFIED 既有巨型 requirement（L438-540 约 100+ 行）：复制巨型全文只为追加一段，违反最小 diff；新 heading = 新 ID = POF-006（顺位无占用、无 retired 冲突、无 active change 竞争）。

**D3 — POF-006 的事实归属：新增 fact family 而非强行塞入既有家族。**
POF-006 建立的确定性事实（"post-final 入口诊断应目标哪个检查点、各合法形式读作什么"）不被任何现有 family 的 bounded question 覆盖（`lifecycle.gate-status-trace-handoff` 问的是合法性证据，不是诊断目标选择）。按 config 规则以 `catalog_additions` 声明新 family `lifecycle.reentry-checkpoint-targeting`，并在首个依赖它的 target edit 前写入 `semantic-fact-families.yaml`（Apply 期任务）。resolver = `DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs`（`--at` 的机械消费者）；established_by = 本 spec POF-006；consumers = `command_playbook/post-final-recovery.md`（overlap: derived——投影展示）。

**D4 — A2 的验证采用"先红后绿"的确定性注入。**
现有测试已证明 helper 在 bundle 状态损坏时抛异常（`finalFacts` 直接 `JSON.parse`，`post-final-recovery.mjs:308-314`）。新用例：terminal final fixture 的 `rb_status.json` 写入非法 JSON → `inspect` → 断言 exit `1` + `verdict: 'blocked'` + `reason_code: 'operation_failed'`（修复前该用例 exit 2，先红）。inventory 锁（`exit-code-convention.test.mjs` 的无参数 → exit 2）不受影响，apply 期复核。

**D5 — semantic-closure 为 `affected`（两条记录 + 1 catalog addition）。**
`cli.exit-code-convention`（A2 改变该 CLI 的实际 exit 行为，resolver 即 CLI 文件）与新增 family `lifecycle.reentry-checkpoint-targeting`（POF-006）。见 `semantic-closure.yaml`。plan 检查 + archive 检查按 config 时点运行。

## Risks / Trade-offs

- [helper 内部某路径对"预期内失败"也以 throw 表达（如 `PostFinalRecoveryCrashError`），收敛为 exit 1 blocked 后，若有测试断言其 exit 2 会变红] → apply 期先 grep 全部 throw 点与既有断言（`grep -rn "operation_failed\|PostFinalRecoveryCrashError" tests/`），受影响断言同 change 更新并在 tasks 记录；语义上 exit 1 + blocked verdict 比 exit 2 裸错误更符合 spec。
- [POF-006 的 phase-ref 读法与 `check-reentry.mjs` 实际实现对不上（playbook 转述失真）] → apply 期以 `check-reentry.mjs --help`/源码与 `check-reentry.test.mjs` 复核双形式支持；若实现不支持 phase ref，则 POF-006 文本收缩为已证实部分并在 tasks 记录偏差。
- [playbook 指针化触碰下游引用（COMMANDS.md 表行等）] → §1.5/§4 的锚标题保留，仅正文收敛，不删节标题；list-doc-locks + 术语锁全量复跑。
- [新 family 的 bounded question 措辞不当] → catalog 文件可随后续 change 修订；checker 只验证结构。

## Migration Plan

Apply 顺序：plan 检查（closure/verification PASS；reqs plan 预期报告 `POF-006 unregistered`）→ `list-doc-locks` + 术语锁盘点 → 落地 POF-006 delta 到 main spec + header/registry/catalog → A2 代码修复（先红后绿测试）→ playbook 指针化 → `governance:check` → 收尾硬检查 → 全量 `npm test`。回滚即 revert；无运行时状态迁移。

## Open Questions

（无——A2 方向已在 backlog 计划中给出推荐（改 CLI）并经用户继续指令确认。）