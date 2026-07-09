## Context

当前 delegated execution loop 已经形成稳定主线：

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

前置 changes 已经把 claim/submit/ledger/gate 的主要 contract 收束住，也把 phase loop 改成 bounded claim + active polling。但 terminal timeout 仍是危险的最后一刀：`deadline_at` 过期后，Phase Agent 可以直接调用 `operate-work-unit timeout`，Engine 只验证 attempt 仍是 `claimed`，不判断是否已有真实进展或可提交产物。

本 change 的目标不是让 Engine 接管 Agent Flow，也不是做后台 watchdog。它只在 terminal timeout 这个 deterministic checkpoint 前增加一个 Engine preflight，让 Phase Agent 收到明确的 Check / Inspect / Advice 后再行动。

## Goals / Non-Goals

**Goals:**

1. 新增 `operate-work-unit timeout-preflight`，用结构化输出判断 claimed attempt 是否 timeout-eligible。
2. 让 timeout eligibility 使用 progress-aware idle lease，而不是只看 `claimed_at + timeout_ms`。
3. 让 assigned / candidate result 存在时复用 `dry-submit` 等价诊断，优先 recommend `submit` 或 repair same `work_id`。
4. 让 `operate-work-unit timeout` 默认拒绝 progress-positive attempt。
5. 提供显式 `timeout --force` 逃生口，并要求 durable audit。
6. 更新 Sub-agent progress guidance，让 slow fetch/search/cache work 有可观测进展。
7. 更新 Wave0/Wave1/Wave2 phase docs，让 delegated drain loop 在 terminal timeout 前读取 preflight advice。
8. 增加 focused tests 和 controlled wave coverage。
9. 发布为 framework `v0.15`。

**Non-Goals:**

- 不修改 formal submit 成功语义。
- 不让 normal submit 接受 terminal `timed_out` attempt。
- 不实现 audited late accept、retry supersede、late ledger row 或 queue cleanup；这些属于 Change B。
- 不改变 gate coverage、research floors、reference materialization 或 evidence quality judgment。
- 不新增 Engine-owned fetcher、browser fetcher、daemon、watcher、blocking wait helper、JS workflow walker 或 pause/resume lifecycle API。
- 不使用环境变量传递配置。
- 不新增 npm 依赖，不使用 Python。

## Source Of Record Map

| Concern | Source of Record |
| --- | --- |
| Work-unit identity, status, lease hint, receipt nonce, paths | `_work_units/_index.json` plus work-unit manifest under the active bundle root |
| Queue demand binding and in-flight membership | `rb_queue.json.delegated_in_flight` |
| Successful delegated completion and gate coverage | Engine-written `rb_output_declarations.jsonl` submitted ledger rows |
| Submit-equivalent candidate validation | existing dry-submit / submit validation helpers and `WorkUnitResultSchema` / kind output contracts |
| Progress freshness for timeout-preflight | Engine-observed filesystem mtime / Engine-readable events on assigned work-unit surfaces, identity-matched receipt/log surfaces, and declared in-bundle output/cache refs |
| Timeout terminalization authority | guarded Engine timeout path used by CLI and exported lifecycle/API helpers |
| Agent-facing continuation path | Wave phase Markdown reading preflight Check / Inspect / Advice |
| Experiment verdict | disposable bundle runtime files plus trace JSONL, not console summaries |

Timeout-preflight output SHALL have a Zod-backed schema in the implementation. At minimum it SHALL constrain `recommended_action` to the closed enum `submit|repair|wait|timeout|inspect|block`, represent `timeout_eligible` as the same truth as `check`, and keep `progress` fields structured enough for tests to assert which progress source drove the decision.

Preflight helper APIs SHALL accept an injectable clock such as `nowMs` or equivalent function parameter for tests. CLI invocations SHALL use the real current clock. This keeps timeout eligibility deterministic under `node:test` without using environment variables or sleeping in tests.

## Decisions

