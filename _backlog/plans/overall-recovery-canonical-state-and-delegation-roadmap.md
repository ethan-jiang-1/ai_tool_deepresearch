# Overall Plan: Recovery、Canonical State 与 Delegated Reliability 五 Change 总控路线

**性质:** 跨 plan / bug 的 OpenSpec change 总路线（pre-OpenSpec）
**状态:** Active — 已完成五段切片，待按顺序逐个 `/opsx:propose`（2026-07-12）
**前置基础:** `align-recovery-with-simple-helper-posture`（v0.21）已建立 helper-oriented、`materialize-before-work`、`canonical-or-blocked` 与依赖带，但未实现本计划的核心 runtime 能力。

## 0. 来源与目标

本路线统一承接以下活跃来源：

- [`breakpoint-recovery-persistence-model`](breakpoint-recovery-persistence-model.md)
- [`human-override-and-state-mutability`](human-override-and-state-mutability.md)
- [BUG-077](../bugs/BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md)
- [BUG-078](../bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md)
- [BUG-079](../bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md)

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

**Status (2026-07-12): Applied.** Canonical incident detection、root-grouped recovery summary、reachable/missing-contract feedback、Wave0/return-map repair 与 shared cache contract 已落地。下一批可独立 propose/apply 的工作是 C2 crash-safe persistence 与 C4 delegated actor availability；C3/C5 仍按依赖顺序等待。

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

### 4.1 覆盖来源

- Breakpoint plan P1：数据过手即存、crash-safe、orphan finalize/discard
- BUG-079：非 canonical recovery 现场中已经抓取但未 finalize 的真实数据

### 4.2 目标

任何已经取得或完成生成的数据，在 acquisition/write boundary 进入统一的 crash-safe durable path；进程在最终 rename 前死亡时，恢复工具可以确定性判断保留还是丢弃。

### 4.3 In Scope

- 盘点现有 artifact/cache/control writer，选择一个共享 atomic-write primitive。
- 定义临时文件、目标路径、内容 hash、完成标志和必要 fsync 顺序。
- 提供窄 `sweep`/recovery operation：
  - 完整且 hash 匹配的 orphan write → finalize；
  - 不完整、无可信 sidecar 或 hash 不匹配 → discard/quarantine；
  - 每个动作写入既有 audit/log surface。
- 覆盖 fetched page、reference/evidence card、dossier/交付 artifact；控制文件是否复用同一 primitive 由 propose audit 决定。
- 明确重复执行、崩溃重入和 sweep 幂等性。

### 4.4 Out Of Scope

- 不新增 topic progress schema。
- 不决定 post-final rerun route。
- 不把 filesystem mtime 当业务完成 authority。
- 不为每种 artifact 建立独立 journal subsystem。

### 4.5 验收

- 注入“内容写完但 rename 未发生”的崩溃，sweep 后目标文件正确出现且无重复。
- 注入半截内容或 hash mismatch，sweep 不得把它认证为正式 artifact。
- sweep 重复运行结果稳定。
- 正常写入路径没有遗留 sidecar/tmp。
- audit/log 能说明 finalize/discard 的直接原因。

## 5. C3 — `establish-canonical-topic-state`

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

## 12. 推荐下一步

第一个 `/opsx:propose` 应为：

```text
harden-recovery-observability-and-contracts
```

原因：

- 只读、风险最低；
- 可立即把 BUG-079 现场变成确定性诊断；
- 为 C3/C5 提供安全网；
- 同时收掉 BUG-077 已经缩小的 contract-opacity 尾巴；
- 可以优先复用现有 `check-reentry`、`file-observability` 与 inspect helpers，符合 simple reliable control。

完成 C1 后，C2 与 C4 可以按资源分别 propose；C3/C5 必须保持依赖顺序。
