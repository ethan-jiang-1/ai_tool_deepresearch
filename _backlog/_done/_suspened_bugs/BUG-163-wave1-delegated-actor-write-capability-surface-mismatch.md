---
bug_id: BUG-163
title: Wave1 delegated actor write capability is inconsistent with role contract
severity: P1
phase: wave1
source: current Codex run, OpenSpec evolution/popularity/user-demands bundle
surfaced_at: 2026-07-29
---

# BUG-163: Delegated actor capability surface does not match filesystem-write contract

## What happened

In the same Wave1 claim batch, all five attempts were claimed for the same
`dpt-evidence-extractor` role with the same `available / probe_succeeded`
observation. Two actors (`wu-w1-b000-deep-i0001` and `wu-w1-b000-deep-i0002`)
successfully wrote paired artifacts, cache leaves, result JSON, and receipts.

Two other actors (`wu-w1-b000-deep-i0003` and `wu-w1-b000-deep-i0005`) fetched
real pages and wrote receipt diagnostics, but both returned the same capability
boundary: their active delegated-role contract allegedly permitted writing only
the slot-local runtime receipt and prohibited durable artifact, cache, and
result writes. Their claimed envelopes therefore had no result or accepted
cache/source backing and could not dry-submit.

The role guidance loaded by the Phase Agent declares `filesystem_write: required`
and lists `read_file`, `write_file`, `append_file`, and `mkdir` as required write
tools. The work-unit beacon exposes the same role and actor class for all five
attempts but does not expose the effective write capability or a failed probe
reason.

## Impact

Role availability can be reported as available and the actor can perform
network retrieval, while the actual output contract is impossible to satisfy.
The Phase Agent cannot distinguish a weak actor misunderstanding the prompt
from a host/runtime capability restriction before spending the work-unit lease.
This blocks delegated queue drain and creates pressure to fabricate or parent-
materialize evidence, which the contract forbids.

## Expected behavior

The role-bound native probe should establish the effective filesystem write
surface required by the assigned work-unit contract, or return a classified
unavailable result before claim. A claimed actor must either be able to write
the exact assigned bundle paths or expose a structured capability mismatch that
routes to the existing actor-unavailable/reclaim boundary. The beacon/inspect
surface should make this distinction reviewable without relying on model prose.

## Direct evidence

Bundle:
`dpt_rb_openspec-evolution-popularity-user-demands`

Affected attempts:

- `wu-w1-b000-deep-i0003` — `result.json` absent; actor response says durable writes prohibited
- `wu-w1-b000-deep-i0005` — `result.json` absent; actor response says durable writes prohibited

Control attempts:

- `wu-w1-b000-deep-i0001` — submitted successfully with durable outputs/cache
- `wu-w1-b000-deep-i0002` — submitted successfully with durable outputs/cache

The affected receipts contain `result_draft_started` with
`durable_result_write: not_performed`, followed by `invalid_result` /
`direct_target_missing` diagnostics. Their `_beacon.json` files contain no
effective capability declaration that explains the divergence.

## Classification and model note

This is a capability-surface/actor-contract ambiguity with a possible weak-model
contribution. It is not safe to call it purely a model defect because the actor
explicitly reports a contract prohibition, yet it is not proven to be a host
defect because the runtime does not expose the delegated actor's exact model or
tool policy. The Coding Agent is Codex and the runtime-visible model family is
GPT-5; exact deployment and delegated actor model IDs are unavailable.

## Disposition

Do not modify framework code in this run. Preserve the failed actor evidence,
reuse the same claimed work IDs only through a role-matching actor that can
actually write the assigned bundle, and keep the capability mismatch open for a
bounded contract/probe or actor-guidance change with a fresh regression.
