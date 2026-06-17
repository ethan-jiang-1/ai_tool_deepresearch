---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Wave Final (terminal FSM step)

Final step. FSM maps success → null (terminal). Validates complete outcome.

```js
state.executionOrder.push('wave-final.entry.md');
state.counters.wave = (state.counters.wave || 0) + 1;

traceEntry('md:executed', { node: 'wave-final.entry.md', status: 'success' });
transition('wave-final.entry.md', 'success');
```
