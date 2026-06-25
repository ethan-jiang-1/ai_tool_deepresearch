---
{
  "requires": ["shared-lib.dep.md"],
  "req": "WDM-001"
}
---

# Repeat Step 2

Second step that also requires shared-lib.md (same as repeat-step1.md).

## Role in Experiment
验证 shared-lib.md 内容缓存命中（cache_hit 而非 file_read），但仍产生新的 file_loaded。
