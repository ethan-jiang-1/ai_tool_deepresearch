---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Halt Node

Returns an undefined status that the FSM has no transition for. Should cause halt.

```js
state.executionOrder.push('halt.entry.md');
state.counters.haltNode = (state.counters.haltNode || 0) + 1;

traceEntry('md:executed', { node: 'halt.entry.md', status: 'undefined_status' });
transition('halt.entry.md', 'undefined_status');
```
