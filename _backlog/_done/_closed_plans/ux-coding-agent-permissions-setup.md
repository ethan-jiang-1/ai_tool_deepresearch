# Plan: Coding Agent 设置与权限 UX

**性质:** 纯文档 + 可选 committed allowlist  
**状态:** 待设计（2026-07-10，从 `_backlog/todos/todo-coding-agent-setup-ux.md` 转换）  
**优先级:** 高（launch 前置）  
**依赖:** 先完成 `ux-onboarding-install-setup.md`（安装 plan），否则装了权限也跑不起来  
**交叉:** BUG-069（契约自洽）；permissions alone 不够，但没有 permissions 也跑不了静默

---

## 0. 问题

框架假设 HITL1→HITL2 之间 `stop: no` 自主推进；默认 Claude Code / Codex 会在 Bash/WebFetch/Write 上反复弹批准 → 体验崩。仓库几乎没有「怎么配才能不卡」的用户文档。

## 1. 地基对齐（2026-07-10）

| 假设 | 现状 |
|------|------|
| 无 `setup-agent-permissions.md` | ✅ 仍缺 |
| 无 committed research allowlist | ✅ 仍缺（仅有 `.local` / 未入库导向） |
| gate `--non-interactive` | ❌ 仍不存在 — 文档应写明「别找它」 |
| `dry-submit` | ✅ **已有** — 手册应写入「submit 前批量契约预检」 |
| curl / WebFetch 权限缺口 | ✅ 仍真实 — timeout postmortem 里浪费的 delegated attempt 与此相关 |
| 与 BUG-069 | 权限手册解决「能跑工具」；069 解决「契约自洽才能首过」— **并行，不互相替代** |

## 2. 目标产物

1. Agent-agnostic 手册：`command_playbook/setup-agent-permissions.md`（Claude Code + Codex）
2. 可选 committed `.claude/settings.json` research allowlist + Codex approval 指引
3. 从 `RUN.md` / README 引用「开跑前先 setup」
4. **不动** gate / schema / phase 行为

## 3. Non-Goals

- 不实现 gate `--non-interactive`
- 不是 engine Boundary Hooks（见 `_backlog/todos/todo-hooks-deferral.md`）
- 不在 framework 内重做 permission 系统

## 4. 建议下一步

优先 `/opsx:explore` 或直接小 propose（文档 + allowlist）。与 BUG-069 并行抬起；排在 helper-not-tool / persona 之前。
