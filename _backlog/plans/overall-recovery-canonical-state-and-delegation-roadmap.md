# Overall Plan: Recovery、Canonical State 与 Delegated Reliability 五 Change 总控路线

**性质:** 跨 plan / bug 的 OpenSpec change 总路线（pre-OpenSpec）
**状态:** Active — C1/C2/C3A/C4 已 archive（v0.22–v0.25）；C3B `mutate-canonical-topic-layout` 正在 apply（目标 v0.26），C5 post-final recovery仍待推进（更新于 2026-07-12）
**当前进度速览:** 见文末 [§12 Change 进度总览](#12-change-进度总览live-tracker)——每推进一个 change 就更新那张表，避免跟踪断线。
**前置基础:** `align-recovery-with-simple-helper-posture`（v0.21）已建立 helper-oriented、`materialize-before-work`、`canonical-or-blocked` 与依赖带，但未实现本计划的核心 runtime 能力。

## 0. 来源与目标

本路线统一承接以下活跃来源：

- [`breakpoint-recovery-persistence-model`](breakpoint-recovery-persistence-model.md)
- [`human-override-and-state-mutability`](human-override-and-state-mutability.md)
- [BUG-077](../_done/_fixed_bugs/BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md)（Closed）
- [BUG-078](../bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md)
- [BUG-079](../bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md)

> **本 overall plan 的定位：** 它是一把"伞"，专门罩住上面 `plans/` 的 2 个 plan 与 `bugs/` 的 3 个 bug——这 5 个来源不再各自单独推进，统一由本路线的 C1–C5 承接。等整条路线全部执行完（对应 change 都 apply/archive 且 controlled proof 通过），按 §11 关闭条件把该 move 的条目 move 下去：plan → `_backlog/_done/_closed_plans/`，bug → `_backlog/_done/_fixed_bugs/`，并从 `_backlog/plans/README.md` / `_backlog/bugs/README.md` 索引移除。本 overall plan 自身在 5 个来源全部关闭后一并归档到 `_backlog/_done/_closed_plans/`。

目标不是为每个症状单独加一个命令，而是建立一条可恢复、可见、可审计的 canonical 工作路径：

```text
direct observation and contract transparency
  -> crash-safe durable data
  -> canonical intent / identity / progress
  -> explicit delegated actor availability
  -> audited post-final recovery and authorized repair
```

完成后，框架应能在不依赖 chat memory、手写 authority 或平行 addendum namespace 的情况下：

1. 判断 bundle 是否完整、一致且存在可达的下一动作；
2. 保存已经取得的数据，即使在写入中途崩溃也可确定性恢复；
3. 在工作开始前保存用户意图、topic identity 与进度；
4. 在 delegated actor 不可用时给出正式、可审计的继续或阻断路径；
5. 对 post-final rerun 和 human-directed repair 提供受约束的 sanctioned path。

## 1. 为什么收敛为五个 Change

最保守的切法可以拆成八个 change，但会把同一个 Source of Record 和同一条 recovery authority 链切得过碎。五个 change 按 failure mode 与 authority boundary 聚合：

| Change | 核心边界 | 为什么独立 |
|---|---|---|
| C1 Observability | 只读检查、诊断与契约透明度 | 不修改 authority，可先建立安全网 |
| C2 Durability | 数据写入与崩溃恢复 | 与 topic/state 语义无关，可独立验证 |
| C3 Canonical State | intent、identity、progress 与原子维护 | 必须共同选择唯一 Source of Record，避免双写 |
| C4 Delegated Actors | actor availability 与正式 fallback/block | 属于 work-unit execution authority，不应混入 bundle state |
| C5 Authorized Recovery | post-final reentry 与受审计 mutation | 高风险 authority change，必须依赖前置安全网 |

不建议压缩成一至两个 change：那会同时触及 audit、filesystem persistence、topic schema、HITL materialization、work-unit actor 与 handoff/status mutation，无法形成清楚的回滚边界或 focused acceptance proof。

## 2. 总依赖图

```text
┌──────────────────────────────────────────────┐
│ C1 harden-recovery-observability-and-contracts │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ C3 establish-canonical-topic-state           │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ C5 restore-audited-post-final-recovery       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ C2 make-artifact-persistence-crash-safe      │──┐
└──────────────────────────────────────────────┘  │ supports C3/C5 recovery truth
                                                   │
┌──────────────────────────────────────────────┐  │
│ C4 handle-unavailable-delegated-actors       │──┘ independent execution lane
└──────────────────────────────────────────────┘
```

推荐执行顺序：

1. 先做 C1；
2. C2 与 C4 可在 C1 之后分别推进，不互相依赖；
3. C3 依赖 C1，设计时必须吸收 C2 的 durability boundary；
4. C5 最后，依赖 C1 与 C3，且应消费 C2 的 crash-safe primitive；
5. 若 C3 在 propose 阶段无法保持一个清楚 Source of Record，可拆为 C3A identity/rename 与 C3B intent/progress，但不预先拆分。

## 3. C1 — `harden-recovery-observability-and-contracts`

**Status (2026-07-12): Archived.** Canonical incident detection、root-grouped recovery summary、reachable/missing-contract feedback、Wave0/return-map repair 与 shared cache contract 已落地。C2 也已归档；当前推进 C3 canonical topic state，C4 delegated actor availability 仍是独立 lane，C5 继续等待 C3。

### 3.1 覆盖来源

- Human Override plan D：`audit-bundle-integrity`
- BUG-079：Engine-invisible topic、悬空引用、平行 durable namespace、不可达 gate advice
- BUG-077 的 contract-opacity 部分：Wave0 reference metadata split、bold return-map、cache contract 漂移
- Breakpoint plan 的恢复五问：为后续能力提供只读判定面

### 3.2 目标

建立一个复用现有 audit/inspect/reentry helpers 的只读安全网，让 Agent 不读 Engine 源码即可看到最小根因与一个最近合法动作。

### 3.3 In Scope

- 扩展现有 `check-reentry`、`file-observability`、`inspect-bundle` 或其共享 helper；只有现有 ownership 无法容纳时才新增窄 CLI。
- 枚举 registry、seed、wave0、wave1、wave2/final 等 canonical topic surfaces，检测：
  - registry topic 无 seed 或 artifact；
  - artifact/reference 指向不存在的 topic；
  - durable topic output 不在 registry/progress/trace 可见路径；
  - `_cache/addendum/`、`final/addendum/` 等平行 namespace 成为唯一正式结果；
  - profile、registry、artifact identity 不一致。
- 检测 gate/check advice 是否指向当前状态下已知不可达的同一 preflight 循环；没有 sanctioned path 时直接报告 missing contract。
- 修复 `inspect-wave0-output.mjs` 的 H1 metadata split 假报。
- 明确 bold-wrapped return-map field 的 accepted behavior：选择宽容解析或在最近决策点明确禁止，不能继续隐式失败。
- 让 cache-trail 人类说明与 validator 使用同一共享 contract source，或至少加入静态 drift audit。
- 输出 root-cause-first diagnostics，避免一个 parent gap 产生大量 downstream noise。

### 3.4 Out Of Scope

- 不修改 topic identity、status、trace、queue 或 artifact。
- 不自动修复 drift。
- 不创建 addendum 成功路径。
- 不开放 post-final reentry 或 override。
- 不处理 subagent API 402 actor availability。

### 3.5 验收

- 对 BUG-079 形状的 disposable fixture，检查能报告隐形 topic、悬空 identity 与平行 durable output。
- 对不存在 sanctioned route 的状态，只报告 missing capability/nearest legal action，不建议重复执行必然失败的 predecessor gate。
- 带 H1 标题和完整 metadata 的 Wave0 reference 不再被误报。
- bold return-map behavior 有明确测试与 Agent-facing contract。
- inspect/audit 全程无 authority、artifact、trace、queue、status 副作用。

## 4. C2 — `make-artifact-persistence-crash-safe`

**Status (2026-07-12): Archived (v0.23).** `archive/2026-07-12-make-artifact-persistence-crash-safe` 已同步 main spec。已落一个 workspace、一个 helper、一个 `persist|sweep` CLI 与 controlled case-314。范围刻意收窄为 completed staging 的 sanctioned content persistence；没有 FIO/trace/control mutation、discard/quarantine、global journal、watcher 或 lock service。

### 4.1 覆盖来源

- Breakpoint plan P1：completed staging 的 crash-safe commit 与 accepted workspace recovery
- BUG-079：非 canonical recovery 现场中已经抓取但未 finalize 的真实数据

### 4.2 目标

Agent 将完成的 staging content 显式交给统一 crash-safe durable path；进程在 final rename 周边死亡时，recovery 能基于 accepted operation sidecar 确定性 finalize、clean 或 block，而不猜任意 temp 文件。

### 4.3 In Scope

- 一个 `_diagnostics/artifact-persistence/<operation-id>/` workspace 与 `preparing|prepared` sidecar。
- 一个 helper 和一个仅含 `persist|sweep` 的 CLI；目标仅限 `reference/`、`artifacts/`、`final/`、producer-owned `_cache/`。
- completed staging source 保留到 commit；create/replace 使用 absent/SHA-256 compare-and-swap。
- quiescent sweep 只枚举 accepted workspace：prepared → `finalized`，target 已等于 payload → `cleaned`，invalid/incomplete/conflict → `blocked`。
- `_logs/run.log` 只作 best-effort projection；work-unit submit/cache normalization 与 control/state/trace/ledger owners 不迁移。

### 4.4 Out Of Scope

- 不新增 topic progress schema。
- 不决定 post-final rerun route。
- 不把 filesystem mtime 当业务完成 authority。
- 不为每种 artifact 建立独立 journal subsystem。
- 不扫描或 promote 任意历史 `.tmp`，不自动 discard/quarantine，不拦截 persist invocation 前 host write。

### 4.5 验收

- case-314 证明 prepared-before-rename → `finalized`、committed-before-cleanup → `cleaned`。
- incomplete/hash mismatch/target conflict → `blocked` 且 no mutation/no deletion。
- Agent cleanup/retry 后 sweep 为空；重复 sweep verdict 稳定。
- recursive snapshot 证明 control authority 不变；run.log 只投影直接原因。

## 5. C3 — `establish-canonical-topic-state`

**Status (2026-07-12): Applying as C3A (v0.24).** Scope已按 simplicity split：本 change实现 stable UID、minimum intent、explicit legacy migration、add/update、UID-bound seeds、direct-fact progress与explicit crash recovery；remove/rename/renumber/path migration转独立 C3B，post-final reentry/override继续属于C5。

### 5.1 覆盖来源

- Breakpoint plan P2：topic×wave 一等进度面
- Breakpoint plan P3：重要用户输入在接收当刻物化
- Human Override plan A：topic identity 单一真相源
- Human Override plan B：原子 rename/renumber
- BUG-079：新增 scope 必须拥有 canonical identity、progress、artifact、profile 与 trace visibility

### 5.2 目标

选择一个 canonical topic identity/progress Source of Record，使用户新增或修改 scope 时先落最小 durable intent，再开始研究；所有派生路径可从该 truth 更新或校验。

### 5.3 必须先做的设计决定

- `topic_registry` 是否继续作为 identity owner；若是，哪些字段属于 canonical truth，哪些只是 projection。
- per-topic/per-wave progress 的唯一 owner：不得在 `rb_plan.md`、`rb_status.json`、`rb_queue.json` 与 trace 中同时保存互相竞争的 blocking state。
- 最小 intent artifact 的粒度：至少包含 stable topic identity、title、must-answer、scope role、依赖与初始 progress。
- progress enum：必须能区分未开始、进行中、已交付以及明确 terminal/deferred 状态，不能把 derived gate verdict 再复制一份。
- rename/renumber 后哪些 surface 由 Engine 原子更新，哪些由检查器证明为派生一致。

### 5.4 In Scope

- HITL1、HITL2 rerun 和未来 post-final scope request 在内容工作前物化最小 topic intent。
- 新 topic 即使立即崩溃，也已经拥有 canonical identity、seed/intent skeleton 与初始 progress。
- per-topic/per-wave progress 在 accepted handoff/work boundary 更新，并可从 disk truth恢复。
- 实现原子 `rename-topic` / `renumber` operation：更新 canonical owner 和必要派生面，失败时整体回滚或保持旧状态。
- canonical-or-blocked：未完成 registration/materialization 时不得开始 durable content work。
- 删除或拒绝平行 addendum identity/progress authority。
- 提供与 C1 audit 对接的 consistency proof。

### 5.5 Out Of Scope

- 不开放 arbitrary status mutation。
- 不允许 Agent 通过标记 `human-directed` 自授 rename/reentry 权限。
- 不解决 subagent availability。
- 不实现完整 post-final handoff；只准备其 canonical input/state 前提。

### 5.6 验收

- 用户请求新增 topic 后立即崩溃，只读 bundle 即可恢复 topic identity、must-answer、依赖和 `never_started` 状态。
- 任意中断点可列出每个 topic 每个 wave 的当前状态与最近下一动作。
- rename/renumber 不需要手工修改 registry、seed、reference metadata、artifact dirs、dossier links 和 indexes。
- 原子操作中途失败不会留下两个 identity 或半迁移结构。
- C1 audit 对正常 bundle clean，对故意制造的 orphan/drift 给出单一最近修复目标。

## 6. C4 — `handle-unavailable-delegated-actors`

**Status (2026-07-12): Archived.** v0.25 implements one queue-front role-bound actor preflight at the existing claim checkpoint, explicit single Phase Agent fallback inside formal submit authority, truthful normal/fallback/legacy provenance, case-407 controlled PASS, and full regression 1469/1469. No parallel availability control plane was added.

### 6.1 覆盖来源

- BUG-077 的 host/subagent availability 部分：API 402 导致一批 work unit 在无产出前提下全部失败

### 6.2 目标

在批量 claim/spawn 前识别 delegated actor 是否可用，并为不可用状态提供明确、正式且可审计的继续或阻断路径，而不是依赖 API 402 作为唯一信号。

### 6.3 必须先做的设计决定

- availability probe 属于 setup、wave preflight 还是 work-unit claim；它必须能反映运行时 actor/model/account 状态变化。
- actor 不可用时是 fail-closed、切换允许的 role/model，还是允许 Phase Agent 承担受约束 fallback。
- 如果允许 Phase Agent fallback，如何证明它仍是 work-unit actor，而不是直接写 artifact/ledger 绕过 delegated authority。

### 6.4 In Scope

- 有界 availability preflight，不产生研究证据或虚假成功 receipt。
- 避免先 claim/spawn 一批已知不可执行的 work units。
- 记录 actor surface、probe outcome 和直接 blocker，不记录账户秘密或余额细节。
- 若采用 fallback：
  - 必须使用原 work-unit task/envelope、identity、result schema、runtime receipt 与 formal submit；
  - result/ledger 明确记录 execution actor class；
  - 不允许 Phase Agent 直接写 submitted ledger 或冒充 subagent receipt；
  - fallback 必须是显式 accepted path，不是隐式自动降级树。
- 若 fail-closed：提供最近可行动作和恢复后重新 claim/spawn 的幂等路径。

### 6.5 Out Of Scope

- 不修 cache/reference parser 合同；由 C1 处理。
- 不改变 evidence floor 或允许 snippet-only research。
- 不把 actor availability 变成长期全局 lifecycle mode。

### 6.6 验收

- actor unavailable fixture 不会产生一批 doomed claimed attempts。
- available path 继续使用正常 subagent work-unit lifecycle。
- fallback path（若批准）必须通过相同 submit/provenance gate，且 audit 能区分 actor class。
- unavailable → available 后可恢复执行，不要求手工编辑 queue/index/ledger。

## 7. C5 — `restore-audited-post-final-recovery`

### 7.1 覆盖来源

- BUG-078：terminal Final 后没有 sanctioned HITL2 rerun/reentry path
- Human Override plan C：human-directed authorized repair、reentry、state-seed
- BUG-079：禁止用 out-of-gate addendum 代替 canonical recovery
- Human Override plan §2：override 必须有审计，之后必须可校验

### 7.2 目标

在 C1/C3 已提供 integrity safety net 和 canonical intent/state 后，为明确的人类 post-final rerun 请求提供一条狭窄、可审计的 sanctioned recovery path；再在同一 authority model 下定义受限 maintenance/debug repair。

### 7.3 核心边界

- `human-directed` 只是 decision source，不是 Agent 可自填的 override flag。
- authorization signal 必须来自可信 host/session/command boundary，并有 threat model。
- post-final rerun 是一个具体业务操作；generic state-seed 是更高风险 maintenance operation。二者可以在一个 capability family 内，但必须使用不同 command/action enum 和 mutation allowlist。
- Final 历史交付与原 provenance 不得被悄悄重写；新 rerun 应保留 lineage。

### 7.4 In Scope

- 接收已由 C3 materialize 的 post-final rerun intent。
- 提供 Engine-owned reopen/reentry operation，建立合法 handoff/status/trace/queue window，而不是手写 trace。
- 对 authorization 写入 who/when/why/action/target/previous-state/new-state/lineage。
- 限制可修改 surface 和 transition；不允许任意文件编辑获得 authority。
- rerun 进入 canonical seed/wave path，复用现有 gate、work-unit、artifact 和 provenance contracts。
- 定义受限 state-seed/debug operation：只允许白名单 target，建立一致环境或明确拒绝。
- 每次 mutation 后自动或强制运行 C1 integrity audit；失败时给出 rollback 或一个最近 repair action。
- 定义重复调用、部分失败、rollback 和已有新 rerun coverage 冲突处理。

### 7.5 Out Of Scope

- 不创建第二套 Final-owned交互循环。
- 不允许修改既有 evidence/receipt/ledger 来伪造过去发生过的事实。
- 不把人类自然语言请求本身当作 machine-authenticated authorization。
- 不提供任意 state/file mutation shell。

### 7.6 验收

- 同一 post-final mutation 在 autonomous context 被拒绝，在可信 human-directed context 被审计执行。
- 成功后产生合法 canonical rerun handoff，新增 scope 进入 C3 identity/progress surface。
- 原 Final 交付与新 rerun lineage 均可追溯。
- mutation 后 C1 audit clean；若不 clean，操作回滚或明确停在可恢复状态。
- state-seed 只允许批准的 target，并能建立该 target 所需的最小一致环境。
- 不再需要 `_cache/addendum/`、`final/addendum/` 或手写 trace/status 作为成功路径。

## 8. 来源覆盖矩阵

| 来源义务 | C1 | C2 | C3 | C4 | C5 |
|---|---:|---:|---:|---:|---:|
| Breakpoint P1 crash-safe data | 诊断 | 主实现 | 消费 primitive | — | 消费 primitive |
| Breakpoint P2 topic×wave progress | 审计 | — | 主实现 | — | 消费 |
| Breakpoint P3 input materialization | 审计 | durability boundary | 主实现 | — | 消费 |
| Human A single-source identity | 审计 | — | 主实现 | — | 消费 |
| Human B atomic rename/renumber | 审计 | atomic primitive | 主实现 | — | 可调用 |
| Human C authorized repair/state-seed | 安全网 | durable mutation | canonical prerequisite | — | 主实现 |
| Human D integrity audit | 主实现 | 报告 orphan writes | 校验 integration | actor audit 可复用 | mutation 后强制使用 |
| BUG-077 contract opacity | 主实现 | — | — | — | — |
| BUG-077 API 402 | 诊断格式可复用 | — | — | 主实现 | — |
| BUG-078 post-final reentry | 报告缺失路径 | — | materialize prerequisite | — | 主实现 |
| BUG-079 canonical footprint | 主审计 | 数据 durability | 主实现 | — | 恢复 canonical route |

## 9. OpenSpec Propose 纪律

每个 change 的 proposal/design 必须回答：

1. 当前唯一 Source of Record 是什么？
2. 谁写、谁读、什么情况下失效？
3. 新增了什么 authority，删除或阻止了哪条旧平行路径？
4. 失败后给 Agent 的一个最近动作是什么？
5. 哪个 disposable incident-shaped experiment 证明真实行为？
6. 哪些来源条目在本 change 后可以关闭，哪些只能更新为 Partial？

禁止：

- 用 guideline wording 代替 runtime capability；
- 为恢复新增 watcher、daemon、chat interceptor 或隐式后台 controller；
- 让 human-directed 成为 Agent 可自授的持久 mode；
- 同时保留 canonical rerun 与 ad-hoc addendum 两条成功 authority；
- 通过手写 trace/status/ledger 修复 authority；
- 因为一个 root gap 生成多层级联 validator 噪声。

## 10. 实验与测试策略

回归测试继续位于 repo-root `tests/`，使用 `node:test`。Controlled E2E 使用 `experiments_playbook/exp_*/` 的真实 disposable bundle，不使用 mock/make-believe research completion。

建议 incident-shaped cases：

1. 完整 `.tmp` + 未 rename 崩溃；
2. 半截 `.tmp` + invalid hash；
3. 用户新增 topic 后、任何研究前立即崩溃；
4. rename/renumber 在中途写失败；
5. registry 5 topic，但 durable artifact 含第 6 个隐形 topic；
6. latest handoff 指向 Final，但 advice 建议不可达 HITL2 predecessor；
7. subagent availability probe 返回不可用；
8. autonomous post-final reopen 被拒绝；
9. trusted human-directed reopen 成功并进入 canonical rerun；
10. authorized mutation 后 integrity audit 发现 drift 并回滚/阻断。

## 11. 关闭条件

| 活跃来源 | 关闭条件 |
|---|---|
| `breakpoint-recovery-persistence-model.md` | C2 与 C3 已 apply/archive，P1/P2/P3 的 incident-shaped acceptance 全部通过 |
| `human-override-and-state-mutability.md` | C1、C3、C5 已 apply/archive，A/B/C/D 全部具有 Engine path 与审计 proof |
| BUG-077 | C1 关闭 contract-opacity 部分，C4 关闭 actor availability 部分；两者都完成后归档原混合 bug |
| BUG-078 | C5 的 sanctioned post-final rerun/reentry 真实 controlled case 通过 |
| BUG-079 | C1 可检测旧 incident，C3/C5 使新增 scope 只能 canonical-or-blocked，且不再依赖平行 addendum 成功路径 |

若某个 change 只完成 guidance/spec 而没有对应 runtime/controlled proof，只更新来源为 Partial，不得关闭。

## 12. Change 进度总览（Live Tracker）

> 每推进一个 change 的阶段（propose → apply → archive），就同步更新本表与对应章节的 `Status` 行；不要只改章节不改这里，否则会跟踪断线。
> 状态口径：**Not started** → **Proposing**（在 `openspec/changes/` 起草）→ **Applying**（按 task list 落 `DPT_FRAMEWORK/` 与 `tests/`）→ **Applied**（apply 完成、测试通过、待归档）→ **Archived**（已进 `openspec/changes/archive/`）。

| # | Change | 依赖 | 状态 | Version | 归档 slug / 备注 |
|---|---|---|---|---|---|
| C1 | `harden-recovery-observability-and-contracts` | — | ✅ Archived | v0.22 | `archive/2026-07-12-harden-recovery-observability-and-contracts` |
| C2 | `make-artifact-persistence-crash-safe` | C1 | ✅ Archived | v0.23 | `archive/2026-07-12-make-artifact-persistence-crash-safe`；main spec 已同步 |
| C3A | `establish-canonical-topic-state` | C1 + C2 durability boundary | ✅ Archived（worktree archive pending commit） | v0.24 | `archive/2026-07-12-establish-canonical-topic-state`；stable UID/intent/direct progress |
| C3B | `mutate-canonical-topic-layout` | C3A | 🚧 Applying | v0.26 | stable-UID rename/reorder/renumber、safe remove；historical path原位兼容，不做path/reference migration |
| C4 | `handle-unavailable-delegated-actors` | C1（独立执行 lane，可与 C2 并行）| ✅ Archived | v0.25 | `archive/2026-07-12-handle-unavailable-delegated-actors`；case-407、1469/1469 PASS |
| C5 | `restore-audited-post-final-recovery` | C1 + C3（消费 C2 crash-safe primitive）| ⏳ Not started | TBD | 最高风险 authority change，必须最后做 |

**推进顺序提醒：**

1. C1 ✅ → 已提供只读安全网。
2. C2/C4 ✅ 已 archive。
3. C3A ✅ 已 archive；C3B layout mutation正在 apply，完成后归档；C5仍保留post-final mutation/override边界。
4. C5 最后，依赖 C1 + C3，并复用 C2 crash-safe primitive。

**来源关闭追踪（与 §11 关闭条件对齐）：**

| 活跃来源 | 由哪些 change 关闭 | 当前状态 |
|---|---|---|
| `breakpoint-recovery-persistence-model.md` | C2 + C3 | Partial — C2完成durability；C3A完成canonical intent/direct progress，persist前host write与post-final边界仍开放 |
| `human-override-and-state-mutability.md` | C1 + C3 + C5 | Partial — C1完成D，C3A完成A；B转C3B，C等待C5 |
| BUG-077 | C1（contract-opacity）+ C4（actor availability）| Closed — 已移入 `_backlog/_done/_fixed_bugs/`；case-407与1469/1469通过 |
| BUG-078 | C5 | Open — 等 C5 |
| BUG-079 | C1（检测）+ C2（content durability）+ C3/C5（canonical-or-blocked）| Partial — legal HITL1/rerun canonical footprint由C3A完成；历史/post-final incident仍等待C5 |

> 提示：当某个来源的所有关联 change 都 Archived 且 controlled proof 通过时，才把来源从 Partial 改为 Closed，并把条目 move 下去——plan → `_backlog/_done/_closed_plans/`，bug → `_backlog/_done/_fixed_bugs/`，同时从 `_backlog/plans/README.md` / `_backlog/bugs/README.md` 索引移除；只完成 guidance/spec 不算关闭（见 §11）。5 个来源全部 Closed 后，本 overall plan 自身也 move 到 `_backlog/_done/_closed_plans/`。
