---
{
  "requires": ["shared-lib.dep.md"],
  "req": "WDM-001"
}
---

# Repeat Step 1

First step that requires shared-lib.md.

## Role in Experiment
验证 shared-lib.md 第一次被加载时记录 file_read，第二次被 repeat-step2.md 引用时记录 cache_hit 但仍重新 load。
