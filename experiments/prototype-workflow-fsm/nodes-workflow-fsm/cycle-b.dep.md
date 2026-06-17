---
{
  "requires": ["cycle-a.entry.md"],
  "req": "WFS-003"
}
---

# Cycle B

Completes the cycle: B → A → B. Should be detected during DFS.

```js
state.executionOrder.push('cycle-b.dep.md');
state.counters.cycleB = (state.counters.cycleB || 0) + 1;
traceEntry('md:executed', { node: 'cycle-b.dep.md' });
```
