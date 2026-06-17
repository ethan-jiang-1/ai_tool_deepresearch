---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Wave Final (terminal FSM step)

Final step. FSM maps success → null (terminal). Validates complete outcome.

```js
state.executionOrder.push('wave-final.md');
state.counters.wave = (state.counters.wave || 0) + 1;

transition('wave-final.md', 'success');
```
