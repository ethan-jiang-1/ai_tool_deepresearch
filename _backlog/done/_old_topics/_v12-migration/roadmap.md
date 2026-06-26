# 实现路线图

## 依赖顺序

```
schema-core ✅
    │
    ├── schema-core-hitl ✅
    │
    ├── prototype-start-from-here ✅
    │       │
    │       └── test-infra ✅
    │
    ├── prototype-gate-loop ✅
    │
    └── prototype-gate-fork ✅
```

## 进度

| Change | Tasks | 状态 |
|--------|-------|------|
| schema-core | 20 | ✅ archived |
| schema-core-hitl | 11 | ✅ archived |
| prototype-start-from-here | 22 | ✅ archived |
| test-infra | 10 | ✅ archived |
| prototype-gate-loop | 22 | ✅ done |
| prototype-gate-fork | 14 | ✅ done |

## 下一步（见 docs/architect/）

- `todo-prototype-subagent` — 跨 Agent subagent 编排
- `todo-loop-engineering-queue` — 迭代推理队列引擎