### Decision 1: timeout-preflight 是 “能不能安全 timeout” 的 Check

`timeout-preflight` SHALL answer one narrow question: is it safe to terminalize this claimed work unit as `timed_out` now?

The command SHALL accept an explicit bundle path, `--work-id`, and optional `--result`. When `--result` is omitted, preflight uses the assigned result path from the work-unit manifest/index. When `--result` is supplied, preflight evaluates that candidate under the same candidate path semantics as dry-submit/formal submit. It SHALL load the work-unit index, queue binding, manifest, status, receipt, result, and relevant declared output/cache observations from the active bundle root. It SHALL fail closed if the bundle path, `work_id`, manifest, or queue binding is invalid.

The optional `--result` candidate is a validation input, not automatically a progress source. If it is outside the assigned work-unit directory, its mtime SHALL NOT extend the work-unit idle lease by itself. It can still drive `recommended_action: submit` or `repair` through dry-submit-equivalent validation. Only assigned work-unit surfaces, identity-matched receipt/log surfaces, declared in-bundle outputs/cache, and Engine events tied to the same identity can extend the idle lease.

Suggested output shape:

```json
{
  "ok": true,
  "work_id": "wu-w1-b000-deep-i0001",
  "queue_item_id": "topic-a",
  "status": "claimed",
  "timeout_eligible": false,
  "check": false,
  "recommended_action": "submit",
  "initial_deadline_at": "2026-07-09T10:15:00.000Z",
  "lease_anchor_at": "2026-07-09T10:10:00.000Z",
  "idle_timeout_ms": 600000,
  "effective_timeout_at": "2026-07-09T10:20:00.000Z",
  "progress": {
    "latest_engine_observed_progress_at": "2026-07-09T10:10:00.000Z",
    "candidate_result_present": true,
    "receipt_nonempty": true,
    "output_or_cache_progress": true,
    "dry_submit_expected": "pass",
    "sources": [
      {
        "source_type": "result_file",
        "observed_at": "2026-07-09T10:10:00.000Z",
        "path_ref": "_work_units/wave1/wu-w1-b000-deep-i0001/result.json",
        "identity_verified": true,
        "extends_idle_lease": true,
        "suspicious_timestamp": false
      }
    ]
  },
  "inspect": [],
  "advice": ["Run operate-work-unit submit for this work_id before considering timeout."]
}
```

`ok` means the preflight command itself completed. `timeout_eligible` / `check` answer the safety question. `recommended_action` SHALL be one of `submit`, `repair`, `wait`, `timeout`, `inspect`, or `block`.

CLI exit code SHALL follow the safety check: exit 0 only when `timeout_eligible: true`, exit non-zero when timeout is not currently safe or when invocation/state is invalid. Even when the check is false, stdout SHALL contain structured JSON whenever the command can identify the work-unit context.

Phase guidance SHALL treat a non-zero `timeout-preflight` exit with structured stdout as a guard refusal to parse, not as a reason to skip the advice. Invocation errors that cannot identify the work-unit context remain command failures and SHALL lead to inspect/block handling.

Alternative considered: make `timeout-preflight` a pure advisory command with exit 0 for every valid invocation. Rejected because the preflight is a guard, and false eligibility should be usable as a control-flow blocker.

### Decision 1A: timeout-preflight is read-only by default

Preflight SHALL NOT mutate bundle authority surfaces. In particular it SHALL NOT update `_work_units/_index.json`, `rb_queue.json`, work-unit status files, `rb_output_declarations.jsonl`, `_work_units/_transactions/`, `rb_trace.jsonl`, run logs, candidate result files, runtime receipts, cache aliases, or gate-consumable outputs.

This is stricter than using `last_observed_at` as a persisted lease extension. The current change can compute progress freshness from filesystem mtimes and Engine-readable events at the time of preflight. If apply discovers that persisting observation state is necessary, that discovery SHALL be recorded in implementation evidence and the design/spec SHALL be updated before code changes rely on it. Persisted observation must remain non-authoritative for submit/gate coverage and must have its own no-side-effect proof.

