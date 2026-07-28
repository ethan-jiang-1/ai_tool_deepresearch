---
title: Host capabilities for conversation capture
status: research_complete_no_implementation
scope: Codex and Claude Code native capture, persistence, resume, export, events, hooks, and plugins
retrieved: 2026-07-26
sources: primary_official_docs_and_source_only
---

# Host Capabilities For Conversation Capture

## Decision

**A framework can reliably capture every exchange only when it owns the supported integration boundary through which the exchange passes.** It cannot make that claim for arbitrary conversations a user conducts in a separate Codex or Claude Code CLI/TUI/IDE session. Native transcript files are useful recovery evidence, but are not a portable audit contract.

The viable host-owned adapters are:

1. **Codex:** run and own [`codex app-server`](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md). Record every `turn/start`/`turn/steer` input before sending it, consume every `item/*` notification, and durably append the framework's own receipt before acknowledging completion.
2. **Claude Code:** run and own the [Claude Agent SDK streaming-input session](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode.md#streaming-input-mode-recommended). Record each `SDKUserMessage` before yielding it, record complete `AssistantMessage` values (and optional stream deltas), then write the framework's own ledger. The SDK session store can mirror the host transcript, but its mirror is best-effort and must not be the sole receipt.

For a separately launched native client, offer only a **best-effort observer**. Its output must say `observed` rather than claiming a complete exchange ledger.

## What "Every Exchange" Requires

For this note, an exchange is one user submission plus all resulting agent messages, including a terminal result, interruption, or failure. A reliable capture contract needs all of the following:

| Requirement | Why it matters |
| --- | --- |
| Intercept the original user submission | A later transcript or rendered export may lag, be disabled, or omit the exact input boundary. |
| Identify and collect complete agent messages | Token deltas are presentation progress, not a complete message receipt. |
| Record interrupts and failures | A submitted prompt without a normal final response is still an exchange outcome. |
| Durable framework-owned append and recovery | Host persistence or a webhook can fail after a host action has happened. |
| Correlation and scope | Keep host/session/turn/message IDs, host version, surface, timestamps, and parent/subagent relationship. |

Neither product documents an atomic, transactional callback that commits a host turn and an external framework record together. Therefore "reliably" here means the framework owns input and output observation, writes an append-only ledger with idempotency keys, and reconciles after a crash. It does **not** mean a host promise of exactly-once external delivery.

## Capability Matrix

| Host and surface | Supported live input capture | Supported live agent-output capture | Supported persistence / recovery | Resume / export | Hooks and plugins | Feasibility for complete framework capture |
| --- | --- | --- | --- | --- | --- | --- |
| **Codex app-server, framework-owned** | [`turn/start`](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md#L150-L158) takes user input; `turn/steer` supplies later in-flight user input. | The app-server protocol streams `item/started`, deltas, and `item/completed`; `userMessage` and final `agentMessage` are explicit item types. [`item/completed` is authoritative](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md#L1442-L1481). | Threads/items are persisted context. `thread/read` can return turns; `thread/items/list` pages persisted items, but the latter is marked experimental and can be unavailable for a store. | `thread/resume` continues a thread; `thread/fork` copies stored history. The CLI also has `codex resume`, but this research did not establish a documented structured transcript export. | Current official source contains lifecycle hook names including `UserPromptSubmit` and `Stop`, but no reviewed OpenAI manual defines a stable capture-hook contract. Do not use them as the recorder's source of truth. | **Yes, conditional.** Strongest Codex option when every conversation is created/routed through this app-server client. Version-pin/generate the schema with the installed Codex version, persist the event ledger yourself, and reconcile from `thread/read` after reconnect. |
| **Codex standalone CLI/TUI/IDE session, framework not the host** | No reviewed supported interception API lets an outside framework observe every user submission. | No reviewed supported subscription API attaches an external observer to another client session. | Current official source and local installation show rollout/session storage, but an on-disk path is implementation detail; app-server marks `thread.path` as unstable. | `codex resume` is a public CLI command; this alone is continuity, not an auditable export API. | Hooks exist in current official source, but the published manual was inaccessible in this environment and their compatibility contract was not established. | **No.** Do not claim complete capture from watched files or inferred UI events. |
| **Claude Code Agent SDK, framework-owned** | The SDK's recommended streaming mode receives an application-owned `AsyncIterable<SDKUserMessage>`; the application can persist each item before yielding it. | The SDK yields complete `AssistantMessage` values; optional partial streaming supplies raw API stream events, then a complete message and result. | [`SessionStore`](https://code.claude.com/docs/en/agent-sdk/session-storage.md) mirrors JSONL entries to an application backend and loads them for resume. It is a mirror, not a replacement: local writes occur first; failed `append()` retries at most three times then emits `mirror_error` and drops that batch. | SDK `resume` and session operations are supported; [`getSessionMessages()`](https://code.claude.com/docs/en/agent-sdk/typescript.md#getsessionmessages) reads user and assistant messages from a past session. | SDK callback hooks and plugins can observe lifecycle events, but direct SDK message capture is the correct primary mechanism. | **Yes, conditional.** Persist the application's input and complete output receipts independently; use SessionStore as recovery/mirror evidence and reconcile dropped-mirror alerts. |
| **Claude Code CLI/interactive/IDE session with hooks** | [`UserPromptSubmit`](https://code.claude.com/docs/en/hooks#userpromptsubmit) receives the submitted prompt before Claude processes it, plus `session_id`/`prompt_id`. | [`MessageDisplay`](https://code.claude.com/docs/en/hooks#messagedisplay) receives displayed assistant text deltas; [`Stop`](https://code.claude.com/docs/en/hooks#stop) supplies `last_assistant_message` after a normal main-agent response. | Local JSONL transcripts are continuously saved. However, [their format is explicitly internal and may change](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored); hook `transcript_path` is asynchronously written and may lag memory. | [`--continue`, `--resume`, `/resume`, and `/export`](https://code.claude.com/docs/en/sessions#export-and-locate-session-data) are supported. `/export` is rendered plain text for people, not a structured archival contract. | Hooks are documented commands/HTTP/MCP/prompt/agent handlers; [plugins package hooks](https://code.claude.com/docs/en/plugins#plugin-structure-overview), but do not create a richer exchange-event API. | **Best effort only.** Hooks are useful observation, but `Stop` does not fire after a user interrupt and API errors use `StopFailure`; hook output/external logging can also fail. Capture `UserPromptSubmit`, `MessageDisplay`, `Stop`, `StopFailure`, and explicit interrupt outcomes if an observer is still useful, while never asserting completeness. |
| **Claude Code `claude -p` / `stream-json`, framework-owned invocation** | The caller owns the prompt argument/stdin and can record it before launching. | [`stream-json`](https://code.claude.com/docs/en/headless#stream-responses) emits JSON events and ends with a `result` containing final text and session metadata; partial messages require `--include-partial-messages`. | Host transcript persistence is configurable and may be disabled, so persist the framework ledger directly. | A session ID can be resumed with `claude -p --resume`; suitable for scripted one-off or follow-up prompts. | CLI hooks can still run unless bare mode disables discovery. | **Yes for the wrapper's invocations**, with the same durable-ledger and interruption handling requirements. It is less ergonomic than the SDK for long-lived multi-turn interactive input. |

## Supported Contracts Versus Observations

### Supported contracts

- **Codex app-server:** OpenAI's official repository describes it as the interface for rich Codex clients. Its core model is a persisted conversation `Thread` containing `Turn`s and `Item`s; the event stream defines item lifecycle and calls completed items authoritative. The official README states that generated TypeScript/JSON schemas match the installed Codex version. Sources: [app-server overview and schema generation](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md#L1-L54), [thread read/item paging](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md#L498-L555), and [event/item contract](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md#L1391-L1481).
- **Claude Code hooks:** Official docs define the lifecycle, payloads, and special cases. In particular, `UserPromptSubmit` captures the original prompt; `MessageDisplay` captures displayed text only; `Stop` carries the final text for successful normal stop; user interruption and API failure take different paths. Sources: [hook lifecycle](https://code.claude.com/docs/en/hooks#hook-lifecycle), [common fields and transcript-lag warning](https://code.claude.com/docs/en/hooks#common-input-fields), [UserPromptSubmit](https://code.claude.com/docs/en/hooks#userpromptsubmit), [MessageDisplay](https://code.claude.com/docs/en/hooks#messagedisplay), [Stop](https://code.claude.com/docs/en/hooks#stop), and [StopFailure](https://code.claude.com/docs/en/hooks#stopfailure).
- **Claude Code Agent SDK and session store:** Official docs describe streaming user input, complete/partial output messages, `SessionStore.append/load`, resume, and the explicit best-effort mirror failure behavior. Sources: [streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode.md), [output messages](https://code.claude.com/docs/en/agent-sdk/streaming-output.md), [session store](https://code.claude.com/docs/en/agent-sdk/session-storage.md), and [session message API](https://code.claude.com/docs/en/agent-sdk/typescript.md#getsessionmessages).
- **Claude Code transcript/export/resume:** Official docs support local continuous sessions, resumption, and a human-readable export, while explicitly rejecting direct JSONL parsing as a stable scripting interface. Source: [Manage sessions](https://code.claude.com/docs/en/sessions.md).

### Official-source observations, deliberately not elevated to contracts

- The current public Codex source has a `hooks` crate with `UserPromptSubmit`, `Stop`, session, tool, compaction, and subagent event names. It also constructs a legacy `AfterAgent` hook payload containing input messages and `last_assistant_message`. Sources: [hook event list](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/hooks/src/lib.rs) and [runtime implementation](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/core/src/hook_runtime.rs). This establishes current implementation, **not** a reviewed, stable OpenAI capture-hook API.
- Current Codex source contains local rollout/session material and CLI resume logic. This research did not find a reviewed official promise that raw rollout JSONL is a stable external transcript format. Do not parse it as an integration contract.
- The Codex developer manual endpoints returned `403 Forbidden` from this environment on 2026-07-26. The Codex capability claims above therefore rely on the official public repository's app-server documentation at commit [`61a44880`](https://github.com/openai/codex/commit/61a44880a85d2fd0d8770908dea5733495e571c8), rather than asserting that unavailable manual text says more than it does.

## Recommended Adapter Contract

Use one framework-owned, append-only `conversation_receipt` ledger per selected host session. A record should include `host`, host version/schema version, integration surface, host session/thread ID, turn ID, message/item ID, role, payload or content-addressed payload reference, parent/subagent relation, timestamp, terminal status, and a deterministic idempotency key.

1. Write `user_submitted` before sending a user message to the host.
2. Append each complete agent message from the supported event/message API; keep stream deltas as optional display telemetry, not canonical content.
3. Append `turn_completed`, `interrupted`, or `failed` from the host's terminal event/result. Never silently turn a missing terminal event into success.
4. On reconnect, replay the supported host history where available and idempotently reconcile the ledger. Raise a visible incomplete-capture condition when the history cannot establish the missing boundary.
5. Keep native host transcript/export files as recovery references only. Do not use their undocumented format as the framework's truth.

This gives a portable framework guarantee over the integration it owns while honestly preserving the residual host and delivery failure boundary.

## Source Index

1. [OpenAI Codex app-server README, official source snapshot `61a44880`](https://github.com/openai/codex/blob/61a44880a85d2fd0d8770908dea5733495e571c8/codex-rs/app-server/README.md)
2. [OpenAI Codex official source snapshot `61a44880`](https://github.com/openai/codex/commit/61a44880a85d2fd0d8770908dea5733495e571c8)
3. [Claude Code hooks reference](https://code.claude.com/docs/en/hooks.md)
4. [Claude Code session management](https://code.claude.com/docs/en/sessions.md)
5. [Claude Agent SDK streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode.md)
6. [Claude Agent SDK streaming output](https://code.claude.com/docs/en/agent-sdk/streaming-output.md)
7. [Claude Agent SDK session storage](https://code.claude.com/docs/en/agent-sdk/session-storage.md)
8. [Claude Agent SDK TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript.md)
