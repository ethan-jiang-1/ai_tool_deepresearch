## Context

动机见 proposal.md「Why」。现状事实（证据来自 `dpt_rb_harness-agent-selection-project-execution-pilot/` 与框架代码）：

- `rb_trace.jsonl` 显示 10 个 gate 全部多次 `passed: true`（两轮 rerun：08:53 / 10:24 各一次 seed-topics-ready 入口；wave0/1/2、hitl2、readiness、rerun-ready 均重跑并通过），但 `rb_plan.md## Progress` 只有 `setup-ready`（04:19:33）被勾。
- 代码层根因：`writePlanProgress()`（`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-plan-progress.mjs`）唯一调用点是 `writeGateAttempt(..., { setupReadyStaged: true })` → `writeSetupReadyStagedAttempt()`（`gate-helpers-attempt-audit.mjs:398`），而只有 `check-gate-setup-ready.mjs:553` 传该 option。其余 9 个 gate CLI（instantiation / hitl1 / seed-topics / wave0 / wave1 / wave2 / hitl2 / readiness / rerun-ready）都只传 `strictTrace`，从不翻 Progress。
- 契约层根因：已接受 spec `openspec/specs/research/plan-hostfile-sections/spec.md` 的 PHS-006 原文写着「`the setup-ready gate CLI` remains the first caller; other gate CLIs integrate in follow-up changes」——这个 follow-up 从未落地；PHS-010 允许 stale（consumed gate 未勾）以 advisory 报出，但 `phase-status-audit.mjs` 的 `evaluatePlanProgressTamper` 算了 `stale` 后直接丢弃，`evaluateLifecycleIntegrity` 只浮出 `tampered`，所以 audit 永远 `passed`，冻结无人可见。

约束：Progress 是 presentation-only（PHS-008/PHS-010，不是第二生命周期 authority）；trace/checkpoint 是 gate CLI 的 Engine 独家权威；Progress 失败不得影响 gate verdict/exit code；`stop: no` 静默 phase 不得因此向用户浮出；模板 `rb_plan.md.tmpl` 是基线清单的唯一来源。

## Goals / Non-Goals

**Goals:**
- 所有 gate CLI 在 pass 时经共享 writer 翻转当前块的对应行（幂等、时间戳刷新）。
- `rerun-ready` pass 时 Progress「长出一节」：追加 `### Rerun cycle N` 块，预填该 cycle 的 7 个 gate 为未勾，cycle 内 pass 勾在块内。
- audit 把「consumed gate 但其 attempt 时所在块的行未勾」作为 non-blocking advisory 浮出（tamper 保持 blocking）。
- 提供 `reconcile-plan-progress.mjs`：从 trace/checkpoint 重建存量 bundle 的 Progress（含 cycle 块），仍满足同一条 witness 规则。

**Non-Goals:**
- 不改任何 gate 的 verdict / trace / checkpoint / exit code 契约。
- 不把 Progress 变成生命周期 authority；audit 的 blocking outcome 集合不变。
- 不改 rerun 生命周期契约（REI/RTI/phase-rerun 流程、intent revision 语义）。
- apply 阶段不触碰任何 run bundle 运行时状态（运行时只读 scope 不变）；存量 bundle 修复是 apply 后的操作行为（reconcile 工具 + repair playbook 指引），不是 apply 本身。

## Decisions

**D1. 当前块 = Progress 段内最后一个 `### Rerun cycle N` 块（无则基线块），从段本身派生，不读 trace。**
理由：writer 是 presentation-only，生命周期严格顺序执行（cycle N 未结束不可能进入 cycle N+1），「最后一个块」必然当前块——最短合法闭环（simple-reliable-control）。备选：从 trace 数 `rerun-ready` pass 次数派生 cycle 序号——给 presentation writer 增加对 authority 的读依赖，还可能在 trace 异常时把 presentation 拖进 authority 故障；否决。

**D2. 块头携带 spawn 时间戳：`### Rerun cycle <N> (spawned <ISO ts>)`，由 Engine 追加块时写入。**
理由：audit 需要「该块内勾选行的 witness 必须 ≥ 块 spawn 时间」的确定性边界；块头自包含，解析无歧义，且与 gate_attempt 事件同一进程时钟。备选：用块内首条 gate_attempt 时间反推——脆弱且需要 trace 读；否决。

