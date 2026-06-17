---
{
  "requires": ["cycle-b.md"],
  "req": "WMD-001"
}
---

# Cycle A

Entry point for cycle detection test. Requires cycle-b.md, which requires cycle-a.md back — creating a cycle.

## Role in Experiment
验证 cycle 检测：a -> b -> a 被捕获，advance 返回 error，cursor 不前进。

```js
// This should never execute due to cycle detection
state.executionOrder.push('cycle-a.md');
```