### Decision 2: progress is Engine-observed, not Agent self-certified

Progress-positive SHALL be derived from deterministic surfaces the Engine can observe:

- candidate result file exists and is parseable enough for dry-submit planning, or at least exists as a repair target;
- runtime receipt exists, is non-empty, and has at least one parseable line tied to the expected identity;
- declared output files or cache trails referenced by a parseable candidate result or manifest exist under active-bundle contract paths and remain tied to the same work-unit identity;
- assigned work-unit result/receipt refs or cache leaves have filesystem mtime at or after claim;
- Engine trace/log events for this work unit, when available and tied to the same identity.

Receipt event `ts` MAY appear in diagnostics, but it SHALL NOT be the sole authority for progress freshness. Filesystem mtime and Engine observation time are more trustworthy because Sub-agent timestamps are content supplied by the Agent actor.

Preflight SHALL report selected progress sources and observed timestamps in the `progress` object when any progress source is considered. The progress object SHALL distinguish source type and confidence with fields equivalent to `source_type: result_file|receipt_file|output_file|cache_leaf|engine_event`, `observed_at`, `path_ref` or `event_ref`, `identity_verified`, `extends_idle_lease`, and `suspicious_timestamp`. It SHALL NOT persist `last_observed_at` by default.

Progress source trust levels:

| Source | Can extend idle lease? | Notes |
| --- | --- | --- |
| assigned result path under work-unit dir | yes, if identity parse/validation is tied to this `work_id` or the file is a repair target under the assigned dir | also triggers dry-submit branch |
| optional `--result` outside assigned dir | no by mtime alone | may recommend submit/repair through dry-submit-equivalent validation |
| runtime receipt file | yes, when non-empty and at least one parseable event matches identity | receipt `ts` remains diagnostic only |
| declared output/cache under active bundle root | yes, when path is safe, in contract scope, and tied to candidate/manifest identity | undeclared random files do not count |
| Engine trace/log event | yes, when event carries same work identity | event timestamp comes from Engine write time |
| invalid or mismatched identity surface | no | recommend inspect/block or repair depending on surface |

Alternative considered: treat any receipt line with a fresh `ts` as lease extension. Rejected because it lets Agent-authored time claims extend deterministic lease authority.

### Decision 3: effective timeout is progress-aware

The existing `deadline_at = claimed_at + timeout_ms` SHALL remain as an initial lease hint and compatibility surface. Timeout eligibility SHALL use an effective idle lease:

```text
latest_engine_observed_progress_at = latest Engine-observed progress time, or null when no progress exists
lease_anchor_at = latest_engine_observed_progress_at, or claimed_at when no progress exists
idle_timeout_ms = work-unit timeout_ms unless an accepted explicit runtime/profile surface overrides it
effective_timeout_at = lease_anchor_at + idle_timeout_ms
```

An attempt SHALL NOT be timeout-eligible while `now < effective_timeout_at`, unless `timeout --force` is explicitly used. If there is no progress after claim, this collapses to the old initial deadline behavior.

The output SHALL keep `latest_engine_observed_progress_at` and `lease_anchor_at` distinct. `latest_engine_observed_progress_at` is evidence of actual Engine-observed progress and SHALL be null or absent when there is no such progress. `lease_anchor_at` is the calculation anchor and MAY fall back to `claimed_at`. This prevents tests and phase guidance from mistaking the initial claim timestamp for later progress.

Clock handling SHALL be deterministic:

- helper/API calls accept injected `nowMs` for unit and integration tests;
- CLI commands use the real current time;
- mtime comparisons use millisecond timestamps from `stat` and compare against `claimed_at` / `nowMs`;
- future file mtimes relative to `nowMs` SHALL be reported as suspicious diagnostics and SHALL NOT extend the lease beyond `nowMs + idle_timeout_ms`.

