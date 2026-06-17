---
{
  "requires": ["nonexistent-file.md"],
  "req": "WFS-003"
}
---

# Missing Entry

Requires a dependency that does not exist. Should halt with error about missing file.

```js
state.executionOrder.push('missing.entry.md');
state.counters.missingEntry = (state.counters.missingEntry || 0) + 1;

traceEntry('md:executed', { node: 'missing.entry.md', status: 'success' });
transition('missing.entry.md', 'success');
```