**D3. 通用调用点收敛在 `writeGateAttempt`，不散落到 10 个 gate CLI。**
`writeGateAttempt(bundlePath, result, options)` 里：`setupReadyStaged` 分支保持现状（staged 路径内先翻 Progress 再写 checkpoint/trace，`plan_sha256` 绑定覆盖翻转后字节——顺序不可动）；通用分支在 `check.passed === true` 时 best-effort 调 `writePlanProgress`（try/catch，失败只记 log，不改 result/exit code）。**顺序约束（证据）**：通用分支的 Progress 写必须发生在 `writeCheckpointManifest` 之前——该函数对 `rb_plan.md` 记录 `sha256/size/mtime`（`gate-helpers-attempt-audit.mjs` line 548-560，controlFiles 含 `rb_plan.md`），先写 Progress 才能让 checkpoint 里的 hash 覆盖翻转后字节，与 setup-ready staged 路径的既有顺序一致（`writeSetupReadyStagedAttempt` line 397-399：先 `writePlanProgress` 再 `writeSetupRoutePendingCheckpoint`）。当前无代码实时校验通用 checkpoint 的 plan hash，此约束是诚实性/一致性约束而非 live check。备选：每个 gate CLI 自己 import 调用——10 处重复、易漏；否决。

**D4. `writePlanProgress(bundlePath, gateName)` 扩展为块感知。**
- 解析 `## Progress` 段（沿用 canonicalSectionContent 的 opaque-region/排除语义）；段内按 `### Rerun cycle N (spawned ts)` 划块，基线块 = 段首到第一个 cycle 块之间。
- 翻转：在当前块内找 `- [ ] <gate>` / `- [x] <gate>`，翻成 `- [x] <gate> (<ts>)`；块内没有则追加一行（兼容非模板 gate 的 append 语义）。
- `rerun-ready`：先翻转当前块内的 `rerun-ready`，再**仅当 `### Rerun cycle <N+1>` 尚不存在时**追加 `### Rerun cycle <N+1> (spawned <ts>)` 与 7 行未勾 gate 列表（seed-topics-ready / wave0-complete / wave1-complete / wave2-complete / hitl2-recorded / readiness-passed / rerun-ready）；重复 pass 只刷新 `rerun-ready` 时间戳、不重复 spawn（幂等）。
- 返回值保持 `committed | unchanged | failed` 三态；失败不改字节。

**D5. audit 的 tamper/stale 判定按块绑定，stale 以 advisory 浮出。**
- `evaluatePlanProgressTamper`：解析块与块头 spawn ts；基线块行沿用现有 witness 规则（consumedGates）；cycle 块非 rerun gate 行要求存在该 gate 的 passed `gate_attempt`（route-bound consumption）且 `ts >= 块 spawn ts`；**cycle 块的 `rerun-ready` 行按位置绑定**——第 k 个（1-based）rerun-ready witness spawn 第 k 块并勾**上一块**的 `rerun-ready`，因此第 N 块的 `rerun-ready` 行只被「第 N+1 个 rerun-ready witness」见证（spawner 不见证自己的块），按 witness 序号而非时间戳判定，对 writer 同 ms 盖章鲁棒。块头无法解析的已勾行按 tamper 证据 fail-closed（Engine 只会写合法块头，坏块头 = 人工干预）。
- `evaluateLifecycleIntegrity`：tampered → 保持 blocking outcome `plan_progress_tamper_suspected`；stale 按「attempt 发生时所在块」判定——consumed gate（passed `gate_attempt` + route-bound consumption，含其 `ts`）若其 pass 时所在块（rerun-ready 按位置、其余按 spawn ≤ ts < 下一块 spawn，或最后一个块）的该 gate 行未勾 → 新增非 blocking 的 `advisory` 输出（`{ kind: 'stale_progress', gate, block }`），不进 `outcomes`，不改变 audit 的 passed/blocking 语义。注：readiness 与 rerun 是每个 cycle 的互斥出口，未经过的出口无 passed witness、不构成 stale。
- 备选：把 stale 并入 outcomes——违反 PHS-010「staleness SHALL be non-blocking」；否决。

