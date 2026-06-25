---
{
  "requires": ["diamond-a.dep.md", "diamond-b.dep.md"],
  "req": "WMD-001"
}
---

# Diamond Entry

Entry point requiring both diamond-a.md and diamond-b.md, which both require diamond-shared.md.

## Role in Experiment
验证菱形依赖去重：shared.md 在同一次 load graph 中只进入 plan 一次，只加载一次。
