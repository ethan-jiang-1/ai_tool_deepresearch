---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Retry Next (after retry success)

Comes after retry-node succeeds. Terminal node.

```js
state.executionOrder.push('retry-next.md');
state.counters.retryNext = (state.counters.retryNext || 0) + 1;

transition('retry-next.md', 'success');
```
