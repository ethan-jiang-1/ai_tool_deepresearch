// @impl DEW-007, FRE-005
// Work-unit output declaration ledger compatibility surface.
//
// The production delegated completion path is `operate-work-unit submit`.
// This module remains only so older imports of `OutputDeclarationLedgerRecord`
// resolve to the current submitted work-unit ledger schema.

export { WorkUnitLedgerRecordSchema as OutputDeclarationLedgerRecord } from '../schema/index.mjs';
