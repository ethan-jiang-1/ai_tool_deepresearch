---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Shared Library

A utility step shared by multiple workflow steps. Validates content cache read/execute separation.

```js
state.executionOrder.push('shared-lib.dep.md');
state.counters.sharedLib = (state.counters.sharedLib || 0) + 1;
traceEntry('md:executed', { node: 'shared-lib.dep.md' });
```
