---
{
  "requires": ["shared-lib.dep.md"],
  "req": "WFS-003"
}
---

# Repeat Step 2

Second step that also requires shared-lib.md. Validates cache_hit on second reference + re-execution.

```js
state.executionOrder.push('repeat-2.entry.md');
state.counters.repeatStep2 = (state.counters.repeatStep2 || 0) + 1;

traceEntry('md:executed', { node: 'repeat-2.entry.md', status: 'success' });
transition('repeat-2.entry.md', 'success');
```
