# Active Todos — 活跃 todo + 依赖链 + 执行顺序

> 最后更新: 2026-07-15 | `_backlog/todos/` — 活跃 todo 在此，做完移入 [`../_done/_done_todos/`](../_done/_done_todos/)。
>
> **本文件是所有活跃工作的中枢。** todo 没有编号，文件名即标识。完成后文件名不变，位置即状态。
>
> **2026-07-15 基线同步：** repair-rerun-added-topic-bootstrap 已落地并归档（94 files, +7850/-3307）。Gate hints 系统、contract lineage、consistency-validator、recover-declaration、routed rerun pipeline 均已就位。BUG-069 契约自洽已修复，coding-agent-setup-ux 已关闭归档。P0 可跑性车道已清空。
>
> **2026-07-09 地基对齐：** work-unit + ledger + `ref-count.mjs` + HITL UX + BUNDLE_MAP 已落地；README 与若干 todo 仍停在 CandidateCard / `fail_c` / START_FROM_HERE /「extraction ~60%」叙事 — 已按当前系统收窄。

## 完成一个 todo 的步骤

1. `git mv todos/todo-<name>.md _done/_done_todos/todo-<name>.md`
2. 更新 `_done/_done_todos/README.md`（加一行）
3. 更新本文件（删掉该 todo）
4. 更新 `../_done/README.md`（DONE 计数 +1）

**todo 和 bug 不同——todo 没有编号，只有 slug 名。命名权威是文件名本身。**

---

## 活跃列表

| # | 文件 | 优先级 | 简述 | 阻塞 / 备注 |
|---|------|--------|------|-------------|
| 1 | `todo-evidence-quality.md` | **高（已收窄）** | **语义** discard（substance/tier/…）；结构计数已 DONE | 勿重做 CCC/`fail_c`/CandidateCard |
| 2 | `todo-phase-recover.md` | **中–高（部分实现）** | 失焦时从 BUNDLE_MAP + status 重定位 | post-final-recovery、consistency-validator、recover-declaration 已落地；Agent-facing 恢复程序仍缺 |
| 3 | `todo-explore-exploit.md` | **中（已收窄）** | Engine `WaveStats` 投影；§4 散文已有 | 等 quality 语义信号；wave-contract evaluators 可作输入 |
| 4 | `todo-final-output-eval.md` | **低–中** | 交付前自评 → auto_rerun | ≠ wave degraded pass；rerun pipeline 已有，auto-eval 逻辑仍缺 |
| 5 | `todo-helper-not-tool.md` | **北星 / 实施延后** | 同事人格层 | 硬前置 069 + setup-ux 已满足；等 quality/recover 稳定后再抬 |
| 6 | `todo-user-knowledge-hang.md` | **中** | 小白可挂的「找/鉴/写」Markdown 知识包 | 越简单越好；软约束，不改 gate |
| 7 | `todo-hooks-deferral.md` | **延后（条件改善）** | workflow boundary hooks | evidence ownership ✅；069 已修复，phase-recover 方向更清楚 |
| 8 | `todo-context-reground.md` | **parked** | head re-ground | 等 recover 草稿；真相源 = BUNDLE_MAP |

### 本轮已移出活跃

| 文件 | 处置 |
|------|------|
| `todo-evidence-extraction.md` | ✅ **DONE-015** — 核心已落地（ledger + `countReferences`/`isCountable` + cache_coverage）；残余并入 evidence-quality |
| BUG-069（外部） | ✅ **已修复** — 移入 `_done/_fixed_bugs/`；P2 降级，5/6 failure point 已修；gate hints + contract lineage 系统性解决契约漂移 |
| `todo-coding-agent-setup-ux` | ✅ **已关闭** — 移入 `_done/_closed_plans/ux-coding-agent-permissions-setup.md` |

---

## 依赖链（2026-07-15 重写）

### 已完成地基（勿再当「下一步」）

```mermaid
flowchart LR
  S["✅ wave1-sufficiency-gates<br/>+ research-styles"]
  E["✅ evidence-extraction core<br/>ref-count + ledger + CCC"]
  H["✅ hitl-ux + silent-execution<br/>+ degraded pass"]
  B["✅ BUNDLE_MAP + current_node<br/>+ work-unit / dry-submit"]
  R["✅ repair-rerun<br/>gate hints + contract lineage<br/>consistency-validator<br/>recover-declaration<br/>routed rerun pipeline"]
  S --> E
  H --- B
  R --- E
  R --- B
```

