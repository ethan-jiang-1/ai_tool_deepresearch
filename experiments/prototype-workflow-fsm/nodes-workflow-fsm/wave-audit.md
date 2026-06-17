---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Wave Audit (second FSM step)

Second step. Validates FSM advances correctly after wave-entry completes.

```js
state.executionOrder.push('wave-audit.md');
state.counters.wave = (state.counters.wave || 0) + 1;

transition('wave-audit.md', 'success');
```
