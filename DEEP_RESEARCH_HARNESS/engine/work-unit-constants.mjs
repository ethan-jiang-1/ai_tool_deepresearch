// Work-unit constants: kind registry, output ledger path, required receipt fields, default contracts.

// Canonical CLI script paths (single source of truth for rerun-command builders;
// new consumers reference these instead of hardcoding the path).
export const CLI_OPERATE_WORK_UNIT = 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs';
export const CLI_OPERATE_QUEUE = 'DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs';

export const WORK_UNITS = {
  ROOT: '_work_units',
  INDEX: '_work_units/_index.json',
  TRANSACTIONS: '_work_units/_transactions',
  LOCK: '_work_units/.lock',
};

export const WORK_UNIT_OUTPUT_LEDGER = 'rb_output_declarations.jsonl';

export const DEFAULT_KIND_REGISTRY = Object.freeze({
  kinds: Object.freeze({
    wave0_source_intake: 'src',
    wave1_topic_deepening: 'deep',
    wave2_targeted_evidence: 'targ',
  }),
  codes: Object.freeze({
    src: 'wave0_source_intake',
    deep: 'wave1_topic_deepening',
    targ: 'wave2_targeted_evidence',
  }),
});

export const WORK_UNIT_REQUIRED_RECEIPT_FIELDS = Object.freeze(['work_id', 'queue_item_id', 'kind', 'receipt_nonce']);

export const DEFAULT_KIND_CONTRACTS = Object.freeze({
  wave0_source_intake: Object.freeze({
    actor_policy: Object.freeze({ delegated_role_key: 'dpt-source-intake', phase_agent_fallback: 'allowed' }),
    task_brief: 'Research the assigned source-intake demand, write the assigned source metadata and cache facts, and return only through the work-unit result contract.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['source_yaml'],
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
  wave1_topic_deepening: Object.freeze({
    actor_policy: Object.freeze({ delegated_role_key: 'dpt-evidence-extractor', phase_agent_fallback: 'allowed' }),
    task_brief: 'Deepen the assigned topic with bounded evidence work, submitted source backing, declared evidence/question outputs, and submit-ready cache trails. Canonical topic reference Markdown is Phase-owned after submit unless this task explicitly assigns a reference output.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'question_list', 'other'],
        reference_requires_source_url: true,
      }),
      source_claims: Object.freeze({
        allowed: true,
        accepted_requires_cache_or_degraded: true,
        prior_submitted_output_roles: Object.freeze(['evidence_summary']),
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
  wave2_targeted_evidence: Object.freeze({
    actor_policy: Object.freeze({ delegated_role_key: 'dpt-topic-scout', phase_agent_fallback: 'allowed' }),
    task_brief: 'Perform only the assigned targeted evidence search and return bounded source evidence, source URLs, confidence/fills_gap signals, declared outputs when assigned, and cache trails for submit validation. Final finding status and 00-cross projections are Phase-owned after submit.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'other'],
        reference_requires_source_url: true,
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
});

export const WORK_UNIT_INDEX_TARGET = '_work_units/_index.json';
export const QUEUE_TARGET = 'rb_queue.json';
