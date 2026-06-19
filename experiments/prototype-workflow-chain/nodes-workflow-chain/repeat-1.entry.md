---
{
  "requires": ["shared-lib.dep.md"],
  "req": "WDM-001"
}
---

# Repeat Step 1

First step that requires shared-lib.md.

## Role in Experiment
验证 shared-lib.md 第一次被加载时记录 file_read，第二次被 repeat-step2.md 引用时记录 cache_hit 但仍重新执行。

```js
state.executionOrder.push('repeat-1.entry.md');
state.counters.repeatStep1 = (state.counters.repeatStep1 || 0) + 1;
traceEntry('md:executed', { node: 'repeat-1.entry.md' });
```
