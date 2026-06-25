## 集成测试结果 — 34 tests, 7 suites, 0 failures

- Step 1: Gate fork router (GAF-001)   PASS (6 passed, 0 failed)
  - evaluateBranch: pass / fail_a / fail_b / blocked 路由正确
  - forkRouter: 4 个分支返回正确 Step `{ branch, step }`
  - 优先级: fail_b (topic) 高于 fail_a (reference)
  - blocked 最高优先，即使同时满足 fail_a/fail_b

- Step 2: Conditional nodes (COS-001) PASS (7 passed, 0 failed)
  - 4 个 Step 各自执行独立逻辑
  - pass → wave_next, fail_a → topic repair, fail_b → ref repair, blocked → HITL
  - sharedRepairStep 直接测试：同时修复 ref + topic；blocked 不变
  - 每个分支产生不同的 state mutation，互不干扰

- Step 3: Fork repair converge (FOR-001) PASS (6 passed, 0 failed)
  - fail_a → shared repair → pass (ref_count 从 2 补到 5)
  - fail_b → shared repair → pass (topicReadiness 修复)
  - 双重问题 (fail_a + fail_b) → shared repair → pass
  - maxIterations 耗尽 → 返回 branch 名 (fail_a) 非 sentinel
  - blocked 立即退出，0 迭代
  - pass 立即退出，0 迭代

- Step 4: Loop + Fork composition       PASS (3 passed, 0 failed)
  - 完整链路: fork → fail_a → converge → re-fork → pass → advance
  - blocked 链路: fork → blocked → halt (无 repair)
  - pass 链路: fork → pass → advance (无 repair)

- Step 5: Dynamic node loading       PASS (2 passed, 0 failed)
  - 已知 node 加载正确
  - 未知 key 抛错

- Step 6: C&I feedback loop (CHI-002)   PASS (6 passed, 0 failed)
  - checkAndReflect: valid state → pass, invalid ref_count → fail
  - topicReadiness 校验：无效值被捕获
  - inspectFailure: 结构化诊断含 field/issue/code/fix
  - 完整 C&I 闭环: fail → Inspect → Repair → re-Check → pass

- Step 7: E2E full fork pipeline        PASS (4 passed, 0 failed)
  - fork → converge → C&I check → pass → dynamic load
  - 多问题 state (ref + topic) → runForkPipeline → C&I pass
  - blocked 立即停止，C&I 仍验证 state shape
  - 完整 trace: 所有 phase 就位 (fork/converge/re_fork/advance)

## Agent Test Playbooks (AGT-002)

3 级 playbook 位于 `experiments_playbook/exp_gate-fork/`:

| Level  | File                             | Bundle                | Events |
|--------|----------------------------------|-----------------------|--------|
| Simple | gate-fork/test-simple.md         | dpt_rb_test_gf_simple | 4      |
| Medium | gate-fork/test-medium.md         | dpt_rb_test_gf_medium | 9      |
| Complex| gate-fork/test-complex.md        | dpt_rb_test_gf_complex| 17     |

与 gate-loop playbook 的差异:
- 使用 `evaluateBranch` / `forkRouter` / `convergeRepair` 替代 gate-loop API
- WorkflowState 包含 `topicReadiness` 字段
- Complex 级别额外测试 C&I topicReadiness 校验
- Bundle 前缀 `dpt_rb_test_gf_` 区别于 gate-loop 的 `dpt_rb_test_gl_`

## Experiment Conclusions

1. **1→N Fork 模式验证成功**。`evaluateBranch()` 正确实现了多维状态判断，4 个分支各有独立逻辑路径。优先级路由（blocked > fail_b > fail_a > pass）确保多维条件重叠时结果确定。

2. **共享 Repair 汇聚有效**。`convergeRepair()` 能让多个 fail 分支汇聚到同一个 repair 段，修好后重回 Gate 重判。同一个 state 修复后可以从 fail_a 变 pass。

3. **Loop + Fork 正交可组合**。`runForkPipeline()` 展示了 fork 决定"去哪里"，converge（内部 loopback）决定"怎么修"——两者互补无冲突。实验保持独立，不 import gate-loop。

4. **C&I 反馈环适配成功**。`checkAndReflect()` + `inspectFailure()` 正确校验 fork 版 WorkflowState（含 `topicReadiness` 枚举），与 gate-loop 的 C&I 模式一致但独立实现。

5. **与 gate-loop 的差异**：`convergeRepair` 在 maxIterations 耗尽后返回具体 branch 名（如 `"fail_a"`），而非 gate-loop 的 `"escalated"` 哨兵值。这个选择保持了 fork 路由的语义透明——调用方可以看到"卡在哪个分支上"。

6. **命名对齐**：两个实验使用一致的 API 命名约定 (evaluate/evaluateBranch, router/forkRouter, repairLoop/convergeRepair, nodeRegistry/loadNextNode)，便于将来抽象到共用库。
