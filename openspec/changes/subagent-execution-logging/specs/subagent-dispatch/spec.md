# Subagent Dispatch (delta)

> req: SUD-004, SUD-005, SUD-006

## Purpose

为 `subagent-dispatch` 增加 beacon 模式与 nonce 持久化：staging 写 `_beacon.json`（bundle 路径 + logger 路径 + slot key + UUID nonce）、把 nonce 持久化进 `dispatch.json`、spawn prompt 只传 slot 目录 + beacon 指针。解决"sub-agent 怎么知道 bundle/logger 在哪"，并把 engine 生成的 nonce 落盘为 Layer-1 取证锚。

## ADDED Requirements

### Requirement: Staging SHALL write a per-slot beacon with runtime coordinates

When `stageSubagentSlots` / `createDispatchManifest` creates a slot directory, it SHALL also write `_beacon.json` containing `bundle_dir` (absolute), `log_cli` (absolute path to `log-event.mjs`), `slot_key`, and `receipt_nonce` (the `createSlot` UUID). The beacon is the single source of truth the sub-agent reads to locate the bundle and logger.

#### Scenario: Beacon written at staging
- **WHEN** a slot is staged under `_subagents/wave_NN/slot_MM/`
- **THEN** `_beacon.json` SHALL exist with `bundle_dir`, `log_cli`, `slot_key`, and a UUID `receipt_nonce`
- **AND** `receipt_nonce` SHALL equal the in-memory slot's `createSlot()` nonce

#### Scenario: Beacon carries absolute paths
- **WHEN** the bundle lives at an arbitrary absolute location
- **THEN** `_beacon.json.bundle_dir` and `_beacon.json.log_cli` SHALL be absolute paths usable by a sub-agent in an isolated context

### Requirement: dispatch.json SHALL persist each slot's engine-generated receipt nonce

`dispatch.json` SHALL record each slot's `receipt_nonce` (UUID) alongside its key, slotIndex, and roleAgentKey. This persists the engine-generated nonce to disk so provenance forensics can bind receipts/ledger entries back to a staged slot without relying on the in-memory slot object.

#### Scenario: dispatch.json records nonces
- **WHEN** `createDispatchManifest` writes `dispatch.json`
- **THEN** each slot entry SHALL include a UUID `receipt_nonce`
- **AND** the nonce SHALL match the corresponding `_beacon.json` `receipt_nonce`

#### Scenario: Forensics can read nonce from dispatch.json
- **WHEN** a forensic check needs to verify a slot's nonce
- **THEN** it SHALL read `dispatch.json` as the on-disk record of staged nonces

### Requirement: Spawn prompt SHALL hand the sub-agent only its slot directory plus a beacon pointer

`buildSpawnPrompt` SHALL embed the slot directory absolute path and an instruction to read `_beacon.json` for `bundle_dir` / `log_cli` / `receipt_nonce`. It SHALL NOT rely on inlining the bundle path as the sole channel, and SHALL instruct the sub-agent to carry the nonce in every lifecycle event.

#### Scenario: Spawn prompt is beacon-driven
- **WHEN** `recordAgentSpawnRequested` builds the spawn prompt
- **THEN** the prompt SHALL contain the slot directory absolute path and a directive to read `<slot>/_beacon.json`
- **AND** SHALL instruct the sub-agent to emit lifecycle events carrying the beacon `receipt_nonce`