**D6. reconcile 工具 = Engine 写的 presentation 重建。**
`cli/reconcile-plan-progress.mjs --bundle <path>`：读 `rb_trace.jsonl`（route-bound `gate_attempt` witnesses，与 audit 同一套判定）与现有 `rb_plan.md## Progress` 基线清单（缺失时回退 manifest 生命周期列表），按 D1/D2/D5 的同一规则重建 Progress（基线块 + 从 `rerun-ready` witnesses 派生的 cycle 块；每行 checked 必须有对应 passed witness），整体替换 `## Progress` 段，原子写（temp+rename）。它不跑 gate、不写 trace/checkpoint/status，输出 `committed | unchanged | failed` + 重建摘要。**不需要读 checkpoint**——通用 checkpoint 的 plan hash 是记录快照，不是 witness 判定输入（witness 判定只依赖 trace 的 gate_attempt + route-bound load）。注册进 `COMMANDS.md`，并在 `repair-run-bundle.md` 生命周期审计表补一行「presentation 修复（可选，非 authority）」。备选：让 audit 带 `--reconcile` 副作用——诊断命令 fail-closed 不写文件的约束被破坏；否决（独立 CLI 更符合「diagnostic 不写、repair 显式写」的分工）。

**D7. 模板不动。**
`rb_plan.md.tmpl` 保持 10 行基线清单；cycle 块是运行时 Engine 追加，不进模板（模板是 instantiation 时的静态形态）。

## Risks / Trade-offs

- [rerun-ready pass 时写 Progress 失败 → 下一 cycle 块没长出来，后续 pass 勾在旧块] → presentation-only：gate 语义不受影响；audit 会把该 cycle 的 consumed gate 报为 advisory stale；`reconcile` 可一键重建。可接受。
- [通用分支 Progress 写在 checkpoint 前：若写失败，checkpoint 的 `rb_plan.md` hash 记录翻转前字节] → 与 setup-ready staged 失败路径同理，presentation-only、当前无 live 校验，最坏 audit 报 advisory stale；可接受。
- [cycle 序号与 spawn ts 的时钟/重放歧义（supersede、late-submit 重放 gate_attempt）] → 块序号由「现有 cycle 块数 + 1」派生、幂等；audit 绑定用 spawn ts 而非序号；重放场景下最坏是 advisory stale，不是错误 verdict。
- [audit 对坏块头 fail-closed 报 tamper，可能误伤 Engine 老版本写的 Progress] → 老版本只写过基线块（无 cycle 块），不涉及新解析路径；解析失败仅发生在人工编辑或未来格式漂移，fail-closed 是正确方向。
- [reconcile 可能被误当 authority 修复使用] → 文档明确它是 presentation 重建、不创造 gate 语义；重建结果仍受 audit tamper 检查约束（无 witness 的行不会被勾出）。
- [新增 advisory 输出被下游误当 blocking] → audit 的 `outcomes` 集合与 exit code 语义不变，advisory 独立字段，README/COMMANDS 同步说明。

## Migration Plan

1. Apply 顺序：`gate-helpers-plan-progress.mjs`（块感知 writer）→ `gate-helpers-attempt-audit.mjs`（通用调用点）→ `phase-status-audit.mjs`（tamper 按块 + stale advisory）→ 新增 `cli/reconcile-plan-progress.mjs` + `COMMANDS.md` / `repair-run-bundle.md` 文档 → `tests/` 用例（见 tasks.md）。
2. 滚动安全：Progress 写失败不影响任何 gate verdict，先上线 writer + 通用调用点无破坏风险；audit advisory 为纯新增输出。
3. 存量 bundle：apply 后如需修复当前冻结的 `dpt_rb_harness-agent-selection-project-execution-pilot`，操作者运行 `reconcile-plan-progress.mjs`（Engine 写、trace 派生），属于运行时操作而非本 change 的 apply 范围。**时序要求**：对处于生命周期中段的存量 bundle（已有多轮 rerun 但无 cycle 块），reconcile 必须在它下一次 gate pass 之前执行——否则新 writer 会把后续 pass 勾进基线块（当前块 = 最后一个 cycle 块，无 cycle 块时是基线块）。repair playbook 的 reconcile 指引需写明这一时序。
4. 回滚：整体 revert 本 change 的 commits 即可；无 schema/数据迁移。

## Open Questions

- 无阻塞性问题。存量 bundle 是否立即 reconcile 属于操作者决定（apply 后进行），不改变 spec/design/tasks。
