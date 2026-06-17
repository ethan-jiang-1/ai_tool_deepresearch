---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Next Wave (simple step, no dependencies)

Third and final workflow step.

## Role in Experiment
验证 workflow complete — cursor 到末尾后返回 complete 且无新 read/execute。

```js
state.executionOrder.push('next-wave.md');
state.counters.nextWave = (state.counters.nextWave || 0) + 1;
```
