# Cache Raw Web Content (delta)

> req: CRC-002

## MODIFIED Requirements

### Requirement: Cache path delivery via spawn prompt

Sub-agent 的 spawn prompt SHALL 包含 `Cache directory:` 行，指向 `_cache/` 下的绝对路径（`_cache/{wave}/{batch}/{scope}/sNN_{source-slug}/` 布局，见 `shared-subagent-protocol.md` §2）。Phase Agent SHALL 在 spawn 前确保目标 cache 目录已存在（`mkdir -p`），并 SHALL 经 `drive-relay-slot stage` 产出 spawn prompt 与 `_beacon.json` 后再 spawn；SHALL NOT 经直接 `subagent-relay.mjs` engine 调用绕过 driver staging。

#### Scenario: Phase Agent spawns Sub-agent with cache path via driver

- **WHEN** Phase Agent delegates a search task
- **THEN** Phase Agent SHALL invoke `drive-relay-slot stage` before spawn
- **AND** the emitted spawn prompt SHALL include the line `Cache directory: /absolute/path/to/_cache/{wave}/{batch}/{scope}/`
- **AND** Phase Agent SHALL run `mkdir -p` to create the directory before spawning
- **AND** if no cache path parameter is provided, the spawn prompt SHALL NOT include this line (backward compatible)
