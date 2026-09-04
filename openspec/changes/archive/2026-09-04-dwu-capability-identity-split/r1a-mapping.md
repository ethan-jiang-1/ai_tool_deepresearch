# R1a 测绘:39 块新家判定与 ID 分配表(R1a.1)

> 判定依据 = DWU plan §2 四分法 + `@impl` 模块缝证据(REVIEW 2026-09-03 定案的显式判据);生成 = 共享解析器 spec-unit-parse.mjs。行号为 2026-09-04 实测。

| 块起始行 | 行数 | 新家 | 现内联 ID | 迁移后 ID | @impl 模块缝 | requirement 标题 |
|---|---|---|---|---|---|---|
| 18 | 33 | 母体 agent/delegated-work-units | DEW-001 | 沿用 DEW-001 | cli/validate-work-unit-hygiene.mjs | Work-unit pipeline SHALL be the sole production delegated-work path |
| 52 | 19 | 母体 agent/delegated-work-units | DEW-002 | 沿用 DEW-002 | cli/operate-work-unit.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-envelope.mjs<br>engine/work-unit-index.mjs<br>engine/work-unit-lifecycle.mjs<br>schema/contracts/work-unit.mjs | Work-unit identity SHALL be Engine-allocated and index-backed |
| 72 | 56 | 母体 agent/delegated-work-units | DEW-003 | 沿用 DEW-003 | engine/helpers/continuation-cue.mjs<br>engine/helpers/queue-demand-admission.mjs<br>engine/work-unit-lifecycle.mjs | Work-unit claim SHALL bind queue demand and lease |
| 129 | 17 | 母体 agent/delegated-work-units | DEW-027 | 沿用 DEW-027 |  | Sub-agents SHALL NOT own workflow authority |
| 147 | 98 | 母体 agent/delegated-work-units | DEW-004 | 沿用 DEW-004 | engine/work-unit-assignment-contract.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-current-profile.mjs<br>engine/work-unit-index.mjs<br>engine/work-unit-lifecycle.mjs<br>engine/work-unit-validation.mjs<br>schema/contracts/work-unit.mjs | Work-unit envelopes SHALL carry Engine-owned index records and complete claim profiles |
| 246 | 136 | 母体 agent/delegated-work-units | — | DEW-032(新注册) |  | Envelope readers and generated projections SHALL stay consistent with the claim profile |
| 383 | 83 | agent/work-unit-submission | DEW-005 | WSU-001 | engine/helpers/direct-output-contract.mjs<br>engine/work-unit-submit-snapshot.mjs<br>engine/work-unit-submit.mjs | Submit SHALL remain the only successful delegated completion authority |
| 467 | 56 | agent/work-unit-submission | — | WSU-002 |  | Successful submit SHALL complete queue demand and record contribution boundaries |
| 524 | 56 | 母体 agent/delegated-work-units | DEW-009 | 沿用 DEW-009 | engine/helpers/work-unit-role-guidance.mjs<br>engine/work-unit-assignment-contract.mjs | Work-unit tasks SHALL carry absolute bundle-root paths and the read-only beacon |
| 581 | 67 | 母体 agent/delegated-work-units | — | DEW-033(新注册) |  | Task verification and generated guidance SHALL bind required outputs and role contracts |
| 649 | 57 | agent/work-unit-submission | DEW-012 | WSU-003 |  | Submit canonicalization SHALL stay a narrow bounded stage |
| 707 | 50 | agent/work-unit-submission | — | WSU-004 |  | Accepted submits SHALL persist canonical authority without widening the boundary |
| 758 | 73 | agent/work-unit-preflight | DEW-013 | WUP-001 | cli/operate-work-unit.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-submit.mjs | Dry-submit SHALL be a read-only structured preflight mirroring submit semantics |
| 832 | 135 | agent/work-unit-preflight | — | WUP-002 |  | Dry-submit SHALL keep provenance strict through one neutral target module |
| 968 | 62 | agent/work-unit-preflight | DEW-014 | WUP-003 | cli/operate-work-unit.mjs<br>engine/work-unit-candidate-projection.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-lifecycle.mjs<br>engine/work-unit-timeout-preflight.mjs<br>schema/contracts/work-unit.mjs | Timeout preflight SHALL be a progress-aware read-only recommendation |
| 1031 | 118 | agent/work-unit-correction | — | WUC-001 |  | Timeout terminalization SHALL run the same guard with explicit audit |
| 1150 | 59 | agent/work-unit-correction | DEW-023 | WUC-002 | cli/operate-work-unit.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-index.mjs<br>engine/work-unit-inspect.mjs<br>engine/work-unit-lifecycle.mjs<br>engine/work-unit-submit-integrity.mjs<br>engine/work-unit-submit.mjs<br>engine/work-unit-timeout-preflight.mjs<br>engine/work-unit-transaction-primitives.mjs<br>engine/work-unit-transaction-projection.mjs<br>engine/work-unit-transaction.mjs<br>schema/contracts/work-unit-transaction.mjs | Submit integrity SHALL share one read-only transaction fact |
| 1210 | 113 | agent/work-unit-correction | — | WUC-003 |  | Journal disposition SHALL be a closed enum with declared recovery boundaries |
| 1324 | 61 | agent/work-unit-correction | — | WUC-004 |  | Transaction recovery SHALL settle journals without stealing locks |
| 1386 | 62 | agent/work-unit-submission | DEW-025 | WSU-005 |  | Current Wave0 work-unit contracts SHALL expose submitted source contributions without a competing rich-reference route |
| 1449 | 11 | agent/work-unit-correction | DEW-008 | WUC-005 | cli/validate-work-unit-hygiene.mjs<br>engine/work-unit-submit-declaration-recovery.mjs | Invalid submit SHALL remain non-terminal |
| 1461 | 63 | agent/work-unit-correction | DEW-006 | WUC-006 | cli/operate-work-unit.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-lifecycle.mjs<br>engine/work-unit-submit-late-retry.mjs | Terminal attempt transitions SHALL fail closed |
| 1525 | 92 | agent/work-unit-correction | DEW-015 | WUC-007 | engine/work-unit-candidate-projection.mjs<br>engine/work-unit-submit-late-retry.mjs | Audited late-submit SHALL recover eligible timed-out work units |
| 1618 | 19 | agent/work-unit-submission | DEW-007 | WSU-006 | engine/work-unit-submit-snapshot.mjs | Gates SHALL read submitted work-unit ledger coverage |
| 1638 | 79 | agent/work-unit-submission | DEW-010 | WSU-007 |  | Submitted result and ledger hashes SHALL detect post-submit drift before gate pass |
| 1718 | 36 | agent/work-unit-submission | DEW-011 | WSU-008 | engine/work-unit-submit-snapshot.mjs | Successful work-unit submit SHALL verify durable queue postconditions |
| 1755 | 92 | 母体 agent/delegated-work-units | DEW-016 | 沿用 DEW-016 | engine/work-unit-actor.mjs | Work-unit claim SHALL evaluate one explicit actor observation before allocation |
| 1848 | 61 | agent/work-unit-correction | DEW-017 | WUC-008 | engine/work-unit-actor.mjs<br>engine/work-unit-current-profile.mjs | Phase Agent fallback SHALL remain inside the work-unit transaction |
| 1910 | 77 | 母体 agent/delegated-work-units | DEW-018 | 沿用 DEW-018 |  | Work-unit provenance SHALL bind execution actor class |
| 1988 | 15 | 母体 agent/delegated-work-units | DEW-019 | 沿用 DEW-019 |  | Work-unit provenance SHALL inherit UID-bound queue identity without duplicate fields |
| 2004 | 12 | 母体 agent/delegated-work-units | DEW-020 | 沿用 DEW-020 |  | Existing task brief may expose a read-only user-controls coordinate |
| 2017 | 80 | 母体 agent/delegated-work-units | DEW-021 | 沿用 DEW-021 | engine/helpers/cache-leaf-contract.mjs<br>engine/helpers/direct-output-contract.mjs<br>engine/work-unit-envelope.mjs<br>schema/contracts/reference.mjs | Delegated work contract entry SHALL be constructible from one generated projection |
| 2098 | 52 | 母体 agent/delegated-work-units | DEW-022 | 沿用 DEW-022 | engine/work-unit-attempt-disposition.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-envelope.mjs<br>engine/work-unit-inspect.mjs<br>engine/work-unit-validation.mjs | Work-unit attempts SHALL expose logical execution guidance from existing attempt bindings |
| 2151 | 136 | agent/work-unit-correction | DEW-024 | WUC-009 | cli/operate-work-unit.mjs<br>engine/helpers/gate-helpers-readers.mjs<br>engine/work-unit-core.mjs<br>engine/work-unit-current-profile.mjs<br>engine/work-unit-envelope.mjs<br>engine/work-unit-inspect.mjs<br>engine/work-unit-lifecycle.mjs<br>engine/work-unit-projection.mjs<br>engine/work-unit-submit.mjs<br>engine/work-unit-submitted-ledger.mjs<br>engine/work-unit-supersession.mjs<br>engine/work-unit-validation.mjs<br>schema/contracts/work-unit.mjs | Submitted correction SHALL use audited supersession and one fresh successor |
| 2288 | 38 | 母体 agent/delegated-work-units | DEW-026 | 沿用 DEW-026 |  | Affected delegated work SHALL receive current intent through the existing task brief |
| 2327 | 17 | agent/work-unit-preflight | DEW-028 | WUP-004 |  | Dry-submit cache-URL mismatch diagnostics SHALL carry the recorded leaf urls |
| 2345 | 17 | agent/work-unit-preflight | DEW-029 | WUP-005 |  | Dry-submit runtime-receipt schema diagnostics SHALL carry the raw value, all affected lines, and the expected format |
| 2363 | 53 | 母体 agent/delegated-work-units | DEW-030 | 沿用 DEW-030 | engine/work-unit-envelope.mjs | Generated source-claim authoring guidance SHALL state exact cache/degraded-ref and source_ref value domains with an accepted-and-degraded example |
| 2417 | 32 | agent/work-unit-preflight | DEW-031 | WUP-006 | engine/work-unit-validation.mjs | Dry-submit invalid-result SHALL report duplicate accepted claim URLs and their count |

统计:母体 16(其中 2 块无内联 ID → 新注册 DEW-032/033)/ submission 8(WSU-001..008)/ preflight 6(WUP-001..006)/ correction 9(WUC-001..009)。
迁移换发:17 个旧 DEW ID 标 [DEPRECATED]+后继指针(005,006,007,008,010,011,012,013,014,015,017,023,024,025,028,029,031);6 个无内联 ID 的迁移块直接领新 ID。
