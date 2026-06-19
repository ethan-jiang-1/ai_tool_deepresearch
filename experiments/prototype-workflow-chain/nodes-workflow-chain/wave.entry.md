---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Wave Entry (simple step, no dependencies)

This is the first step in the workflow. It has no dependencies — loading this entry returns its MD content and writes load state.

## Role in Experiment
验证 self-contained entry dynamic load：调用 `assessNode('wave.entry.md')` 时才加载当前 entry，不预读其他 MD。Engine 写入 executionOrder 和 counters，不执行 code block。
