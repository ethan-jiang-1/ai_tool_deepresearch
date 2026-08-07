## Why

Native Case 225 batch `55d4273e-c0b1-4bcc-99b8-35ef55818a9c` proves that the
Topic and closeout reader repairs work: formal submit, submitted closeout, and
inspect all passed. The Engine also directly recorded
`probe_host_policy_blocked` and a legal `phase_agent_fallback` execution for
the required `dpt-evidence-extractor` child. Case 225 declares that an
unavailable required child becomes `NOT_RUN`, but Step 2 only sees the
Subject-process exit code; a successful fallback process therefore reaches a
false behavioral `FAIL` instead of its declared unavailable boundary.

## What Changes

- Make Case 225's Step 2 read the Engine-recorded actor-execution tuple after
  a successful Subject process and write its existing unavailable marker when
  the required child is unavailable and the claimed work used
  `phase_agent_fallback`.
- Extend the existing Case 225 Markdown contract test to require this narrow
  direct-fact classification and reject treating fallback as delegated-child
  success.
- Retain the existing native finalizer and `NOT_RUN` marker path. This change
  does not change child availability policy, Queue/claim behavior, Subject
  work, or native verdict semantics.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | Engine actor preflight and persisted `actor_execution` record | Verify-only | The Engine correctly records unavailable/fallback facts; only the case observer needs to consume them. |
| `agent/agent-testing` | AGT-003 real-subagent evidence and current Case 225 playbook | Verify-only | The real-child proof boundary stays strict; unavailable is not converted to a fallback success. |
| `research/research-wave-experiments` | Current Case 225 real-Agent and `NOT_RUN` declarations | Verify-only | The playbook already declares the required-child-unavailable terminal boundary. |
| `verification/verification-routing` | Existing integration and `agent_flow_e2e` proof routes | Verify-only | Route selection and native verdict authority stay unchanged. |
| `agent/agentic-queue` | Retained Queue claim/submit results from batch 55d4273e | Excluded | Queue and Engine actor admission acted legally; they do not own case-level native outcome classification. |

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。这是 registered playbook/test 对其既有 `NOT_RUN` 声明的实现对齐，不改变
accepted behavior，所以 `.openspec.yaml` 声明 `skip_specs: true`。

## Design Review

没有新增 state、projection、command、evaluator 或 reader-facing concept。
有界 reader question 是：当 Case 225 的 required child unavailable 时，Step 2
能否从 Engine 的 current work-unit actor record 得到唯一的 honest terminal
boundary。direct Source of Record 是 `_work_units/_index.json` 中该
`case-225-primary-1` 的 `actor_execution` tuple，而不是 Subject summary、child
evidence prose 或 filesystem inference。

最短合法闭环为：

```text
Engine actor_execution: unavailable + phase_agent_fallback
  -> existing case-225-subject-unavailable.txt marker
  -> existing native finalizer NOT_RUN branch
```

它将 process-exit-only 推断替换为一个 direct Engine fact，并避免 retry、actor
policy override、fallback-as-child claim 或新的 completion controller。用户已授权
机械修复及有界 rerun；Agent 修改 playbook/test，Engine 和 native finalizer 保留
唯一 verdict authority。

## Impact

- 受影响 target assets：一个注册的 Markdown playbook 和它现有的 integration-level
  Markdown contract test。
- 不修改 Queue、actor availability policy、work-unit lifecycle、Phase closeout、
  schemas、Subject runner、provider configuration 或 mutable runtime bundles。

## Supersession And Closeout

The user-directed extreme-slow quarantine moved Case 225 to
`experiments_playbook/exp_extrem_slow/case-225-extreme-slow-returned-work-closeout.md`
and removed it from active selection. No Autorun, Interactive, or native rerun
is legal while it remains quarantined. The direct-fact repair and its static
contract are retained in that historical asset, but no post-repair native
`NOT_RUN` observation exists and this change does not claim one. Any future
proof requires a separately proposed refactor, relocation to a supported
runnable cost tier, explicit manifest registration, and a new native claim.
