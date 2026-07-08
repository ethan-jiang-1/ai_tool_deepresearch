# BUG-062 — Phase Agent 被动等待 sub-agent 通知，无主动轮询机制

| 属性 | 值 |
|------|-----|
| ID | BUG-062 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 导致 Phase Agent 在 sub-agent 已完成工作后仍长时间空等，浪费 wall-clock time |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run 中发现 |
| 影响范围 | 所有 delegated phase（wave0, wave1, wave2）的 Phase Agent 执行行为 |

---

## 0. 一句话

**Phase Agent spawn sub-agent 后进入被动等待状态——依赖后台 task-notification 推送才继续行动——而不是主动轮询文件系统检查 sub-agent 产出物是否已就绪。用户必须反复敲"继续"来触发 Agent 重新检查状态。**

---

## 1. 现象

在本次 FOSE research run 中：

1. Phase Agent spawn 5 个 wave1 sub-agent（topics 01-05）到后台
2. Agent 输出 "等待通知" 后停止行动
3. 用户敲 "继续" → Agent 检查 → 发现 topics 02/03/04/05 的 `evidence-summary.md` **已经全部写完**（17-32KB），cache leaves 也已全部就位
4. 说明 sub-agent 在用户敲 "继续" 之前就已经完成了——Agent 在**空等**

同样模式在 wave0 阶段也出现：Agent spawn sub-agent 后进入 ScheduleWakeup 等待，需要用户主动推进才继续。

---

## 2. 为什么这是 bug

**stop: no phase 的语义是 "Agent 自主完成，不暂停请求用户输入"——不是 "Agent 自主等待，等用户敲继续"。**

被动等待违反了两个契约：
1. **stop: no 契约**：Phase Agent 应持续自主执行，不暂停
2. **执行效率**：sub-agent 每次运行 6-12 分钟。如果 Phase Agent 不主动轮询，实际 wall-clock 会膨胀 2-3 倍（sub-agent 完成 → 用户看到 + 敲继续 → Agent 响应 的延迟）

---

## 3. 根因

Phase Agent 的行为模式是 **事件驱动等待**（等待 `<task-notification>` XML 标签出现在上下文中），而非 **主动轮询**（定期检查文件系统）。

具体来说：
- Sub-agent 通过 `Agent` 工具 spawn 到后台（`run_in_background: true`）
- 完成后系统会插入 `<task-notification>` 到上下文
- Phase Agent 依赖这个通知来触发下一步动作
- 但通知到达有延迟（~30s-2min），且 Agent 在等待期间**不做任何事**

**正确行为应该是**：spawn sub-agent 后，进入主动轮询循环——每 60-90 秒检查一次 `result.json` 是否已写入。一旦检测到文件存在，立即开始 fix → submit 流程，不等通知。

---

## 4. 与已有 Bug 的关系

| Bug | 关系 |
|-----|------|
| BUG-046 (wave0 串行执行) | 相关：如果 Phase Agent 能主动轮询 + 并行处理，wave0/wave1 的 wall-clock 可以接近最慢的单个 sub-agent 时间 |
| BUG-060 (contract mismatch) | 相关：被动等待放大了 BUG-060 的修复延迟——sub-agent 完成 2 分钟后 Phase Agent 才开始 fix，浪费了可以并行修复的时间窗口 |

---

## 5. 修复方向

**Phase Agent 侧（行为契约）**：

Phase Agent 在执行 delegated drain loop 时，应遵循以下模式：

```
1. spawn sub-agent (background)
2. while sub-agent not complete:
     sleep 60-90s
     check if result.json exists in work_unit_dir
     if exists: break
3. fix result.json + receipt (BUG-060 mitigation)
4. submit
5. backfill
```

**不需要改 engine 代码**——这是 Phase Agent 的运行时行为改变。可以在 `shared-silent-execution.md` 或 phase MD 的 §3.2 中增加轮询指令。

**可选 engine 增强**：
- `operate-work-unit.mjs` 增加 `wait` 子命令：block until `result.json` exists or timeout
- 这样 Phase Agent 可以用 `operate-work-unit wait --work-id <id> --timeout 600` 替代手动 sleep+check
