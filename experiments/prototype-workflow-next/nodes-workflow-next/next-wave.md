---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Next Wave (self-contained entry, no dependencies)

Independent entry kept as an additional self-contained fixture.

## Role in Experiment
验证 self-contained MD 可作为显式 entry 单独加载执行。

```js
state.executionOrder.push('next-wave.md');
state.counters.nextWave = (state.counters.nextWave || 0) + 1;
```
