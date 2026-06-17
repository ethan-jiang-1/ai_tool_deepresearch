---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Retry Next (after retry success)

Comes after retry-node succeeds. Terminal node.

```js
state.executionOrder.push('retry-next.entry.md');
state.counters.retryNext = (state.counters.retryNext || 0) + 1;

traceEntry('md:executed', { node: 'retry-next.entry.md', status: 'success' });
transition('retry-next.entry.md', 'success');
```
