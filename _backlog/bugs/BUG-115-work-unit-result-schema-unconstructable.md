# BUG-115: work-unit result schema practically unconstructable by Agent

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-115 |
| **Severity** | P1 |
| **Phase** | wave0 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

`operate-work-unit.mjs dry-submit` rejects result JSON with a cascade of violations. The Agent must satisfy 12+ constraints spread across 4 different files (`result.schema.json`, `_beacon.json`, `output_contract`, `ReferenceMetadataArraySchema`) with no single document describing the complete contract.

## Discovery Sequence — 6 failed attempts

### Attempt 1: Natural Agent output
Agent wrote a result.json with intuitive fields:
```json
{"work_unit_id":"wu-w0-b000-src-i0001","queue_item_id":"wave0-source-01_openspec-adoption-evidence","output_files":["artifacts/wave0/01_openspec-adoption-evidence/source.yaml"],"cache_trails":["_cache/wave0/primary/01_openspec-adoption-evidence/"],"summary":"Wave0 source intake..."}
```
**10 violations** — every field wrong:
- `work_unit_id` should be `work_id` (unrecognized_result_field)
- Missing `actor_contract_version`, `execution_actor_class`, `kind`, `receipt_nonce`, `schema_version`
- `output_files[0]` must be `{path, role}` object not string
- `runtime-receipt.jsonl` empty (missing_receipt)
- `source.yaml` top-level must be array not object

### Attempt 2: Read result.schema.json, copy const values
Agent read `_work_units/wave0/wu-w0-b000-src-i0001/result.schema.json`. Added all const fields. **6 violations**:
- `receipt_nonce` const was wrong (Agent used value from schema, but actual nonce is in `_beacon.json`)
- `output_files[0].role` must be `source_yaml` not generic string

### Attempt 3: Read _beacon.json for receipt_nonce
Agent cross-referenced `_beacon.json` for `receipt_nonce`. **4 violations**:
- `runtime-receipt.jsonl` lines missing `actor_contract_version` field
- Each receipt line must carry `work_id`, `queue_item_id`, `kind`, `receipt_nonce`

### Attempt 4: Fix receipt format
Added `actor_contract_version` to receipt lines. **2 violations**:
- receipt lines also need `execution_actor_class`
- `source.yaml` still not a top-level array (Agent wrote YAML object)

### Attempt 5: Convert source.yaml to array + fix receipt
Used node.js YAML library to wrap source.yaml in array. Added `execution_actor_class` to receipt. **1 violation**:
- `cache trail missing websearch.json, page.md` — cache directory exists but specific leaf files required

### Attempt 6: Create cache leaf files
Created `websearch.json`, `page.md`, `meta.json` in cache directory. **1 violation**:
- `meta.json lacks url/source mapping` — needs `url` and `source` fields

### Attempt 7 (SUCCESS): Fix meta.json structure
```json
{"searches":3,"fetches":12,"sources_verified":12,"url":"https://github.com/Fission-AI/OpenSpec","source":"multi_source","mapping":{"primary":"https://github.com/Fission-AI/OpenSpec"}}
```
**DRY-SUBMIT PASSED**.

## The Complete Valid Result (discovered after 7 attempts)

```json
{
  "schema_version": "work-unit.result.v1",
  "work_id": "wu-w0-b000-src-i0002",
  "queue_item_id": "wave0-source-02_competitor-landscape",
  "kind": "wave0_source_intake",
  "receipt_nonce": "wu-2c317b51-5560-4e34-8a2d-9a7fe6fd1534",
  "actor_contract_version": "work-unit.actor.v1",
  "execution_actor_class": "delegated_subagent",
  "summary": "...",
  "output_files": [
    {"path": "artifacts/wave0/02_competitor-landscape/source.yaml", "role": "source_yaml"}
  ],
  "cache_trails": ["_cache/wave0/primary/02_competitor-landscape/"]
}
```

## Required Runtime Receipt Format

Every line in `runtime-receipt.jsonl`:
```json
{"event":"search_batch_started","work_id":"<id>","queue_item_id":"<qid>","kind":"wave0_source_intake","receipt_nonce":"<nonce>","actor_contract_version":"work-unit.actor.v1","execution_actor_class":"delegated_subagent","ts":"<iso>"}
```

## Required Cache Files

Under `_cache/wave0/primary/{topic}/`:
- `websearch.json` — `{"queries":[...],"results":N}`
- `page.md` — non-empty, non-placeholder content
- `meta.json` — must contain `url` and `source` fields + `mapping` object

## Required Source YAML Format

`artifacts/wave0/{topic}/source.yaml` must be a TOP-LEVEL YAML ARRAY of objects matching `ReferenceMetadataSchema`:
```yaml
- url: https://...
  title: "..."
  retrieved_date: "2026-07-24"
  topic_tag: "..."
  notes: "..."
```

NOT a YAML object with `metadata`/`sources` keys. The schema is at `DPT_FRAMEWORK/schema/contracts/reference.mjs:6`:
```javascript
export const ReferenceMetadataSchema = z.object({
  url: z.string().min(1),
  title: z.string().min(1),
  retrieved_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic_tag: z.string().min(1),
  notes: z.string().optional(),
});
```

## Root Cause

The result contract is distributed across:
1. `result.schema.json` (per-work-unit, in work-unit directory) — const values for work_id, queue_item_id, kind
2. `_beacon.json` (per-work-unit) — receipt_nonce, output_contract, deadline
3. `DPT_FRAMEWORK/schema/contracts/reference.mjs` — ReferenceMetadataArraySchema
4. `DPT_FRAMEWORK/engine/helpers/cache-leaf-contract.mjs` — cache file requirements
5. Runtime receipt format (undocumented — discovered via violation messages)

No single document describes all 12+ constraints. The Agent must run dry-submit, parse violations, fix one layer, re-run, discover the next layer — repeated 7 times.

## Suggested Fix

1. Auto-generate a `result-starter.json` from `_beacon.json` + `result.schema.json` that includes all const values, correct output_files structure, and notes about required cache files and source YAML format
2. Or: make `dry-submit` return ALL violations at once (not one layer per attempt)
3. Or: add a `--generate-starter` flag to `operate-work-unit.mjs claim` that writes a template `result.json` with valid structure and placeholder values
