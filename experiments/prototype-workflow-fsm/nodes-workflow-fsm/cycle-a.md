---
{
  "requires": ["cycle-b.md"],
  "req": "WFS-003"
}
---

# Cycle A

Part of a dependency cycle: A → B → A. Should be detected and halt.

```js
state.executionOrder.push('cycle-a.md');
state.counters.cycleA = (state.counters.cycleA || 0) + 1;

transition('cycle-a.md', 'success');
```
