---
{
  "requires": ["shared-lib.dep.md"],
  "req": "WFS-003"
}
---

# Repeat Step 1

First step that requires shared-lib.md. Validates file_read on first encounter.

```js
state.executionOrder.push('repeat-1.entry.md');
state.counters.repeatStep1 = (state.counters.repeatStep1 || 0) + 1;

traceEntry('md:executed', { node: 'repeat-1.entry.md', status: 'success' });
transition('repeat-1.entry.md', 'success');
```
