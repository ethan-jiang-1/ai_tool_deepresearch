## Context

HITL1 currently performs one live capability-only search, selects the first usable URL and permits one fetch invocation. Production BUG-096 showed a common split-capability environment: Claude Code `WebFetch` was policy-blocked while shell `curl` could read the same URL. The current contract therefore recorded `unavailable` until the user explicitly told the Agent to try `curl`, even though search, shell access and the research goal were already authorized.

This is an Agent Flow issue, not an Engine fetch implementation issue. Search/fetch happens through the Coding Agent's actual tools; `rb_profile.yaml#/research_access` stores one direct observation; `ProfileSchema` validates that observation; the existing `hitl1-recorded` Gate decides whether Setup may start. The design must preserve that authority chain and the probe's non-evidence boundary.

The design paired-reads `guidelines/evolution-simple-reliable-control.md` and `guidelines/evolution-helper-oriented-agent.md`. The consequence is a deliberately closed one-fallback sequence: enough to remove the accidental user co-runner, but not a generic surface registry, retry controller or capability state machine.

## Goals / Non-Goals

**Goals:**

- Keep the probe to one neutral search and only its first actual HTTP(S) result when that result is eligible; never skip to a second result.
- Permit one native fetch attempt followed, only after no real content, by one same-URL shell `curl` attempt.
- Make the fallback ordinary Agent-owned mechanics when current host permission is sufficient.
- Continue writing one existing direct `research_access` observation and rerun the same Gate.
- Preserve honest unavailable behavior and expose only the smallest permission/external-action boundary.
- Separate deterministic guidance/shape proof from real Coding Agent and external-call proof.

**Non-Goals:**

- No Wave/work-unit/Sub-agent fallback delivery; the second planned Change owns that boundary.
- No web client, fetch proxy, browser abstraction, tool adapter, capability registry or fallback plugin interface.
- No new profile/schema/status/trace fields, attempt history, `available_surfaces`, `fallback_used` or derived Gate verdict.
- No new CLI, Gate rule, transition, HITL checkpoint, automatic retry or offline-report path.
- No second URL, evidence collection, source-quality judgment, cache write or coverage from the probe.
- No claim that deterministic fixtures prove native fetch, `curl` or Agent behavior.

## Decisions

### D1. One URL and one closed fallback, not a fallback tree

The v1 sequence is:

| Direct observation | Agent action | Final observation |
|---|---|---|
| Search missing/blocked/failed or no eligible URL | No fetch | Existing `unavailable/not_attempted` branch |
| First eligible URL + native fetch returns real page content | Stop; do not call `curl` | Existing `available/success`, actual native `fetch_surface` |
| First eligible URL + native surface absent before invocation | If existing host permission independently allows it, call `curl` once for the same URL | Available on real content; otherwise unavailable |
| First eligible URL + native fetch blocked/unavailable/failed without real content | If existing host permission independently allows it, call `curl` once for the same URL | Available on real content; otherwise unavailable |
| `curl` requires unavailable permission or target is ineligible | Do not bypass or widen host/project policy | Unavailable plus smallest permission boundary |

The closed v1 fallback is one shell invocation:

```text
curl --fail --silent --show-error --location \
  --max-time 15 \
  --proto '=http,https' \
  --proto-redir '=http,https' \
  -- "<same-url>"
```

The URL must be passed as one quoted argument. `--fail` makes HTTP 4xx/5xx non-success, the fixed timeout bounds the external action, `--` closes option parsing, and both protocol flags keep the initial request and redirects on HTTP(S). A native success terminates the sequence, and the Agent never tries another URL or another tier.

The URL must be the first actual HTTP(S) result returned by the one search, not a user/model-invented or substituted URL. If that first result is ineligible, the Agent records the no-eligible-result branch rather than selecting a later result. The Agent must not invoke the fallback for `localhost`, loopback, or literal private/link-local targets. Redirects remain HTTP(S)-only and the host's network policy remains authoritative; this Change does not claim Agent prose is an SSRF validator or add an Engine fetch client.

Alternatives rejected:

