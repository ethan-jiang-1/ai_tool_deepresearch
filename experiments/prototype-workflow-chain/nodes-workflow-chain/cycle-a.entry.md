---
{
  "requires": ["cycle-b.dep.md"],
  "req": "WMD-001"
}
---

# Cycle A

Entry point for cycle detection test. Requires cycle-b.md, which requires cycle-a.md back — creating a cycle.

## Role in Experiment
验证 cycle 检测：a -> b -> a 被捕获，load 返回 error 且不执行任何文件。

```js
// This should never execute due to cycle detection
state.executionOrder.push('cycle-a.entry.md');
```
