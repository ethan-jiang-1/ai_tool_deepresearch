# Tasks: prototype-gate-loop

## 1. 实验目录和类型定义

- [ ] 1.1 创建 `experiments/prototype-gate-loop/` 目录，包含 `tsconfig.json` 和最小 `package.json`
- [ ] 1.2 定义 `WorkflowState` 和 `GateResult` 类型（用 Zod schema）
- [ ] 1.3 定义 `Step` 接口：`{ name: string; execute(state: WorkflowState): WorkflowState }`

## 2. Gate 状态机

- [ ] 2.1 实现 `Gate` 类：`evaluate(state: WorkflowState): GateResult`
- [ ] 2.2 实现 `gateRouter`：显式 Map 转换表 `Map<GateResult, Step>`
- [ ] 2.3 模拟场景：pass 路由到 next segment，fail 路由到 repair

## 3. Repair Loop

- [ ] 3.1 实现 `repairLoop` 函数：含 `maxIterations` 上限（默认 3）
- [ ] 3.2 实现 state hash 检测：状态不变时提前终止
- [ ] 3.3 模拟场景：repair 1 次 → pass，repair 3 次耗竭 → escalate

## 4. 动态段加载

- [ ] 4.1 实现 `segmentRegistry`：`Map<string, Step>` + `loadNextSegment(key: string): Step`
- [ ] 4.2 模拟场景：Gate pass → 动态加载下一段，Gate fail → 加载 repair 段
- [ ] 4.3 模拟场景：未知 key 抛错

## 5. C&I 反馈环

- [ ] 5.1 实现 `checkAndReflect`：Zod `safeParse` → fail → 生成诊断 → 反馈
- [ ] 5.2 实现 `inspectFailure`：ZodError → 结构化诊断 `{ field, issue, fix }`
- [ ] 5.3 模拟场景：无效 state → Check fail → Inspect 诊断 → Repair → 重回 Check → pass

## 6. 端到端

- [ ] 6.1 串联所有组件：Gate → 路由 → Repair loop → 动态加载 → C&I 反馈
- [ ] 6.2 用 `node:test` 写一个端到端测试验证完整流程
- [ ] 6.3 文档：`EXPERIMENT.md` 记录实验结果、什么模式有效、什么需要调整
