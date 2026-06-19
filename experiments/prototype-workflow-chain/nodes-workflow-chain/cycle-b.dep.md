---
{
  "requires": ["cycle-a.entry.md"],
  "req": "WMD-001"
}
---

# Cycle B

Depends on cycle-a.md, which depends back on cycle-b.md — forming a cycle.

## Role in Experiment
验证 cycle 错误消息包含完整路径：cycle-b.md -> cycle-a.md -> cycle-b.md。

```js
// This should never execute due to cycle detection
state.executionOrder.push('cycle-b.dep.md');
```