- `WebFetch -> browser -> Node fetch -> curl -> wget`: a hidden retry tree with no demonstrated need and ambiguous proof.
- `curl` first everywhere: masks whether the native surface works and discards the intended platform capability probe.
- Multiple candidate URLs: changes the probe from capability confirmation into source selection/search strategy.
- Generic “try another method” prose: recreates the ambiguity that caused the production failure.

### D2. Attempts remain invocation-local; one observation remains durable

No fetch-attempt array or fallback flag is persisted. The durable fact remains the existing discriminated `research_access` object:

- success records the searched `result_url`, `fetch_outcome: success` and actual successful `fetch_surface`;
- exhausted failure records the same URL, non-success outcome, final attempted surface when known and one bounded direct reason naming both outcomes;
- pre-fetch search failure records `not_attempted` as today.

The reason is diagnostic prose inside an existing bounded field, not a parser input, retry authority or second verdict. Gate behavior and `ProfileSchema` remain unchanged.

`fetch_surface` has two deliberately different compatibility meanings: it remains optional in `ProfileSchema` and the Gate does not independently enforce it, while the v0.39 HITL1 writer contract requires the current successful probe to record the actual surface. This improves auditability without making older valid profiles fail or creating a second verdict owner.

Alternatives rejected:

- `fallback_used` and `available_surfaces[]`: derived/history fields that do not change the HITL1 decision and would require new ownership/synchronization.
- Trace events for every tool attempt: the framework does not own native tool-call transport; real experiment transcripts provide behavior evidence without turning tool history into runtime control state.

### D3. Markdown owns the sequence; Engine retains only existing validation

Implementation changes the accepted requirement and `phase-hitl1.md`. It does not add a JS fetch runner. The LLM Agent reads the ordered surface, invokes its real native tool and shell fallback, judges whether returned bytes are real page content, writes the existing profile observation, then calls the existing Gate. Engine continues to validate only deterministic profile/Gate facts.

This preserves the project split: Markdown controls the bounded Agent Flow; the Agent executes external calls and recognizes real content; schema/Gate enforce the stored observation and lifecycle boundary.

### D4. User escalation is limited to authority the Agent genuinely lacks

Native policy failure is neither a user decision nor authorization to bypass policy. The fallback runs only if the independently configured host shell/network permission already permits that command and target; the Agent must not silently widen committed project config or reinterpret a native domain-safety rejection as shell permission. If current permission already permits `curl`, the Agent executes it without a progress message, confirmation request or command handoff. A user boundary exists only when the fallback requires new host permission, the binary/surface is unavailable, the target is ineligible, or an external environment change cannot be delegated. The Agent first records honest unavailable, exposes only that smallest external prerequisite, and resumes the same bounded probe and Gate only after it is resolved.

No `human-directed` flag, override, permission token or additional HITL state is introduced. User agreement cannot make a failed fetch count as success.

### D5. Verification preserves proof distance

Focused integration tests inspect the production Markdown and its accepted owner for the closed sequence, same URL, attempt cap, observation shape, evidence exclusion and user/Agent responsibility. They do not invoke the network and cannot prove fallback works.

Existing case-115 is updated from “at most one fetch” to the new bounded production contract and remains the only Subject identity and playbook. Its existing required checks continue to prove an honest available or unavailable real-Subject branch. An optional branch-specific witness derived from the same retained Subject transcript/tool events proves fallback only when it shows: the same URL, native absence/block/failure, one actual `curl` invocation returning real content, `fetch_surface: curl`, a real Gate pass and no probe evidence leakage. When all facts are present, the playbook appends a passed `hitl1-native-to-curl-fallback` check to the same bundle-root `rb_trace.jsonl`; that trace check is the fallback claim's native authority. If the selected authenticated runtime does not exhibit native-failure-plus-curl-success, the playbook does not fabricate that check and only the fallback verification claim remains `NOT_RUN` in `implementation-evidence.md`; case-115's general required-check result remains independently reportable.

