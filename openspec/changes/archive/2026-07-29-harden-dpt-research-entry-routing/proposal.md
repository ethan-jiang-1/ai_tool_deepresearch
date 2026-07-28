## Why

BUG-139 和 BUG-140 表明，当用户已经选择本仓库的 `DPT_FRAMEWORK/` 进行 research 时，Agent 仍可能先调用 generic `research` skill，或跳过 skill 后直接以 WebSearch/WebFetch 拼装一次性研究并手工交付。现有入口规则只压制抽象的 research shortcut，未把 entry-first 义务覆盖到这两条实际 bypass 路径；结果是 DPT 的 evidence、gate 和 bundle workflow 根本没有开始。

现在需要把已选择 DPT research 的第一个合法动作收敛为明确、可审查的 entry routing，同时保留宿主 tool/skill matcher 不受本仓库控制这一诚实边界。

## What Changes

- 修改 `run-entry`：为 DPT-selected research 明确定义 entry-first invariant。Agent 必须先选择并读取 existing-bundle continuation playbook 或 `RUN.md`，之后才能使用该 phase 授权的 research surface。
- 明确入口前禁止 generic `research` / `deep-research` / equivalent one-shot shortcut、针对该 request 的 direct WebSearch/WebFetch，以及手工 evidence collection 或 synthesis；保留 `RUN.md` 进入后 HITL1 capability probe 和后续 phase/delegated work 的既有授权边界。
- 在 root 和 framework 的既有 entry behavior surfaces 同步短的正面 routing directive，避免只靠“不要用某一个 skill”的否定提示。
- 为文档同步和两种 entry path 增加一个 focused static contract。它验证 repository-controlled guidance 的一致性，不把宿主 skill matcher、tool injection 或真实 Agent 行为误报为本 change 的确定性证明。
- 不增加 settings hook、tool interceptor、runtime state、new lifecycle checkpoint、provider plugin 或 host-level skill-disable guarantee。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `run-entry`: DPT-selected research 的 entry precedence、前置 research-surface prohibition，以及 root/framework entry guidance 的同步要求。

## Impact

- 规划期：`openspec/specs/run-entry/spec.md` 的 delta、change-local `verification-plan.yaml`、以及 proposal/design/tasks。
- apply 期预期触及：root `AGENTS.md` / `CLAUDE.md`、`DPT_FRAMEWORK/RUN.md`、`DPT_FRAMEWORK/AGENTS.md` / `CLAUDE.md` / `README.md`，以及相应的 `tests/integration/` asset；具体 target 由 approved tasks 限定。
- `DPT_FRAMEWORK/` 的 Agent-facing 行为会改变，因此 apply 必须按 `version-management` 决定并同步版本；target version 为 `v0.58`，基于当前 `CHANGELOG.md` 的 `v0.57`。
- 无新增依赖、无 bundle schema/CLI/state/ledger/Gate 行为改变，也不改变普通非-DPT research routing。
