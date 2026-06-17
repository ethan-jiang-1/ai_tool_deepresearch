---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Shared Library

A utility step shared by multiple workflow steps.

## Role in Experiment
验证内容缓存的 read/execute 分离：第一次 file_read + file_executed，后续 cache_hit + file_executed。

```js
state.executionOrder.push('shared-lib.dep.md');
state.counters.sharedLib = (state.counters.sharedLib || 0) + 1;
traceEntry('md:executed', { node: 'shared-lib.dep.md', counter: state.counters.sharedLib });
```