The deterministic verdict judge may parse bounded role/event-labeled facts from the retained case-115 transcript, but the runner/playbook may not execute fallback on the Subject's behalf, write the profile, fabricate page bytes, or mark fallback PASS from native success. The optional check is appended only from complete direct facts and is never listed as a universal required check; its absence means no fallback verdict, not failure of the general case. Reusing one observation avoids duplicate setup, runner configuration, manifest registration and verdict plumbing without weakening proof distance.

### D6. Versioning and compatibility

The behavior changes from one fetch invocation to at most two same-URL invocations, so the framework bumps from v0.38 to v0.39. Existing profiles and bundles remain schema-compatible because no persisted shape changes. A v0.39 Agent operating an older active bundle follows the currently loaded framework node and writes the same accepted profile object; no migration command or dual success path is needed.

## Risks / Trade-offs

- [Risk] `curl` can reach hosts that the native tool blocks for policy reasons -> Mitigation: native failure grants no permission; invoke only through independently configured host shell/network authority, reject localhost/loopback/literal private or link-local targets, constrain requests and redirects to HTTP(S), preserve the fixed timeout, and record honest unavailable when any boundary denies it.
- [Risk] An HTTP error or challenge shell is mistaken for usable content -> Mitigation: preserve the existing requirement that only the requested real page content counts; command exit success, status text, empty output, search snippets and error/challenge bodies alone do not establish available.
- [Risk] The fallback becomes a seed for more tiers -> Mitigation: spec closes v1 to exactly native plus one `curl` invocation on the same URL; any additional tier requires a later OpenSpec change and complexity proof.
- [Risk] Failure reason becomes hidden attempt history -> Mitigation: allow one bounded human-readable reason only; no parser, array, retry owner or Gate behavior consumes it.
- [Risk] The real fallback branch is environment-dependent -> Mitigation: derive an optional witness from case-115 and mark only that claim `NOT_RUN` when the exact condition is absent; keep production BUG-096 as historical motivation, not post-change proof.
- [Trade-off] A site blocked by both surfaces leaves HITL1 unavailable even if another search result might work -> Accepted: one URL keeps this a capability probe rather than evidence search and prevents unbounded retries.

## Migration Plan

1. Before target edits, run verification-routing plan validation and confirm the accepted one-fetch baseline fails the new focused assertions.
2. Update `phase-hitl1.md` and the focused Markdown integration contract together; do not modify schema or Gate.
3. Update case-115 production wording/runner boundary and focused assertions so its retained transcript can optionally witness the exact fallback branch; do not add another playbook, Subject identity or manifest entry.
4. Run focused deterministic tests, then run case-115 in the authenticated runtime; report its general result independently and mark the fallback claim PASS only when the transcript observes native-block/curl-success, otherwise `NOT_RUN`.
5. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to v0.39, run governance/routing/OpenSpec validation, then archive.

Rollback is a documentation/test/experiment revert to the one-fetch contract. No runtime migration or state rollback is required because persisted schemas and Gate semantics do not change.

## Apply Target Manifest

| Surface | Action | Control impact |
|---|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | modify | Replace one-fetch prose with one native + one same-URL `curl` sequence; no new owner |
| `tests/integration/md/phase-hitl1-research-access.test.mjs` | modify | Deterministic contract assertions only |
| `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` | modify | Align general real probe case with production contract |
| `experiments_env/shared/run-iterative-interaction-subject.mjs` | modify | Update existing Subject 115 prompt/boundary only; no new identity, hidden fallback or verdict |
| `tests/integration/md/hitl1-fetch-fallback-agent-flow.test.mjs` | add | Assert existing manifest registration, case/runner boundary and optional transcript-to-trace witness without re-judging external behavior |
| `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md` | modify | v0.39 release projection |

Added control surfaces: none. Removed/avoided surfaces: implicit user `curl` co-runner, generic alternative-method guesswork, duplicate playbook/Subject/manifest/verdict plumbing, additional profile fields, retry state, fetch controller and second Gate.

## Open Questions

无。第一个 Change 有意只允许 shell `curl` 这一层 fallback；delegated actor delivery 仍由 `_backlog/plans/research-access-and-actor-contract-delivery.md` 中的第二个 Change 处理。
