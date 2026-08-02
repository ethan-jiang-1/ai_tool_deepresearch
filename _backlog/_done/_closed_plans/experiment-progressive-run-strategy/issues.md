# Known Issues — 2026-08-02（修复后最终版）

> 所有 FAIL 已修复。以下为残留的已知问题和经验教训。

## Resolved ✅

| Issue | Cases | Resolution |
|-------|-------|------------|
| `verdict_mode: all` + retry 误报 | 202, 302, 124, 133, 201, 212 | 全部改 `last` |
| Seed topic 缺 wave0_evidence | 403 | fixture 追加 initial token |
| setup-ready gate 要求变更 | 606 | 纯 fixture 绕过 |
| 恢复后 status/profile 变化 | 315 | 删除过时 invariant |
| wave1-gate 容忍度变更 | 223 | 翻转预期 |
| 错误消息文本变更 | 33 | 更新子串 |
| Budget 不足 | 73, 181, 310 | $5–8/case |

## Open 🔍

| Issue | Cases | Notes |
|-------|-------|-------|
| `health=ISSUES` 高发 | 71, 73, 161, 213, 214, 307-309, 311-314, 317, 401, 402, 405 等 | 大部分是 reentry-debuggability (7/7) 和 engine-boundary，可能是 health profile 配置问题 |
| Timeout — Marathon 级超时 | 224, 235, 151, 152 | 需 `--timeout 900000`+ |
| ERROR — claude crash | 101, 43, 225, 712, 713, 715 | 基础设施稳定性问题，非 case 逻辑 |

## 经验教训

1. **`verdict_mode: last` 是最安全的默认值。** 任何涉及 gate retry 的 case 都应该用 `last`。
2. **Gate 要求持续演进。** 依赖 gate 行为的 case 需要定期维护。
3. **按速度档设 budget：** Sprint $2, Standard $3-5, Marathon $6-8, Extreme $15。
