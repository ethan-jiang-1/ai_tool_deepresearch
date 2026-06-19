---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Wave Entry (simple step, no dependencies)

This is the first step in the workflow. It has no dependencies, so advancing to this step should load and execute only this file.

## Role in Experiment
验证 self-contained entry dynamic load：调用 `loadNextMarkdown('wave.entry.md')` 时才加载当前 entry，不预读其他 MD。

```js
state.executionOrder.push('wave.entry.md');
state.counters.wave = (state.counters.wave || 0) + 1;
traceEntry('md:executed', { node: 'wave.entry.md', wave: state.counters.wave });
```