This design intentionally does not solve laptop sleep or app pause at the runner layer. Without an explicit suspend/resume signal, Engine cannot reliably distinguish sleep from slow network, stuck Agent, or missing progress receipts. Progress-aware idle lease is the safe first step; a future pause-aware lifecycle API needs a separate OpenSpec change.

### Decision 4: dry-submit is the first-class result branch

If a candidate result exists at the assigned result path or at the optional `--result` path, preflight SHALL run dry-submit-equivalent validation before considering timeout. Reuse the existing dry-submit validation helper rather than creating a second submit-like parser. Preflight SHALL classify only same-claimed-`work_id` diagnostics as repairable; wrong identity, missing binding, terminal status, and ambiguous authority SHALL route to `inspect` or `block`.

Recommended actions:

| Observation | recommended_action | timeout_eligible |
| --- | --- | --- |
| dry-submit expected pass | `submit` | false |
| dry-submit expected fail with same-attempt repair diagnostics | `repair` | false |
| dry-submit expected fail because of invalid binding, wrong identity, terminal status, or ambiguous authority | `inspect` or `block` | false |
| recent progress but no result yet | `wait` | false |
| no progress and idle lease expired | `timeout` | true |
| stale progress with no repairable candidate and idle lease expired | `timeout` | true |
| invalid state / missing binding | `inspect` or `block` | false |

Dry-submit remains read-only and non-authoritative. A passing dry-submit does not complete the queue or satisfy gate coverage; it only blocks timeout and points the Phase Agent at formal submit.

### Decision 4A: timeout recommendation follows an explicit decision table

The recommendation order SHALL be deterministic and fail closed:

| Priority | Condition | recommended_action | timeout_eligible |
| --- | --- | --- | --- |
| 1 | work-unit/index/manifest/queue binding invalid | `inspect` or `block` | false |
| 2 | candidate result dry-submit expected pass | `submit` | false |
| 3 | candidate result dry-submit expected fail with same-attempt repair diagnostics | `repair` | false |
| 4 | progress observed and idle lease not expired | `wait` | false |
| 5 | no progress and initial/effective idle lease expired | `timeout` | true |
| 6 | stale progress, no submit-ready or repairable candidate, effective idle lease expired | `timeout` | true |
| 7 | ambiguous state that cannot prove timeout safety | `inspect` or `block` | false |

The implementation may refine diagnostics inside each row, but it SHALL NOT reorder the table so timeout outranks a submit-ready, repairable, invalid-binding, or not-yet-idle attempt.

### Decision 5: timeout is guarded by default, force is audited

`operate-work-unit timeout` SHALL internally run the same preflight. Without `--force`, the preflight result gates terminalization. With `--force`, the preflight result is still collected for audit but does not block terminalization.

This guard SHALL live at the Engine timeout terminalization boundary, not only in the CLI wrapper. Apply may either introduce a focused guarded timeout helper or extend the existing lifecycle helper, but any exported Engine-owned path that can set status `timed_out` SHALL run timeout-preflight by default. Direct test/API use of `closeWorkUnitAttempt(... status: "timed_out")` or an equivalent helper must therefore either satisfy the no-progress timeout-eligible case or use the explicit force path. `failed` and `abandoned` terminalization remain outside this timeout preflight guard.

Default timeout behavior:

- If preflight says `timeout_eligible: true`, timeout proceeds through the existing terminal retry path.
- If preflight says `timeout_eligible: false`, timeout SHALL return structured failure with `recommended_action`, `progress`, `inspect`, and `advice`; it SHALL NOT mark the attempt terminal and SHALL NOT requeue a retry.
- If preflight cannot validate the work-unit binding, timeout SHALL fail closed and instruct inspection/repair.

Force behavior:

