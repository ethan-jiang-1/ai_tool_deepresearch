---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Halt Node

Returns an undefined status that the FSM has no transition for. Should cause halt.

```js
state.executionOrder.push('halt-node.md');
state.counters.haltNode = (state.counters.haltNode || 0) + 1;

transition('halt-node.md', 'undefined_status');
```