**2026-07-15 新增地基：** repair-rerun 带来了 gate hints（结构化 repair 方向）、contract lineage（Agent/Engine 契约自洽）、consistency-validator（workflow package 全量校验）、recover-declaration（从 owners + hash 重建 ledger row）、routed rerun pipeline（新增 topic 走正常 Wave0/Wave1 队列）。

### 核心研究质量流水线（收窄后）

```mermaid
flowchart LR
  E["✅ extraction 结构可数"]
  Q["evidence-quality<br/>语义 discard ONLY"]
  X["explore-exploit<br/>Engine 投影 + 已有 §4"]
  F["final-output-eval<br/>run 级 deliver/auto_rerun"]
  E --> Q --> X --> F
```

**关键纠正：**

- extraction → quality 不再是「解锁计数」— 计数已解锁；quality 只补**语义**层
- 删除 CandidateCard / promote / `fail_c` 作为默认路径叙事
- wave **degraded pass** ≠ run **auto_rerun**

### 可跑性车道（P0 已清空 ✓）

```mermaid
flowchart LR
  B69["✅ BUG-069 契约自洽"]
  SETUP["✅ coding-agent-setup-ux"]
  REC["phase-recover<br/>BUNDLE_MAP 程序"]
  B69 --> SETUP
  SETUP --> REC
```

P0 阻塞项（BUG-069 + setup-ux）已清零。phase-recover 是这条车道上唯一剩余项，已有 post-final-recovery + consistency-validator + recover-declaration 基础设施，缺的是 Agent-facing 恢复程序。

### 人格 / 预防 / 用户口味（延后或中优先）

```mermaid
flowchart LR
  KNOW["user-knowledge-hang<br/>三节 MD 挂载"]
  HELP["helper-not-tool<br/>北星延后"]
  REG["context-reground<br/>parked"]
  KNOW -.-> HELP
  REC2["phase-recover 草稿"] --> REG
```

`user-knowledge-hang`：静态口味包，小白可挂；**先于** helper 跨 run 记忆。不阻塞 P0。

### Hooks

延后。前驱「evidence ownership」已满足；BUG-069 已修复，phase-recover 方向更清楚——解锁条件改善。`workflows/hooks/` 仍不存在。≠ coding-agent PreToolUse。

---

## 推荐执行顺序（2026-07-15）

P0 可跑性阻塞已清零。当前排序按研究质量流水线 + 恢复能力优先：

```mermaid
flowchart LR
  subgraph P1["P1"]
    Q["evidence-quality 语义"]
    R["phase-recover"]
  end
  subgraph P2["P2"]
    X["explore-exploit"]
  end
  subgraph LATER["更后"]
    F["final-output-eval"]
    H["helper-not-tool"]
    HK["hooks"]
    C["context-reground"]
    K["user-knowledge-hang"]
  end
  P1 --> P2 --> LATER
```

| 顺序 | 项 | 为什么 |
|------|-----|--------|
| 1 | evidence-quality（窄） | 结构可数已有；补语义 discard。不再被 BUG-069 阻塞 |
| 1′ | phase-recover | 真跑失焦 / 超时现场需要；infra 已有，补 Agent-facing 程序 |
| 2 | explore-exploit | 在已有 §4 + wave-contract evaluators 上加 Engine 投影 |
| 3 | final-output-eval | pipeline 末端；rerun pipeline 已有，缺 auto-eval |
| 4 | helper-not-tool / hooks / reground / user-knowledge-hang | 北星或 parked；user-knowledge-hang 最简单，可随时插入 |

---

## 分析文档中标记但未建 TODO 的待办

| 来源 | 内容 | 状态 |
|------|------|------|
| `_done/_old_topics/_guideline/terminology-gap-audit.md` | ~253 处术语 gap | 无执行计划；低优先 |
| `_done/_old_topics/_trainsistion/` | Transition 层清理 | 发现但未建 change；多数 FSM 问题可能已随 WFF 归档消化 — 启用前先核对 |
| `_backlog/plans/ux-user-facing-chinese-first-outside-waves.md` | prefer-Chinese 软提示 | 可并入 helper 极轻步或独立小 change；可不立项 |
| `todo-user-knowledge-hang.md` | 用户「找/鉴/写」口味包挂载 | 活跃 todo；比 helper 记忆简单，可先于人格层 |
| `_backlog/plans/seed-backfill-round-continuity.md` | backfill tokens 仅首轮消费，round 2+ 不重新注入 | **P0 设计缺陷**，非 todo；需单独 change |
| `_backlog/_done/_closed_plans/agent-output-linter.md` | Agent 输出 direct-contract feedback | 已由 `reuse-delegated-output-contracts-at-submit` v0.38 落地并归档（CLS-032） |