- `--force` SHALL be exposed as an explicit timeout option and SHALL require `--reason` before it can terminalize a progress-positive claimed attempt.
- Forced timeout SHALL record `forced_timeout: true`, the reason, `preflight_timeout_eligible`, `preflight_recommended_action`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and structured `progress_sources[]` in trace/log output or an equivalent durable diagnostic surface. Each `progress_sources[]` item SHALL include source type, observed timestamp when available, path or event ref when available, identity verification, lease-extension status, and suspicious timestamp flag.
- The preferred trace event name is `work_unit_forced_timeout` when a forced terminalization bypasses a false preflight; regular timeout continues to use the existing timeout event. If implementation instead extends the existing timeout event, it SHALL include the same required fields and tests SHALL assert them.
- Forced timeout SHALL still preserve terminal fail-closed semantics: it does not append a ledger row, does not count gate coverage, and retry uses a new `work_id`.

Alternative considered: remove force entirely. Rejected because operations sometimes need an explicit escape hatch for corrupt or unrecoverable work-unit states. The escape hatch must be noisy and auditable.

### Decision 6: phase docs consume advice, Engine does not drive the loop

Wave phase docs SHALL keep the Phase Agent as the driver:

```text
inspect/reconstruct in-flight
-> submit ready attempts
-> repair rejected attempts
-> timeout-preflight expired/stale attempts
-> follow advice: submit | repair | wait | inspect | block | timeout
-> claim bounded top-up when capacity is free
-> gate after drain
```

The Engine SHALL NOT poll in the background, wait for Sub-agents, spawn Sub-agents, choose repair strategy, or advance workflow phases. It only returns deterministic feedback at the timeout checkpoint.

### Decision 7: Sub-agent progress receipts are diagnostic, not authority

Sub-agent role/task guidance SHALL instruct slow workers to emit progress before and after slow search/fetch/cache batches. Good events include `work_started`, `search_batch_started`, `search_batch_done`, `fetch_batch_started`, `fetch_batch_done`, `cache_written`, `result_draft_written`, and `work_done`, or equivalent existing event vocabulary.

These events help timeout preflight distinguish no progress from slow progress. They SHALL NOT by themselves satisfy submit, ledger, or gate coverage. Submit still validates result, receipt, output, cache, source claims, queue binding, hashes, and idempotency.

## Verification Strategy

- Unit tests for timeout-preflight:
  - claimed attempt with no result, empty/missing receipt, no output/cache, and expired idle lease returns `timeout_eligible: true`.
  - claimed attempt with non-empty receipt or output/cache mtime inside idle lease returns `timeout_eligible: false` and recommends wait/repair/submit as appropriate.
  - candidate result with dry-submit pass returns recommended action `submit`.
  - candidate result with dry-submit fail returns recommended action `repair` and preserves same `work_id`.
  - optional `--result` candidate path follows dry-submit candidate path semantics.
  - optional `--result` outside assigned work-unit dir can recommend submit/repair but does not extend idle lease by mtime alone.
  - invalid candidate identity, missing binding, terminal status, and ambiguous authority route to inspect/block rather than same-attempt repair.
  - injected `nowMs` makes effective timeout calculation deterministic without sleeps.
  - future mtime relative to injected/CLI now is reported as suspicious, does not set `lease_anchor_at` after now, and does not extend `effective_timeout_at` beyond `now + idle_timeout_ms`.
  - timeout-preflight is read-only for eligible and ineligible outcomes.
  - invalid/missing queue binding fails closed without terminalization.
- CLI integration tests:
  - `operate-work-unit timeout-preflight` emits structured JSON for pass and false-check cases.
  - default `operate-work-unit timeout` refuses progress-positive attempt without changing index/queue/status or creating retry demand.
  - `operate-work-unit timeout --force` terminalizes a progress-positive attempt and records forced timeout diagnostics with structured `progress_sources[]`.
  - no-progress timeout retry happy path still works.
- Engine/API regression tests:
  - exported timeout terminalization helpers apply the same guard as the CLI and do not leave a direct `timed_out` bypass.
  - static export/call-site audit proves every Engine-owned `timed_out` transition goes through guarded timeout or explicit force.
  - `failed` and `abandoned` terminalization behavior remains unchanged.
