# BUG-040: sub-agent 自创 receipt_nonce 而非从 _beacon.json 读取

## 严重程度
P2 — sub-agent 在 `runtime-receipt.jsonl` 和 `result.json` 中使用自己发明的 `receipt_nonce`，而非从 `_beacon.json` 中读取。导致 `operate-work-unit submit` 在 receipt verification 阶段 reject。

## 复现

在本次 run 的 topic 03 (AIDLC vs SDLC) work unit `wu-w0-b000-src-i0003` 中：

1. `_beacon.json` 中的正确 nonce: `wu-2197d4d9-b9c7-4f44-a94e-e2a69ea347b4`
2. Sub-agent 在 `runtime-receipt.jsonl` 中使用的 nonce: `wu-c89102ab-7e3f-4d16-a528-0f9e34b6d721`
3. Sub-agent 在 `result.json` 中使用的 nonce: `wu-c89102ab-7e3f-4d16-a528-0f9e34b6d721`

Submit 报错：
```
runtime receipt mismatch for wu-w0-b000-src-i0003 line 1: receipt_nonce
```

## 根因分析

Sub-agent 收到 prompt 中包含：
```
receipt_nonce=wu-2197d4d9-b9c7-4f44-a94e-e2a69ea347b4
```

但 sub-agent 没有消费这个值，而是调用 `Date.now()` 或类似机制生成了自己的 nonce。`task.md` 中有 "Preserve these identity fields exactly in every lifecycle receipt event and in result.json" 的指令，但 sub-agent 未遵守。

实际上，sub-agent 可能根本没有读 `task.md`——它只读了 Phase Agent 在 prompt 中内联的指令。Phase Agent 的 prompt 中有 "receipt_nonce: check _work_units/wave0/wu-w0-b000-src-i0003/_beacon.json" 这样的间接引用，sub-agent 没有去查。

## 建议修复

1. **Phase Agent 在 spawn prompt 中必须内联 exact identity fields**，而非让 sub-agent "去读 beacon"。格式：
   ```
   receipt_nonce: wu-2197d4d9-b9c7-4f44-a94e-e2a69ea347b4  ← 直接复制，不间接引用
   ```
2. **Work unit `task.md` 中的 binding section 已经包含了 exact values**，问题在于 Phase Agent 的 prompt 覆盖/稀释了 task.md 中的精确指令
3. **Sub-agent 应优先读 `task.md`** 而非依赖 Phase Agent prompt 中的指令

## 发现时间
2026-07-07，aidlc-investigation run，wave0 phase（topic 03 submit 失败）
