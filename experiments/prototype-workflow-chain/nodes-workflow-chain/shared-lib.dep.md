---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Shared Library

A utility step shared by multiple workflow steps.

## Role in Experiment
验证内容缓存的 read/load 分离：第一次 file_read + file_loaded，后续 cache_hit + file_loaded。Engine 每次加载写入 executionOrder 和 counters。