- Markdown/static tests:
  - Wave0/Wave1/Wave2 phase docs route expired/stale attempts through `timeout-preflight` before `timeout`.
  - phase docs tell the Agent to follow preflight advice before terminalization.
  - Sub-agent role/task guidance requires progress receipt/log entries around slow batches.
- Controlled experiment/playbook coverage:
  - fixture-backed no-progress timeout still requeues retry.
  - fixture-backed progress-positive attempt blocks default timeout through production work-unit CLI/API boundaries.
  - fixture-backed candidate result routes to submit/repair advice.
  - forced timeout records durable audit fields, including structured `progress_sources[]`.
- Governance:
  - `node openspec/governance/check-project-reqs.mjs`
  - `node openspec/governance/check-project-specs.mjs`

## Implementation Evidence Shape

During apply, create and maintain `implementation-evidence.md` in this change directory. It SHALL include:

- scope readback: proposal/design/tasks/specs read, source backlog plan read, relevant archived changes consulted, and explicit exclusions confirmed;
- timeout mutation audit: current `timeout`, `closeWorkUnitAttempt`, queue retry, status/index/log/trace mutation paths identified before edits;
- static timeout bypass audit: exported lifecycle/API surfaces and internal call sites that can set `timed_out`, plus the final proof that no unguarded path remains;
- progress-source matrix: each progress surface, trust level, timestamp source, and whether it can extend idle lease;
- clock/mtime audit: how helper-level `nowMs`, CLI real time, filesystem stat precision, and suspicious future mtimes are handled;
- dry-submit integration note: how preflight reuses dry-submit validation and avoids duplicating submit-like logic;
- timeout-preflight read-only proof: before/after snapshots for eligible and ineligible preflight calls;
- default timeout refusal proof: before/after snapshots showing progress-positive default timeout does not alter queue/index/status/ledger/trace retry authority;
- force timeout proof: exact trace/log/output fields that make forced terminalization auditable;
- exported API guard proof: how CLI and lifecycle/API timeout calls share the guarded path, plus evidence that no unguarded exported timeout bypass remains;
- candidate-path audit: how assigned result path versus optional external `--result` affects dry-submit advice and idle lease calculation;
- lease-anchor audit: how `latest_engine_observed_progress_at`, `lease_anchor_at`, `initial_deadline_at`, `idle_timeout_ms`, and `effective_timeout_at` are populated without confusing claim time with observed progress;
- phase/sub-agent guidance audit: active docs changed and static tests added;
- test/governance ledger: command, PASS/FAIL, and failure classification;
- OpenSpec validation result when available, or exact unavailable CLI outcome when it is not installed;
- residual risks and deferred findings, especially audited late accept and pause-aware lifecycle.

## Risks / Trade-offs

- Progress observation can become too permissive if any stray file extends the lease. Mitigation: restrict progress to assigned work-unit surfaces, result-declared outputs/cache, receipt/log surfaces tied to the same identity, and Engine observation time.
- Progress observation can become too strict if malformed-but-real partial work is ignored. Mitigation: malformed candidate result or identity-matched receipt SHALL recommend repair/inspect while fresh, not immediate timeout; stale malformed progress can become timeout-eligible only after the effective idle lease expires and no repairable surface remains.
- Guarded timeout changes existing automation expectations. Mitigation: no-progress timeout still works; progress-positive refusal returns structured JSON; force exists for explicit operational override.
- Persisting observation state such as `last_observed_at` would add mutation to a guard that is currently designed as read-only. Mitigation: keep this change read-only by default; if persisted observation becomes necessary, update design/spec first and prove it has no completion, ledger, queue, gate, or terminal authority side effects.
- Sub-agent progress receipts can create extra noise. Mitigation: require concise lifecycle events at batch boundaries, not per-page spam.
- Pause-aware lifecycle remains unsolved. Mitigation: explicitly defer until a runner/app suspend/resume signal exists.
