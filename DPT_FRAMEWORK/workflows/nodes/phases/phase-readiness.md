---
node_type: phase
id: phase-readiness
phase: readiness
gate: readiness-passed
stop: "no"
requires:
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-gate-rules
  - shared/shared-schemas
  - shared/shared-anti-cheating-rules
---

# Phase: Readiness — Final Deterministic Precheck

## 1. Stage Goal

Final 交付前运行最后一个 deterministic checkpoint：验证所有 required artifacts 可达、所有 prior gate 通过状态可审计、profile/status/trace 无结构性矛盾。

**Readiness 只做 deterministic structural check。** 不做 content quality、writing quality、argument strength、synthesis completeness 等语义判断。语义质量由 HITL2 人类审查负责，Readiness 只确认"东西都在且格式合法"。

## 2. Required Inputs

- Active `dpt_rb_*` run bundle（全部 prior phase + gate 完成，HITL2 decision 已 recorded）
- `rb_trace.jsonl`（完整 trace，含所有 prior gate 的 `gate_attempt` 事件）
- `rb_profile.yaml`（含 HITL2 decision）
- `rb_status.json`（当前 lifecycle 位置的 status 快照）
- Required artifact 集合：
  - `seed_topics/`（seed topic 物化目录）
  - `reference/index.md`（Wave0 evidence index）
  - `artifacts/wave2/synthesis.md`（Wave2 synthesis）
  - `artifacts/hitl2/decision-brief.md`（HITL2 decision brief）

## 3. Allowed Actions

- 检查所有 required artifact 文件和目录是否存在（`file_exists` / `dir_non_empty`）
- 检查 `rb_trace.jsonl` 中所有 prior gate 均有 `gate_attempt` 事件 `passed: true`（`trace_has_all_gates`——从 manifest 推导 prior gate 集合，无硬编码阈值）
- 检查 `rb_profile.yaml` 可解析为合法 YAML（`yaml_parse`）
- 检查 `rb_trace.jsonl` 每行都是合法 JSON（`jsonl_parse`）
- 检查 `rb_status.json` 中 `current_gate: readiness_passed` / `next_gate: none`（`status_value`）
- 更新 `rb_status.json` 中 readiness 相关状态
- 记录 `readiness_check` trace event 到 `rb_trace.jsonl`

**Readiness gate CLI 执行以上全部检查。** Agent 角色是确认 gate pass 后 advance 到 final，或在 gate fail 后按 inspect/advice 修复。

## 4. Expected Artifacts

- All required artifacts 存在且可访问（`seed_topics/`、`reference/index.md`、`artifacts/wave2/synthesis.md`、`artifacts/hitl2/decision-brief.md`）
- `rb_trace.jsonl` 中所有 prior gate 均有 `gate_attempt` 事件 `passed: true`
- `rb_profile.yaml` 可解析
- `rb_trace.jsonl` 每行合法 JSON
- `rb_status.json` 中 `current_gate: readiness_passed` / `next_gate: none`（通过 CLI 推进）：
  ```bash
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to readiness_passed
  ```

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle <path> --current-node phases/phase-readiness.md
```

## 6. On Gate Pass

读取 `check.next`（terminal routing，`next_gate: "none"`）。调用 `advance-status` 标记终态后加载 final：
```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to readiness_passed
```
然后加载 `phase-final.md`。

Readiness pass 后 `next_gate: none`——final 是 terminal node，无 outgoing gate。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，按需修复后 rerun same gate：

| Fail | 修复 |
|------|------|
| artifact 缺失 | 回到对应 phase 补产 artifact（通过 HITL2 repair/rerun 或直接修复） |
| prior gate pass 缺失 | CLI inspect 列出具体缺失的 gate——回到对应 gate 修复后 rerun |
| YAML 不可解析 | 检查 `rb_profile.yaml` 语法，修复 malformed YAML |
| JSONL 不可解析 | 检查 `rb_trace.jsonl` 中有无非 JSON 行（如手动编辑痕迹），移除或修复 |
| status drift | 恢复 `current_gate`/`next_gate` 同步 |

**Persistent failure：** 若 readiness gate 连续 3 次修复无进展，检查是否有结构性 bug（如 gate CLI 本身异常）。

Readiness fail 可能需要回到 earlier phase 修复缺失 artifact。修复入口是 HITL2 repair/rerun。

## 8. Stop Behavior

`stop: no` — Agent 自主执行 readiness check，不等待人类，不发送 readiness progress 或 idle/no-work 汇报。本地 precheck 完成后必须运行 `readiness-passed` gate；phase 完成条件是 gate pass + `check.next` 指向 final。

Readiness gate fail 后按 inspect/advice 修复缺失 artifact、trace、profile/status drift 或结构问题并 rerun。若必须回到 earlier phase 修复，仍要遵守 gate boundary：不得把“本地检查完成”当成完成点，不得自行绕过 gate 加载 final。

## 9. Anti-Cheating Rules

- **Readiness 只能检查 deterministic readiness**——artifact 存在、gate evidence 可审计、状态一致、profile/trace 可解析
- **MUST NOT 做 content quality 或 writing quality 判断**——不能因为"synthesis 写得不够好"、"decision brief 不够详细"而 fail readiness
- **MUST NOT 做 semantic research quality 判断**——不能评估"evidence 够不够强"、"argument 够不够严密"
- **MUST NOT 检查 final report 的内容**——final report 在 readiness pass 之后才生成
- 缺 artifact、缺 trace、缺 gate evidence 时 **MUST fail**
- YAML/JSONL 不可解析时 **MUST fail**
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:readiness START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:readiness END — <summary>"` |
