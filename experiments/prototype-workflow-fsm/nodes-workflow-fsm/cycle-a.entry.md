---
{
  "requires": ["cycle-b.dep.md"],
  "req": "WFS-003"
}
---

# Cycle A

Part of a dependency cycle: A → B → A. Should be detected and halt.

```js
state.executionOrder.push('cycle-a.entry.md');
state.counters.cycleA = (state.counters.cycleA || 0) + 1;

traceEntry('md:executed', { node: 'cycle-a.entry.md', status: 'success' });
transition('cycle-a.entry.md', 'success');
```
