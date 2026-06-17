---
{
  "requires": ["shared-lib.md"],
  "req": "WFS-003"
}
---

# Repeat Step 2

Second step that also requires shared-lib.md. Validates cache_hit on second reference + re-execution.

```js
state.executionOrder.push('repeat-step2.md');
state.counters.repeatStep2 = (state.counters.repeatStep2 || 0) + 1;

transition('repeat-step2.md', 'success');
```
