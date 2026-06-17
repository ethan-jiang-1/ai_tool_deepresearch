---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Retry Node

Fails on first execution (counter < 1), succeeds on second. FSM maps error → self, success → next.

```js
state.executionOrder.push('retry-node.md');
state.counters.retryNode = (state.counters.retryNode || 0) + 1;

if (state.counters.retryNode < 2) {
  transition('retry-node.md', 'error');
} else {
  transition('retry-node.md', 'success');
}
```
