# Invariants Brief（不变量简报）

> 角色：新 Agent onboarding 基线。**非权威**：每条要么可直接机器验证，要么明确指向唯一真相源。
> 本简报不授予 authority / capability / permission / liveness / evidence，不覆盖 accepted spec 与
> executable contract，也不构成第三条术语正典（术语正典见根 `CONTEXT.md` 与 execution-model guidance）。
> 当某条事实与其真相源不一致时，以真相源为准并修正本条（同 change 内跑相应确定性检查）。
> 引用坐标均以当前工作树为准；带 `#` 的为锚点，其余为 bare file coordinate。

## 不变事实

1. **三者不互替**：Agent 供语义判断，Engine 供确定性裁决，Markdown 供流程呈现；任何一层不替另一层。
   → 真相源：`openspec/constitution/project-charter.md`（Constitutional Core）。
2. **运行时真相只在 current run bundle root**：显式选中的 bundle root 是唯一 runtime truth 根；裸路径（`rb_queue.json`、`_cache/`、`final/` 等）都相对它解析，不相对 repo root 或 `DEEP_RESEARCH_HARNESS/`。
   → 真相源：`DEEP_RESEARCH_HARNESS/README.md`（运行时边界）+ `CONTEXT.md`（三坐标）。
3. **框架只读有两层**：运行时 scope（run 期间不把 run 内容写回框架）+ 生命周期 scope（`/opsx:apply` 前框架代码只读）；两层不同、互相不替代。
   → 真相源：`DEEP_RESEARCH_HARNESS/README.md`（目录性质）+ 根 `AGENTS.md`/`CLAUDE.md`（OpenSpec phase gate）。
4. **停止授权以代码枚举为唯一真相**：`engine/queue-manager-core.mjs` 的 `StopAuthorizationState` 枚举 4 值；`syncQueueHealth` 实际写入 `empty_queue_after_refill`（drain 后停止）与 `unauthorized_continue_required`（继续）；`final_delivery` / `decision_blocker` 是保留值、当前无代码写入。
   → 真相源：`DEEP_RESEARCH_HARNESS/engine/queue-manager-core.mjs#StopAuthorizationState`。
5. **submit 语义**：正常 `submit` 只接受 claimed attempts；同 hash 重复 = 幂等成功，仅不同内容重复才拒绝；delegated 完成只看 submitted ledger 行，不看文件系统存在。
   → 真相源：`openspec/specs/agent/delegated-work-units/spec.md` + `DEEP_RESEARCH_HARNESS/RUN.md`。
6. **恢复边界**：work-unit 恢复遵守"同一 checkpoint 重跑"或"显式 terminalize + 新路径"；绝不手改 ledger / index / status / queue / lock / journal / hash。
   → 真相源：`DEEP_RESEARCH_HARNESS/RUN.md`（work-unit recovery 段）。
7. **反馈第一动作读 closed enum**：`hints[]` / continuation cue / `check.next` 带"一个下一步"，不猜字段名；repair 后重跑同一 checkpoint。recovery 反馈面现状：五个工作单元反馈面（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）统一发出 `attempt_disposition` + `next` 形状；`repair_kind` 为 CLI 动词拼写（`recover-transaction` / `recover-declaration` / `supersede` / `wait` / `missing_contract`）；恢复结果（含 `recover-transaction` / `recover-declaration`）携带 `next` 重跑坐标，不是死胡同；disposition → `repair_kind` → CLI 动词的映射由 `RUN.md` 决策表 + 锁定测试固化。
   → 真相源：`DEEP_RESEARCH_HARNESS/engine/work-unit-attempt-disposition.mjs`、`DEEP_RESEARCH_HARNESS/RUN.md`（决策表）、`tests/engine/work-unit-recovery-decision-table.test.mjs`。
8. **交互点只有 HITL1/HITL2**：Final 是 terminal lifecycle delivery，deliver-first、接受 presentation feedback，但不是第三个 checkpoint。
   → 真相源：`openspec/specs/bundle/run-entry/spec.md`（RUE-004）。
9. **入口选择单一源**：完整规则只在 `command_playbook/continue-run-bundle.md` 的 "Entry Selection (canonical)" 节；显式 existing bundle candidate 先过同根 `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` pair，缺一即 `unsupported_current_entry_contract` 并停止；无 explicit candidate 才读 `RUN.md`；扫描/裸文件名/不可达不选择 run。
   → 真相源：`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md#Entry Selection (canonical)`。
10. **测试四类与放置**：`unit` / `integration` / `deterministic_e2e` 在 `tests/`，`agent_flow_e2e` 在 `experiments_playbook/`；JS 测试只在 `tests/`，框架目录不放测试。
    → 真相源：`openspec/specs/verification/verification-routing/spec.md`。
11. **工程约束**：Node >=20、纯 ESM JavaScript、无 TypeScript/Python；依赖只有 `zod` / `yaml`。
    → 真相源：根 `AGENTS.md`/`CLAUDE.md`（Hard Rules）。
12. **trace 是真相、log 是解释**：pass/fail 等确定性事实从 `rb_trace.jsonl` 判，不从 console 输出判。
    → 真相源：`openspec/operations/logging-conventions.md` + `DEEP_RESEARCH_HARNESS/rb_templates/rb_trace.jsonl`。
13. **反馈不创造权限**：Engine 说 `missing_contract` 就停在边界；不手写 authority、不建平行路径、不把 advisory 当 permission。
    → 真相源：`openspec/specs/engine/runtime-reentry-debuggability/spec.md`（RRD-008）+ `DEEP_RESEARCH_HARNESS/RUN.md`。
14. **术语正典**：`queue_item_id` = queue demand；`work_id` = work-unit attempt；`submit` = 唯一正常完成边界；`main-agent` / `sub-agent` 只作 wire 值不作概念角色。
    → 真相源：根 `CONTEXT.md` + `openspec/guidance/models/agentic-execution-model.md`。
15. **一个下一步**：每轮行动只执行 feedback 给的"一个下一步"（continuation cue / `check.next` / repair 后重跑同一 checkpoint）；非 HITL 的 `stop: no` phase 不主动提问、汇报或等待 acknowledgement。
    → 真相源：`openspec/specs/bundle/run-entry/spec.md`（RUE-004）+ `openspec/specs/agent/agent-command-surface/spec.md`（ACS-001）。

## 维护规则

- 本条目的任何事实与真相源冲突时，改本条目、不改真相源；并在同一 change 内跑可验证该事实的确定性检查。
- 新增条目必须满足"可直接机器验证 或 指向唯一真相源"；不得把机制名写成规则（机制名只能作为事实的指针载荷出现）。
- 本文件不进入任何 phase 闭包（lazy-load）：AGENTS.md 首屏只放引用行。
