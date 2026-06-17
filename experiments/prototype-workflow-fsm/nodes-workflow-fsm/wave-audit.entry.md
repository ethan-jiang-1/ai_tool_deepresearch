---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Wave Audit (second FSM step)

Second step. Validates FSM advances correctly after wave-entry completes.

```js
state.executionOrder.push('wave-audit.entry.md');
state.counters.wave = (state.counters.wave || 0) + 1;

traceEntry('md:executed', { node: 'wave-audit.entry.md', status: 'success' });
transition('wave-audit.entry.md', 'success');
```
