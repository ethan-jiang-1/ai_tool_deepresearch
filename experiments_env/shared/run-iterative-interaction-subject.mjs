#!/usr/bin/env node
// @impl EXA-003, EXA-005, EXA-006, EXA-008, RWP-002, VER-006

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import {
  assessNode,
  createState,
  createWorkflowRuntime,
} from '../../DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs';
import { readFinalReportInventory } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs';
import { SELECTED_RESEARCH_ACCESS_ADAPTER_PATH } from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs';
import { buildIterativeInteractionSubjectInvocation } from './iterative-interaction-subject-launch.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAUNCHER = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'host_tools', 'claude-deepseek.mjs');
const NODES_DIR = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'workflows', 'nodes');
const HITL1_CAPABILITY_PROBE_GUIDE_PATH = join(NODES_DIR, 'shared', 'shared-hitl1-capability-probe.md');
const SUBJECT_TIMEOUT_MS = 3 * 60 * 1000;
const SETTINGS_PATH = join(
  homedir(),
  '.codex',
  'private',
  'codex-only-dpt-iterative-subject-deepseek-v2.settings.json',
);

const SUBJECTS = {
  '125': {
    bundlePrefix: 'dpt_disp_case-125_',
    transcript: 'case-125-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 125, distinct from the Playbook Agent. Act as the Wave1 Phase Agent only inside the exact bundle path provided by the runner. Load the current production Wave1 surface and direct bundle facts before acting.',
    messages: ['Read the accepted natural-language focus in the existing literal controls snapshot and choose the smallest readable current commitment for the one queued Wave1 demand. Use only the existing wave1_topic_deepening availability, claim, delegated dpt-evidence-extractor, dry-submit, formal submit, reference/index, seed projection, depth-review, and inspect operations. The child must independently perform bounded real WebSearch and WebFetch and write its own result, receipt, source claims, cache trail, and assigned outputs. After a successful current submitted increment, write focus_coverage in the current depth review using the canonical topic UID, the current profile rerun_count, and only the reviewed current submitted work-unit refs. If the same inspect exposes an external_action, user_decision, or missing_contract boundary with no authorized Wave1 repair, retain a visible limited commitment instead; do not use partial or blocked to bypass repair. Save native dry-submit/formal-submit/inspect JSON as case-125-dry-submit.json, case-125-formal-submit.json, and case-125-inspect.json. Write case-125-subject-evidence.json with exactly focus_context_ref, queue_item_id, work_id, child_evidence_ref, formal_submit_ref, depth_review_ref, and inspect_ref. Do not append playbook verdict checks, native completion, health output, cleanup, or hand-write child-owned source, cache, result, or receipt facts.'],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Use one bounded Subject turn and one real child actor. A missing independent actor, real search/fetch capability, or legal Engine operation is unavailable, not a limitation; fail honestly so the Playbook finalizes NOT_RUN. Preserve child and Engine facts before Phase closeout.',
    timeoutMs: 12 * 60 * 1000,
  },
  '204': {
    bundlePrefix: 'dpt_disp_case-204_',
    transcript: 'case-204-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 204, distinct from the Playbook Agent. Work only in the exact supplied bundle and follow the injected minimal Seed Topics runbook.',
    messages: ['Execute the injected six-step Seed Topics runbook. Write one short, non-duplicate body update and choose concrete non-empty enrichment values. Stop after the real Gate result.'],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Use no external services. Produce the procedure through the existing writer and queue/Gate commands only. Do not write playbook verdict checks, native completion, health output, or cleanup. Fail honestly if a required production command is unavailable.',
    surface: 'minimal_seed_authoring',
    timeoutMs: 60 * 1000,
  },
  '115': {
    bundlePrefix: 'dpt_disp_case-115_',
    transcript: 'case-115-subject-transcript.jsonl',
    system: 'You are the independent isolated direct-sample probe agent for case 115. Your entire authority is the injected executor-scoped adapter contract, one injected HITL1 capability-probe guide, and the injected independent controller. You have no run bundle, filesystem, profile, status, Gate, work-unit, receipt, ledger, evidence, or user-decision authority.',
    messages: ['Execute the injected one-shot fixed direct-sample probe exactly per the injected controller. Directly retrieve only the controller-declared public sample URLs on your already-permitted surface. Use no search. Return only the controller-defined compact current YAML `research_access` observation with one terminal entry per declared sample.'],
    tools: 'Bash,WebFetch',
    boundary: 'The runner owns retained experiment storage and does not disclose its path. Follow exactly the injected controller sample suite and bounds. Do not use search, an undeclared URL, or any tool beyond the controller-permitted direct surfaces and exact fallback. Return no prose, page bytes, candidate list, transcript, analysis, receipt, or Gate claim. Honest unavailable and whole no-request returns remain valid.',
    surface: 'isolated_hitl1_capability_probe',
  },
  '164': {
    bundlePrefix: 'dpt_disp_case-164_',
    transcript: 'case-164-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 164, distinct from the Playbook Agent. Act as the Phase Agent only inside the exact bundle path provided by the runner and follow the injected current Wave1/shared work-unit surfaces.',
    messages: [
      'Act as the Phase Agent for the single queued Wave1 primary demand. Perform the required role-bound availability observation, claim exactly that demand through the production work-unit CLI, and invoke one real dpt-evidence-extractor child actor with the exact generated task/beacon/schema. The child must independently do one bounded real WebSearch and WebFetch, write its own source/cache/result/receipt and both assigned outputs, record work_done, and deliberately leave only the Key Findings section semantically empty as this controlled canary fault. After the child returns, write case-164-first-child-evidence.json as a path-only index with work_id, queue_item_id, result_ref, runtime_receipt_ref, required_output_refs, cache_trail_refs, source_urls, and child evidence ref; run native dry-submit once and save its complete JSON as case-164-turn1-dry-submit.json. Stop. Do not repair, fail, enqueue, claim a replacement, submit, append verdict checks, or fabricate any child surface.',
      'Consume case-164-turn1-dry-submit.json and case-164-output-hashes.json. Use the exact Engine-derived primary_root_code to run non-retry operate-work-unit fail --reason semantic_contract:<primary_root_code> for the first attempt. Explicitly enqueue a new primary Wave1 demand for the same canonical Topic and exact paired receipts under a fresh globally unused queue_item_id; do not reuse the failed ID, weaken it to supplementary, use actor_spawn_unavailable, or rely on automatic retry. Save the complete native outputs at bundle-root case-164-turn2-fail.json, case-164-turn2-enqueue.json, and case-164-turn2-claim.json respectively. Claim exactly that replacement and write case-164-replacement-evidence.json as a path-only index with the new work_id, queue_item_id, generated task/beacon/schema/result/receipt refs, required output refs, and those three native JSON refs. Stop before invoking another child or writing, repairing, or submitting replacement output.',
      'Read case-164-replacement-evidence.json and the replacement generated task/beacon/schema. Invoke a second distinct real dpt-evidence-extractor child actor. It must independently perform its own bounded real WebSearch and WebFetch, own new source/cache/result/receipt facts, write both canonical required outputs with every direct semantic section non-empty, and verify writes before work_done. Do not return this Subject turn while the child is merely running in the background: wait for the native child task completion notification and inspect its assigned files only after that completion. Write case-164-second-child-evidence.json as a path-only index with work_id, queue_item_id, result_ref, runtime_receipt_ref, required_output_refs, cache_trail_refs, source_urls, and child evidence ref. Run native dry-submit for the replacement and save complete JSON as case-164-turn3-dry-submit.json, then formal submit only if that fresh dry-submit predicts pass and save complete JSON as case-164-turn3-submit.json. Stop. Do not submit or rewrite the failed first attempt, append playbook verdict checks, materialize Wave-wide completion, or claim research quality.',
    ],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Use exactly three bounded turns in this same session. Invoke one real child in turn 1 and a distinct real child in turn 3. Do not write playbook verdict checks, native completion, health output, or cleanup. If a required child/search/fetch surface is unavailable, fail honestly rather than fabricating evidence.',
    afterTurn: observeCase164Boundary,
    timeoutMs: 12 * 60 * 1000,
  },
  '225': {
    bundlePrefix: 'dpt_disp_case-225_',
    transcript: 'case-225-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 225, distinct from the Playbook Agent. Act as the Phase Agent only inside the exact bundle path provided by the runner and follow the injected current Wave1/shared work-unit surfaces.',
    messages: ['Act as the Phase Agent for the one queued Wave1 primary demand. Perform the role-bound availability observation, claim exactly that demand through the production work-unit CLI, and invoke one real dpt-evidence-extractor child actor with the exact generated task/beacon/schema. The child must independently perform bounded real WebSearch and WebFetch, write its own result, runtime receipt, required outputs, source claims, and cache trails, then record work_done. After the child returns, write case-225-child-evidence.json as a path-only JSON object with exactly these literal keys: `work_id`, `queue_item_id`, `task_ref`, `beacon_ref`, `result_ref`, `receipt_ref`, `schema_ref`, `required_outputs`, `cache_trail_refs`, `source_urls`, and `accepted_source_urls`. Populate `work_id` with the claimed Engine work ID. Do not substitute `claimed_work_id` or rename fields. Run native dry-submit and save complete JSON as case-225-dry-submit.json. Only when the Engine recommends submit, run formal submit and save complete JSON as case-225-formal-submit.json. From the submitted backing, complete the existing Wave1 Phase closeout: materialize consumer reference/index, write depth-review.yaml, replace the applicable seed return-map tokens with meaning and concrete refs, then run inspect-wave1-output.mjs and save complete JSON as case-225-inspect.json. Write case-225-phase-closeout.json as a path-only JSON object with exactly these literal keys: `submitted_work_id`, `queue_item_id`, `materialized_reference_refs`, `index_ref`, `depth_review_ref`, `seed_ref`, and `inspect_ref`. Do not substitute `materialized_references` or `reference_refs`. Stop. Do not append playbook verdict checks, native completion, health output, cleanup, or hand-write actor-owned result/receipt/cache/provenance facts.'],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Use one bounded Subject turn and one real child actor. Preserve the child and Engine-produced surfaces before Phase closeout. Do not write playbook verdict checks, native completion, health output, or cleanup. If a required child, search/fetch, or Engine path is unavailable, fail honestly rather than fabricating evidence.',
    timeoutMs: 12 * 60 * 1000,
  },
  '232': {
    bundlePrefix: 'dpt_disp_case-232_',
    transcript: 'case-232-subject-transcript.jsonl',
    system: 'You are the independent Wave2 Subject Agent for case 232, distinct from the Playbook Agent. Work only in the exact bundle path provided by the runner. Read the injected production Wave2 surface and direct post-Wave1 bundle facts, then perform the bounded triage task.',
    messages: ['执行当前 Wave2 finding triage：读取两个 topic 的 Wave1 evidence-summary 和 question-list；至少做一次真实 WebSearch，并在可用时 WebFetch 一个结果；把 finding 明确分成 use_existing_evidence、record_only 和 explore_search 或 exploit_search。任何 search-required finding 必须走真实 queue/work-unit claim、Subject产出、submit 和 receipt 绑定，不能留下 orphan reference。完成 cross-topic-ledger.md、finding-index.yaml、synthesis.md、两个 seed topic 的 Wave2 backfill，并按当前 production surface 写入 wave2_completion 后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Use at most two bounded searches and one fetch. Do not write playbook verdict checks, native completion, health output, or cleanup. If external access or a required nested actor is unavailable, fail honestly instead of fabricating evidence.',
  },
  '154': {
    bundlePrefix: 'dpt_disp_case-154_',
    transcript: 'case-154-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 154, distinct from the Playbook Agent. Work only in the exact bundle path provided by the runner. First consume the injected legal Wave1 surface. Only after the runner re-delivers the legal Wave2 surface in this same session may you perform the bounded Wave2 task.',
    messages: [
      'Consume the prepared Wave1 predecessor only through the current production surface: run the current Wave1 Gate, retain its complete JSON as case-154-wave1-gate.json, and only if it passes consume check.next with enter-phase and advance-status using wave1_complete. Verify the resulting status is phases/phase-wave2.md. Stop before making any Wave2 finding, queue decision, search, child invocation, or Wave2 artifact.',
      'The runner will replace this message with the exact reloaded Wave2 control surface after the legal entry is established.',
    ],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'The first turn may only consume the current Wave1 Gate and immediate legal handoff. In the second turn, create and retain one named W2F-154 finding with gap_status: needs_search and decision explore_search or exploit_search, then use one real dpt-topic-scout child through the production wave2_targeted_evidence work-unit claim/submit path. The Subject must not invoke WebSearch or WebFetch itself. Do not write playbook verdict checks, native completion, health output, cleanup, or hand-edit lifecycle authority.',
    afterTurn: reloadCase154Wave2Surface,
    timeoutMs: 8 * 60 * 1000,
  },
  '318': {
    bundlePrefix: 'dpt_disp_case-318_',
    transcript: 'case-318-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 318, distinct from the Playbook Agent. Work only in the exact bundle path provided by the runner. Execute the injected current production rerun surface against direct bundle facts.',
    messages: [
      'Execute the rerun phase only through the sanctioned direction-only candidate: read the accepted HITL2 rationale, current rerun_count, canonical topic_uid, and loaded shared seed-authoring contract; compute target_rerun_count=1; write a retained JSON input for `set_rerun_direction` with that exact topic_uid, `action: supplement`, and non-empty cost/failure-mode dimensions, depth, guardrails, and rationale excerpt; then invoke `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-json>`. Verify the production apply result. Stop before changing rb_profile.yaml, running rerun-ready, entering another phase, advancing status, or direct-editing the seed direction/Engine-owned authority.',
      'Resume from the current bundle facts. Recognize the existing direction/profile mismatch as the documented crash window. Preserve the accepted direction bytes; perform only the existing profile-count owner update to that existing target, then complete the sanctioned rerun-ready Gate plus immediate enter-phase and source-gate status synchronization. Consume structured feedback if the same Gate fails. Do not invoke topic-state apply again or directly edit the seed direction. Stop after the immediate seed-topics handoff.',
    ],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Do not search or call external services. Do not hand-edit status, trace, gate attempts, work-unit authority, or declarations. The adapter records a deterministic read-only crash-window snapshot between the two turns.',
    afterTurn: observeCase318CrashWindow,
  },
  '711': {
    bundlePrefix: 'dpt_disp_case-711_',
    transcript: 'case-711-transcript.jsonl',
    system: 'You are the independent subject Agent for case 711. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts. Respond to the user\'s current turn, then follow that production surface for subsequent turns in this same session.',
    messages: ['请根据当前研究请求给出一个简洁的研究建议，只保留验证本次交互所需的最小范围。', '按这个开始'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Complete the minimum work owned by the current phase. After its Gate and immediate legal handoff, stop before executing the newly loaded phase.',
  },
  '714': {
    bundlePrefix: 'dpt_disp_case-714_',
    transcript: 'case-714-transcript.jsonl',
    system: `You are the independent subject Agent for case 714. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session. Framework commands are executable from ${REPO_ROOT}; use that absolute root when a production instruction names a relative DEEP_RESEARCH_HARNESS or experiments_env command, without inspecting unrelated framework source.`,
    messages: ['请根据当前研究请求给出一个简洁的研究建议，只保留验证本次交互所需的最小范围。', '按建议开始。本轮只使用一手来源；不要把媒体转述当作证据。报告最后单列无法用一手来源验证的结论。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Complete the minimum work owned by the current phase. Capture the supplied research controls only in the production host-file snapshot, then stop after its Gate and immediate legal handoff before executing the newly loaded phase.',
  },
  '716': {
    bundlePrefix: 'dpt_disp_case-716_',
    transcript: 'case-716-transcript.jsonl',
    system: `You are the independent subject Agent for case 716. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Respond to the user's current turn, then follow that production surface for subsequent turns in this same session. Framework commands are executable from ${REPO_ROOT}; use that absolute root when a production instruction names a relative DEEP_RESEARCH_HARNESS or experiments_env command, without inspecting unrelated framework source.`,
    messages: ['请针对当前跨国制造企业研究请求给出建议。保留所有确实需要独立回答的决策问题，并把相近问题按可审阅的研究线程归组。', '按建议开始；其中资本投资这个话题请额外比较租赁、购买与推迟决策在不同地区融资约束下的现金流、风险和适用条件。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Complete the minimum work owned by the current phase. Preserve the accepted focus only in the production host-file controls snapshot, then stop after its Gate and immediate legal handoff before executing the newly loaded phase.',
  },
  '717-round1': {
    bundlePrefix: 'dpt_disp_case-717_',
    transcript: 'case-717-round1-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 717 round 1, distinct from the Playbook Agent. Work only in the exact supplied bundle. Start from its injected current production surface and direct facts, and own every semantic decision and write needed for the user turn.',
    messages: ['继续研究。请把“租赁、购买与推迟决策的现金流比较”加入当前重点，并增加“按地区分别比较融资约束”的要求；请按正常研究流程完成这一轮并给我更新后的报告。'],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Complete exactly one accepted normal HITL2 rerun through the next legally entered Final and its first current-lineage report. You own the accepted interpretation, revision, topic projection, current task briefs, coverage, synthesis, HITL2 decision, composition handoff, and report. Use only production routes and real actor/tool evidence; do not write playbook verdict checks, native completion, health output, cleanup, or any case-717 observer file. Fail honestly if a required authenticated actor, search/fetch tool, or legal operation is unavailable.',
    timeoutMs: 12 * 60 * 1000,
  },
  '717-round2': {
    bundlePrefix: 'dpt_disp_case-717_',
    transcript: 'case-717-round2-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 717 round 2, distinct from both the Playbook Agent and the prior Subject context. Work only in the exact supplied bundle. Start fresh from its injected current Final production surface and direct facts, without relying on prior chat.',
    messages: ['请再补充新的可核验一手来源，然后把当前的“租赁、购买与推迟决策的现金流比较”改为“分阶段投资阈值与触发条件”，并撤回“按地区分别比较融资约束”的要求；请据此重新评估并更新报告。'],
    tools: 'Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Treat this as one evidence-expanding post-Final request, then complete exactly one accepted C5 rerun through the next legally entered Final and its current-lineage report. You own the accepted interpretation, replacement and withdrawal semantics, revision, topic projection, current task briefs, coverage, synthesis, HITL2 decision, composition handoff, and report. Use only production routes and real actor/tool evidence; do not write playbook verdict checks, native completion, health output, cleanup, or any case-717 observer file. Fail honestly if a required authenticated actor, search/fetch tool, or legal operation is unavailable.',
    timeoutMs: 12 * 60 * 1000,
  },
  '712': {
    bundlePrefix: 'dpt_disp_case-712_',
    transcript: 'case-712-transcript.jsonl',
    system: 'You are the independent subject Agent for case 712. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts. Respond to the user\'s current turn, then follow that production surface for subsequent turns in this same session.',
    messages: ['请简要审阅当前研究，只告诉我一个最值得做的下一步。', '资本约束这部分还不够，再补一下；这次请特别比较租赁、购买与推迟决策在现金流压力下的差异。'],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Complete the minimum work owned by the current phase. After its Gate and immediate legal handoff, stop before executing the newly loaded phase.',
  },
  '713-readiness': {
    bundlePrefix: 'dpt_disp_case-713_',
    transcript: 'case-713-readiness-transcript.jsonl',
    system: 'You are the independent subject Agent for case 713 readiness. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts, then answer the user\'s current turn.',
    messages: ['现在是不是已经全部完成，可以直接拿最终报告了？'],
    tools: 'Glob,Grep,Read',
    boundary: 'Answer only the current user turn from direct bundle facts, then stop.',
  },
  '713-final': {
    bundlePrefix: 'dpt_disp_case-713_',
    transcript: 'case-713-final-transcript.jsonl',
    system: 'You are the independent subject Agent for case 713 Final. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts, then answer the user\'s current turn.',
    messages: ['最终报告文件现在已经生成了吗？'],
    tools: 'Glob,Grep,Read',
    boundary: 'Answer only the current user turn from direct bundle facts, then stop.',
  },
  '901': {
    bundlePrefix: 'dpt_disp_case-901_',
    transcript: 'case-901-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 901, distinct from the Interactive Playbook Agent and the human judge. Work only in the exact bundle path provided by the runner and execute the injected current HITL1 production surface.',
    messages: ['用户原始输入是“帮我研究一下 AI 安全”。按当前 phase-hitl1 Topic Rewrite contract 独立完成 purpose、research questions、scope 和 3-5 个 seed topics，写入 rb_plan.md；选择匹配的 research profile 和 root must-answer set；做一次真实、bounded 的 search/fetch capability probe并诚实记录；应用 research style，运行真实 hitl1-recorded Gate并完成其 immediate legal handoff，然后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Do not write playbook verdict checks, human judgment, native completion, health output, or cleanup. Use one bounded search and at most one fetch; capability-probe bytes are not research evidence.',
  },
  '951': {
    bundlePrefix: 'dpt_disp_case-951_',
    transcript: 'case-951-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 951, distinct from the Playbook Agent and the later AI judge. Work only in the exact bundle path provided by the runner and execute the injected current HITL1 production surface.',
    messages: ['用户原始输入是“帮我研究一下 AI 安全”。按当前 phase-hitl1 Topic Rewrite contract 独立完成 purpose、research questions、scope 和 3-5 个 seed topics，写入 rb_plan.md；选择匹配的 research profile 和 root must-answer set；做一次真实、bounded 的 search/fetch capability probe并诚实记录；应用 research style，运行真实 hitl1-recorded Gate并完成其 immediate legal handoff，然后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Do not write playbook verdict checks, AI judgment, native completion, health output, or cleanup. Use one bounded search and at most one fetch; capability-probe bytes are not research evidence.',
  },
  '951-judge': {
    bundlePrefix: 'dpt_disp_case-951_',
    transcript: 'case-951-judge-transcript.jsonl',
    system: 'You are the independent AI reviewer for case 951. You did not produce the topic rewrite. Review only the retained original request, Subject prompt/transcript/result, rb_plan.md, rb_profile.yaml, and structural Gate facts in the exact bundle path.',
    messages: ['审查独立 Subject Agent 对“帮我研究一下 AI 安全”的 rewrite：忠实性、问题覆盖、不确定性、3-5个 seed topic 的相关性/独立可研究性/非重复性、profile 匹配、真实 bounded capability probe 与 evidence 隔离、结构 Gate。把真实判断写入 bundle 根的 case-951-judge-record.json，严格 JSON 字段为 schema_version="agent-experiment-judge/v1"、source="ai-judge"、case="case-951-heavy-topic-rewrite-ai-judge"、paired_case="case-901-heavy-topic-rewrite-agent"、verdict="pass"或"fail"、criteria（非空对象）、rationale（非空字符串）。不要修改 Subject 输出。'],
    tools: 'Glob,Grep,Read,Write',
    boundary: 'Write only case-951-judge-record.json. Do not alter runtime state, trace, Subject evidence, native completion, health output, or cleanup. This AI judgment remains distinct from real-human evidence.',
  },
  '136': {
    bundlePrefix: 'dpt_disp_case-136_',
    transcript: 'case-136-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 136, distinct from the Playbook Agent and the later AI judge. Work only in the exact bundle path provided by the runner. You own the post-setup HITL2 interaction and the one terminal Final report for this bundle.',
    messages: [
      'Read case-136-scenario.json for the current user delivery request. Treat initial_user_message as the user\'s current HITL2 message. Read the verified bundle state and present one complete reader-facing composition recommendation. Create the required decision brief and pending HITL2 state, but do not record a delivery decision, enter Readiness, or create a Final report in this turn. When the scenario says a material clarification is required, ask only the smallest recommendation-bearing frontier of at most three independent questions.',
      'The runner supplies the current user\'s natural-language resolution after the first bounded turn.',
      'The runner supplies the legal Readiness continuation after the accepted HITL2 handoff.',
      'The runner supplies the legal Final continuation after the Readiness handoff.',
    ],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Use no Task/Sub-agent tool and do not read another case-136 bundle or report. Do not write playbook verdict checks, native completion, health output, cleanup, or a second primary report. Preserve the current accepted profile as the composition owner, use only the existing Gate/entry/status commands, and persist the one Final Markdown report through persist-final-report.',
    afterTurn: observeCase136Boundary,
    timeoutMs: 12 * 60 * 1000,
  },
  '137': {
    bundlePrefix: 'dpt_disp_case-137_',
    transcript: 'case-137-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 137, distinct from the Playbook Agent. Work only in the exact legally entered Final bundle provided by the runner. You own one bounded Final composition and no upstream decision or workflow transition.',
    messages: ['Execute the injected current Final Phase guidance against this bundle\'s one root must-answer and one submitted-backed finding. Write one concise Chinese primary Markdown report of at most 1,600 UTF-8 bytes. It must contain exactly one `## Evidence Map` table row with the columns `Finding ID`, `Declared Key Finding`, and `Submitted Backing`, linking only to the fixture\'s submitted evidence. Persist it through `persist-final-report`, save the complete JSON response as `case-137-final-persistence.json`, then give a direct delivery summary without a question. Do not create a second report, a Gate, a transition, a Task/Sub-agent, network request, or any output outside this bundle.'],
    tools: 'Bash,Glob,Grep,Read,Write',
    boundary: 'Use exactly one Final-only turn. Do not write playbook verdict checks, native completion, health output, cleanup, or a second primary report. Do not read framework source or another bundle. Preserve the accepted profile as the composition owner and use only the existing persist-final-report path.',
    afterTurn: observeCase137Boundary,
    timeoutMs: 30_000,
  },
  '138': {
    bundlePrefix: 'dpt_disp_case-138_',
    transcript: 'case-138-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 138, distinct from the Playbook Agent. Work only in the exact legally entered Final bundle supplied by the runner. Deliver first, then make presentation-only revisions on the same Final node, and use C5 only for the final explicit evidence-expansion turn.',
    messages: [
      'This is the first Final entry and there is no report yet. Read case-138-final-backing.json and the injected Final guidance. Immediately write a compact Chinese Final report with exactly one Evidence Map row using that supplied submitted backing, persist it through publish-final-report, save the complete JSON as case-138-publish-0.json, then give a direct delivery response that invites feedback. Do not create a Gate, transition, or network request.',
      '用户反馈：请只调整现有内容的结构和表达，使读者更快看到结论、证据边界和限制；不要补充新来源或改变结论。仍在同一 Final 节点，创建且只创建一个未标记的 presentation revision，通过 publish-final-report 持久化，保存完整 JSON 为 case-138-publish-1.json，然后给出直接回复。',
      '用户反馈：请为技术读者重新组织同一批已验证证据，突出机制和限制；不要搜索或扩展证据。仍在同一 Final 节点，创建且只创建一个 feature 为 technical_deep_dive 的 presentation revision，通过 publish-final-report 持久化，保存完整 JSON 为 case-138-publish-2.json，然后给出直接回复。',
      '用户反馈：这版可以了，不需要再修改。不要发布文件、不要写 runtime state、不要创建 Gate 或 transition；只做简短确认回复。',
      '用户现在明确要求加入一个新的来源并据此重新评估结论。这是证据扩展，不是 presentation feedback。不要发布任何 Final report。先运行 post-final recovery inspect，从结果中构造并保留严格 JSON 请求，随后只运行一次 apply，保存 inspect/apply 完整 JSON 为 case-138-c5-inspect.json 和 case-138-c5-apply.json。不要完成 rerun、不要进入另一个 phase、不要创建 Final transition。',
    ],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Use exactly five supplied turns in one session, no network research, and a hard 120-second total runtime. Do not write playbook verdict checks, native completion, health output, cleanup, or arbitrary Final targets. Persist primary reports only with publish-final-report. The fourth turn must not mutate runtime facts; the fifth is the sole explicit evidence-expansion request and may only accept existing C5.',
    afterTurn: observeCase138Boundary,
    timeoutMs: 120_000,
  },
  '136-judge': {
    bundlePrefix: 'dpt_disp_case-136_',
    transcript: 'case-136-judge-transcript.jsonl',
    system: 'You are the independent AI reviewer for case 136. You did not produce any HITL2 handoff or report. Review only the judge input and retained Subject/runtime surfaces named there. You may read the four explicitly declared report paths to compare them, but you may not change any report or runtime state.',
    messages: ['Read case-136-judge-input.json. Independently judge the four retained Subject executions for complete reader-facing HITL2 recommendation, clear natural-language resolution without blanket reconfirmation, the custom scenario\'s bounded clarification, materially distinct view-aware report organization, stable verified meaning/confidence/limitations, and terminal discipline. Write only case-136-judge-record.json as strict JSON with schema_version="agent-experiment-judge/v1", source="ai-judge", case="case-136-heavy-final-composition", verdict="pass" or "fail", criteria containing exactly hitl2_recommendation, natural_language_resolution, bounded_clarification, view_difference, verified_meaning_stability, and terminal_discipline, where each value has verdict="pass" or "fail" and non-empty rationale, plus non-empty rationale.'],
    tools: 'Glob,Grep,Read,Write',
    boundary: 'Write only case-136-judge-record.json. Do not alter report bytes, profile, status, trace, Subject evidence, native completion, health output, or cleanup. This AI judgment is experiment-only and does not become a production Final verdict.',
    timeoutMs: 12 * 60 * 1000,
  },
};

function usage() {
  console.error('Usage: node experiments_env/shared/run-iterative-interaction-subject.mjs <125|154|204|115|164|225|227|232|318|711|712|713-readiness|713-final|714|716|717-round1|717-round2|901|951|951-judge|136|137|138|136-judge> --bundle <path>');
  process.exit(2);
}

function readCase136Scenario(bundle) {
  const scenarioPath = join(bundle, 'case-136-scenario.json');
  const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
  const views = new Set(['executive_brief', 'claim_judgment', 'technical_deep_dive', 'custom']);
  if (scenario?.schema_version !== 'case-136-scenario/v1'
    || typeof scenario?.scenario_id !== 'string'
    || !views.has(scenario?.view)
    || typeof scenario?.initial_user_message !== 'string'
    || !scenario.initial_user_message.trim()
    || typeof scenario?.resolution_message !== 'string'
    || !scenario.resolution_message.trim()
    || typeof scenario?.requires_clarification !== 'boolean') {
    throw new Error('case 136 requires one complete scenario input');
  }
  return scenario;
}

function listedFinalReports(bundle) {
  const finalDir = join(bundle, 'final');
  if (!existsSync(finalDir)) return [];
  return readdirSync(finalDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `final/${entry.name}`)
    .sort();
}

function assertCase136Status(bundle, expected) {
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  for (const [key, value] of Object.entries(expected)) {
    if (status[key] !== value) throw new Error(`case 136 expected status.${key}=${value}, received ${status[key]}`);
  }
  return status;
}

function assertCase136NoFinal(bundle) {
  const reports = listedFinalReports(bundle);
  if (reports.length > 0) throw new Error(`case 136 created a Final report before legal Final composition: ${reports.join(', ')}`);
}

function case136Handoff(profile) {
  return profile?.human_decision_checkpoints?.hitl2?.composition_handoff;
}

function case136FinalResponseHasQuestion(bundle) {
  const transcript = readFileSync(join(bundle, 'case-136-subject-transcript.jsonl'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
  const finalResult = transcript.filter((event) => event.type === 'result').at(-1);
  const text = typeof finalResult?.result === 'string' ? finalResult.result : '';
  return /[?？]/.test(text);
}

function observeCase136Boundary({ bundle, completedTurns }) {
  const scenario = readCase136Scenario(bundle);
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));

  if (completedTurns === 1) {
    assertCase136Status(bundle, {
      current_node: 'phases/phase-hitl2.md',
      current_gate: 'wave2_complete',
      next_gate: 'hitl2_recorded',
    });
    if (profile.human_decision_checkpoints?.hitl2?.status !== 'pending_user' || case136Handoff(profile)) {
      throw new Error('case 136 first Subject turn did not retain a pending, unaccepted HITL2 boundary');
    }
    assertCase136NoFinal(bundle);
    return { message: scenario.resolution_message };
  }

  if (completedTurns === 2) {
    assertCase136Status(bundle, {
      current_node: 'phases/phase-readiness.md',
      current_gate: 'hitl2_recorded',
      next_gate: 'readiness_passed',
    });
    const hitl2 = profile.human_decision_checkpoints?.hitl2;
    if (hitl2?.status !== 'recorded' || hitl2?.user_decision !== 'proceed_to_readiness'
      || hitl2.final_report_view !== scenario.view || !case136Handoff(profile)
      || (scenario.view === 'custom' && !case136Handoff(profile).view_instructions)) {
      throw new Error('case 136 accepted HITL2 projection is incomplete or does not match its scenario');
    }
    assertCase136NoFinal(bundle);
    const surface = loadProductionSurface(bundle);
    if (surface.nodeRef !== 'phases/phase-readiness.md') throw new Error('case 136 did not enter the legal Readiness node');
    return {
      message: [
        'The accepted HITL2 handoff is now durable. Execute the injected current Readiness checkpoint from direct bundle facts. If it passes, consume only its selected target through enter-phase and synchronize the source gate status. Stop after legal Final entry without drafting a report; the runner will then load Final.',
        surface.text,
      ].join('\n\n'),
    };
  }

  if (completedTurns === 3) {
    assertCase136Status(bundle, {
      current_node: 'phases/phase-final.md',
      current_gate: 'readiness_passed',
      next_gate: 'none',
    });
    assertCase136NoFinal(bundle);
    const surface = loadProductionSurface(bundle);
    if (surface.nodeRef !== 'phases/phase-final.md') throw new Error('case 136 did not enter the legal Final node');
    return {
      message: [
        'Execute one view-aware Report Composition Pass using only this bundle\'s accepted profile and verified state. Persist exactly one primary Final Markdown report through persist-final-report, save its complete JSON response as case-136-final-persistence.json, and return a direct delivery summary without a question. Do not create a second report, a Gate, a transition, or a Sub-agent.',
        surface.text,
      ].join('\n\n'),
    };
  }

  if (completedTurns === 4) {
    assertCase136Status(bundle, {
      current_node: 'phases/phase-final.md',
      current_gate: 'readiness_passed',
      next_gate: 'none',
    });
    const reports = listedFinalReports(bundle);
    if (reports.length !== 1) throw new Error(`case 136 requires exactly one primary Final Markdown report, received ${reports.length}`);
    const persistence = JSON.parse(readFileSync(join(bundle, 'case-136-final-persistence.json'), 'utf8'));
    if (persistence.operation !== 'persist-final-report' || persistence.verdict !== 'committed' || persistence.check?.passed !== true) {
      throw new Error('case 136 Final report did not use a committed persist-final-report admission');
    }
    const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
    const finalDeliveryEvent = trace.some((event) => event.event === 'final_delivery');
    const finalGate = trace.some((event) => event.event === 'gate_attempt' && /final/i.test(String(event.gate || '')));
    if (finalDeliveryEvent || finalGate) throw new Error('case 136 introduced a forbidden Final trace or Gate event');
    const observation = {
      schema_version: 'case-136-subject-observation/v1',
      source: 'subject-adapter-observer',
      scenario_id: scenario.scenario_id,
      view: scenario.view,
      completed_turns: completedTurns,
      final_report: reports[0],
      persistence_operation: persistence.operation,
      persistence_verdict: persistence.verdict,
      final_response_has_question: case136FinalResponseHasQuestion(bundle),
      final_gate_attempt_present: finalGate,
      final_delivery_trace_present: finalDeliveryEvent,
    };
    writeFileSync(join(bundle, 'case-136-subject-observation.json'), `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return null;
  }

  throw new Error(`case 136 received an unexpected completed turn count: ${completedTurns}`);
}

function case137EvidenceMapRowCount(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === '## Evidence Map');
  if (headingIndex < 0) return 0;
  const nextHeadingOffset = lines.slice(headingIndex + 1).findIndex((line) => /^##\s+/.test(line));
  const sectionLines = lines.slice(headingIndex + 1, nextHeadingOffset < 0 ? undefined : headingIndex + 1 + nextHeadingOffset);
  const tableLines = sectionLines.filter((line) => /^\s*\|/.test(line));
  return tableLines.slice(2).filter((line) => line.split('|').some((cell) => cell.trim())).length;
}

function case137FinalResponseHasQuestion(bundle) {
  const transcript = readFileSync(join(bundle, 'case-137-subject-transcript.jsonl'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
  const finalResult = transcript.filter((event) => event.type === 'result').at(-1);
  const text = typeof finalResult?.result === 'string' ? finalResult.result : '';
  return /[?？]/.test(text);
}

function case137TranscriptToolNames(bundle) {
  const events = readFileSync(join(bundle, 'case-137-subject-transcript.jsonl'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
  const names = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.type === 'tool_use' && typeof value.name === 'string') names.push(value.name);
    for (const child of Object.values(value)) visit(child);
  }
  visit(events);
  return names;
}

function observeCase137Boundary({ bundle, completedTurns }) {
  if (completedTurns !== 1) throw new Error(`case 137 requires one completed Subject turn, received ${completedTurns}`);

  assertCase136Status(bundle, {
    current_node: 'phases/phase-final.md',
    current_gate: 'readiness_passed',
    next_gate: 'none',
  });
  const reports = listedFinalReports(bundle);
  if (reports.length !== 1) throw new Error(`case 137 requires exactly one primary Final Markdown report, received ${reports.length}`);
  const reportPath = join(bundle, reports[0]);
  const reportBytes = statSync(reportPath).size;
  const evidenceMapRows = case137EvidenceMapRowCount(readFileSync(reportPath, 'utf8'));
  if (reportBytes > 1600) throw new Error(`case 137 Final report exceeds 1600 UTF-8 bytes: ${reportBytes}`);
  if (evidenceMapRows !== 1) throw new Error(`case 137 Final report requires one Evidence Map row, received ${evidenceMapRows}`);
  const persistence = JSON.parse(readFileSync(join(bundle, 'case-137-final-persistence.json'), 'utf8'));
  if (persistence.operation !== 'persist-final-report' || persistence.verdict !== 'committed' || persistence.check?.passed !== true) {
    throw new Error('case 137 Final report did not use a committed persist-final-report admission');
  }
  const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const finalDeliveryEvent = trace.some((event) => event.event === 'final_delivery');
  const finalGate = trace.some((event) => event.event === 'gate_attempt' && /final/i.test(String(event.gate || '')));
  if (finalDeliveryEvent || finalGate) throw new Error('case 137 introduced a forbidden Final trace or Gate event');
  const toolNames = case137TranscriptToolNames(bundle);
  const prohibitedTool = toolNames.find((name) => ['Task', 'WebFetch', 'WebSearch'].includes(name)) || null;
  if (prohibitedTool) throw new Error(`case 137 used a prohibited tool: ${prohibitedTool}`);
  const observation = {
    schema_version: 'case-137-subject-observation/v1',
    source: 'subject-adapter-observer',
    completed_turns: completedTurns,
    final_report: reports[0],
    report_bytes: reportBytes,
    evidence_map_rows: evidenceMapRows,
    persistence_operation: persistence.operation,
    persistence_verdict: persistence.verdict,
    final_response_has_question: case137FinalResponseHasQuestion(bundle),
    final_gate_attempt_present: finalGate,
    final_delivery_trace_present: finalDeliveryEvent,
    subject_tool_names: toolNames,
    prohibited_tool_present: prohibitedTool,
  };
  writeFileSync(join(bundle, 'case-137-subject-observation.json'), `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return null;
}

function case138FinalFacts(bundle) {
  const inventory = readFinalReportInventory(bundle);
  if (!inventory.primary_series.valid) {
    const blocker = inventory.primary_series.blockers[0];
    throw new Error(`case 138 primary inventory is invalid: ${blocker?.code || 'unknown'}`);
  }
  const primaryTargets = inventory.primary_series.primary_entries.map((entry) => entry.target);
  const reportSha256 = Object.fromEntries(primaryTargets.map((target) => [
    target,
    createHash('sha256').update(readFileSync(join(bundle, target))).digest('hex'),
  ]));
  const statusRaw = readFileSync(join(bundle, 'rb_status.json'));
  const profileRaw = readFileSync(join(bundle, 'rb_profile.yaml'));
  const traceRaw = readFileSync(join(bundle, 'rb_trace.jsonl'));
  const status = JSON.parse(statusRaw.toString('utf8'));
  return {
    inventory_sha256: inventory.sha256,
    primary_targets: primaryTargets,
    report_sha256: reportSha256,
    status: {
      current_node: status.current_node,
      current_gate: status.current_gate,
      next_gate: status.next_gate,
    },
    status_sha256: createHash('sha256').update(statusRaw).digest('hex'),
    profile_sha256: createHash('sha256').update(profileRaw).digest('hex'),
    trace_sha256: createHash('sha256').update(traceRaw).digest('hex'),
    trace_line_count: traceRaw.toString('utf8').split(/\r?\n/).filter(Boolean).length,
  };
}

function readCase138Publication(bundle, name, target) {
  const result = JSON.parse(readFileSync(join(bundle, name), 'utf8'));
  if (result.operation !== 'publish-final-report' || result.verdict !== 'committed'
    || result.target !== target || result.check?.passed !== true) {
    throw new Error(`case 138 publication ${name} is not the expected committed ${target} result`);
  }
}

function assertCase138FinalWindow(facts) {
  if (facts.status.current_node !== 'phases/phase-final.md'
    || facts.status.current_gate !== 'readiness_passed'
    || facts.status.next_gate !== 'none') {
    throw new Error(`case 138 left the Final status window: ${JSON.stringify(facts.status)}`);
  }
}

function writeCase138Snapshot(bundle, name, facts) {
  writeFileSync(join(bundle, name), `${JSON.stringify({
    schema_version: 'case-138-final-snapshot/v1',
    source: 'subject-adapter-observer',
    ...facts,
  }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

function sameCase138FrozenFacts(before, after) {
  return before.inventory_sha256 === after.inventory_sha256
    && before.status_sha256 === after.status_sha256
    && before.profile_sha256 === after.profile_sha256
    && before.trace_sha256 === after.trace_sha256;
}

function observeCase138Boundary({ bundle, completedTurns }) {
  const facts = case138FinalFacts(bundle);
  assertCase138FinalWindow(facts);

  if (completedTurns === 1) {
    assert.deepEqual(facts.primary_targets, ['final/final.md']);
    readCase138Publication(bundle, 'case-138-publish-0.json', 'final/final.md');
    writeCase138Snapshot(bundle, 'case-138-turn1-snapshot.json', facts);
    return null;
  }

  if (completedTurns === 2) {
    const turn1 = JSON.parse(readFileSync(join(bundle, 'case-138-turn1-snapshot.json'), 'utf8'));
    assert.deepEqual(facts.primary_targets, ['final/final.md', 'final/final_v1.md']);
    if (facts.report_sha256['final/final.md'] !== turn1.report_sha256['final/final.md']) {
      throw new Error('case 138 changed the committed base report during the first revision');
    }
    readCase138Publication(bundle, 'case-138-publish-1.json', 'final/final_v1.md');
    writeCase138Snapshot(bundle, 'case-138-turn2-snapshot.json', facts);
    return null;
  }

  if (completedTurns === 3) {
    const turn2 = JSON.parse(readFileSync(join(bundle, 'case-138-turn2-snapshot.json'), 'utf8'));
    assert.deepEqual(facts.primary_targets, ['final/final.md', 'final/final_v1.md', 'final/final_technical_deep_dive_v2.md']);
    for (const target of ['final/final.md', 'final/final_v1.md']) {
      if (facts.report_sha256[target] !== turn2.report_sha256[target]) {
        throw new Error(`case 138 changed committed bytes for ${target} during the labelled revision`);
      }
    }
    readCase138Publication(bundle, 'case-138-publish-2.json', 'final/final_technical_deep_dive_v2.md');
    writeCase138Snapshot(bundle, 'case-138-turn3-snapshot.json', facts);
    return null;
  }

  if (completedTurns === 4) {
    const turn3 = JSON.parse(readFileSync(join(bundle, 'case-138-turn3-snapshot.json'), 'utf8'));
    if (!sameCase138FrozenFacts(turn3, facts)) {
      throw new Error('case 138 satisfaction turn changed Final inventory, status, profile, or trace before the frozen snapshot');
    }
    writeCase138Snapshot(bundle, 'case-138-turn4-freeze.json', facts);
    return null;
  }

  if (completedTurns === 5) {
    const frozen = JSON.parse(readFileSync(join(bundle, 'case-138-turn4-freeze.json'), 'utf8'));
    if (facts.inventory_sha256 !== frozen.inventory_sha256 || JSON.stringify(facts.report_sha256) !== JSON.stringify(frozen.report_sha256)) {
      throw new Error('case 138 evidence-expansion turn published or changed a Final report');
    }
    const applied = JSON.parse(readFileSync(join(bundle, 'case-138-c5-apply.json'), 'utf8'));
    if (applied.operation !== 'apply' || applied.verdict !== 'committed' || applied.stage !== 'pre_entry') {
      throw new Error('case 138 evidence-expansion turn did not accept exactly one C5 operation');
    }
    const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
    const postFinal = trace.filter((event) => event.event === 'post_final_reentry');
    const rerunGate = trace.slice(frozen.trace_line_count).some((event) => event.event === 'gate_attempt' && event.gate === 'rerun-ready');
    if (postFinal.length !== 1 || rerunGate) {
      throw new Error('case 138 evidence-expansion turn completed rerun work or did not retain one C5 event');
    }
    writeFileSync(join(bundle, 'case-138-subject-observation.json'), `${JSON.stringify({
      schema_version: 'case-138-subject-observation/v1',
      source: 'subject-adapter-observer',
      completed_turns: completedTurns,
      first_delivery_before_feedback: true,
      primary_targets: facts.primary_targets,
      immutable_prior_bytes: true,
      turn4_frozen_without_runtime_mutation: true,
      turn5_c5_accepted_without_report_or_completed_rerun: true,
      turn4_snapshot: 'case-138-turn4-freeze.json',
      final_inventory_sha256: facts.inventory_sha256,
      c5_operation_id: applied.operation_id,
    }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return null;
  }

  throw new Error(`case 138 received an unexpected completed turn count: ${completedTurns}`);
}

function observeCase318CrashWindow({ bundle, completedTurns }) {
  if (completedTurns !== 1) return;
  const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  const transcript = readFileSync(join(bundle, SUBJECTS['318'].transcript), 'utf8');
  const section = seed.match(/##\s*本轮重跑方向[\s\S]*?(?=\n##\s+|$)/)?.[0] || '';
  const directionCount = Number(section.match(/rerun_count\*{0,2}\s*:\s*(\d+)/i)?.[1]);
  const observation = {
    direction_sha256: createHash('sha256').update(section).digest('hex'),
    direction_count: directionCount,
    profile_count: profile.human_decision_checkpoints?.hitl2?.rerun_count,
    action_is_supplement: /action\*{0,2}\s*:\s*supplement\b/i.test(section),
    requested_dimensions_present: /cost/i.test(section) && /failure[- ]?mode/i.test(section),
    subject_apply_observed: /operate-topic-state\.mjs\s+apply/.test(transcript),
    current_node: status.current_node,
    current_gate: status.current_gate,
    next_gate: status.next_gate,
  };
  const valid = observation.direction_count === 1
    && observation.profile_count === 0
    && observation.action_is_supplement
    && observation.requested_dimensions_present
    && observation.subject_apply_observed
    && observation.current_node === 'phases/phase-rerun.md'
    && observation.current_gate === 'hitl2_recorded'
    && observation.next_gate === 'rerun_ready';
  if (!valid) throw new Error(`case-318 first Subject turn did not establish the required crash window: ${JSON.stringify(observation)}`);
  writeFileSync(join(bundle, 'case-318-crash-window.json'), `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

function reloadCase154Wave2Surface({ bundle, completedTurns }) {
  if (completedTurns !== 1) return null;
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  if (status.current_node !== 'phases/phase-wave2.md' || status.current_gate !== 'wave1_complete') {
    throw new Error(`case-154 first Subject turn did not establish legal Wave2 entry: ${JSON.stringify(status)}`);
  }
  const surface = loadProductionSurface(bundle);
  if (surface.nodeRef !== 'phases/phase-wave2.md') {
    throw new Error(`case-154 reloaded an unavailable target surface: ${surface.nodeRef}`);
  }
  const snapshot = {
    schema_version: 'case-154-wave2-surface/v1',
    source: 'subject-adapter-read-only-loader',
    loaded_after_turn: completedTurns,
    node_ref: surface.nodeRef,
    sha256: createHash('sha256').update(surface.text).digest('hex'),
    surface: surface.text,
  };
  writeFileSync(join(bundle, 'case-154-wave2-surface.json'), `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return {
    message: [
      'The first turn established the legal Wave2 entry. The runner has now read the current bundle status and reloaded this exact production control surface; it does not choose a phase or change lifecycle truth.',
      surface.text,
      'Now perform exactly one bounded named finding W2F-154 with gap_status: needs_search. Preserve decision explore_search or exploit_search and route the new evidence only through one claimed and submitted wave2_targeted_evidence work unit performed by a real dpt-topic-scout child. Do not call WebSearch or WebFetch yourself. Retain a path-only case-154-targeted-evidence.json binding to the submitted work, result, receipt, outputs, cache trails, and source URLs. Stop after the submit and required Wave2 artifacts are persisted.',
    ].join('\n\n'),
  };
}

function observeCase164Boundary({ bundle, completedTurns }) {
  if (![1, 2].includes(completedTurns)) return;
  const evidencePath = join(bundle, 'case-164-output-hashes.json');
  const sha256File = (ref) => createHash('sha256').update(readFileSync(resolve(bundle, ref))).digest('hex');

  if (completedTurns === 1) {
    const evidence = JSON.parse(readFileSync(join(bundle, 'case-164-first-child-evidence.json'), 'utf8'));
    const dry = JSON.parse(readFileSync(join(bundle, 'case-164-turn1-dry-submit.json'), 'utf8'));
    const receipts = readFileSync(resolve(bundle, evidence.runtime_receipt_ref), 'utf8')
      .split(/\r?\n/).filter(Boolean).map(JSON.parse);
    const semantic = dry.violations?.some((item) => item.repair_scope === 'semantic_content');
    if (dry.recommended_action !== 'fail_and_replace' || !dry.primary_root_code || !semantic
      || !receipts.some((item) => item.event === 'work_done')
      || !Array.isArray(evidence.required_output_refs) || evidence.required_output_refs.length !== 2) {
      throw new Error('case-164 turn 1 lacks the required native semantic rejection/work_done boundary');
    }
    const beforeTurn2 = Object.fromEntries(evidence.required_output_refs.map((ref) => [ref, sha256File(ref)]));
    writeFileSync(evidencePath, `${JSON.stringify({
      first_work_id: evidence.work_id,
      first_queue_item_id: evidence.queue_item_id,
      primary_root_code: dry.primary_root_code,
      before_turn2: beforeTurn2,
    }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return;
  }

  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const afterTurn2 = Object.fromEntries(Object.keys(evidence.before_turn2).map((ref) => [ref, sha256File(ref)]));
  if (JSON.stringify(afterTurn2) !== JSON.stringify(evidence.before_turn2)) {
    throw new Error('case-164 turn 2 changed first-child canonical output bytes');
  }
  const claim = JSON.parse(readFileSync(join(bundle, 'case-164-turn2-claim.json'), 'utf8'));
  const replacement = claim.prompt_refs?.[0];
  if (claim.claimed_work_ids?.length !== 1 || !replacement?.work_id || !replacement?.queue_item_id
    || replacement.work_id !== claim.claimed_work_ids[0]
    || replacement.work_id === evidence.first_work_id
    || replacement.queue_item_id === evidence.first_queue_item_id) {
    throw new Error('case-164 turn 2 did not retain a fresh replacement identity');
  }
  writeFileSync(evidencePath, `${JSON.stringify({ ...evidence, after_turn2: afterTurn2 }, null, 2)}\n`);
}

function parseEnv(path) {
  const values = Object.create(null);
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function ensureUniqueSettings() {
  if (existsSync(SETTINGS_PATH)) {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    if (settings?.env?.ENABLE_TOOL_SEARCH !== 'true') {
      throw new Error(`existing ${SETTINGS_PATH} does not enable tool search`);
    }
    chmodSync(SETTINGS_PATH, 0o600);
    return 'reused';
  }

  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) throw new Error(`missing repo-root .env required to create ${SETTINGS_PATH}`);
  const values = parseEnv(envPath);
  for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_ANTHROPIC_BASE_URL', 'DEEPSEEK_MODEL']) {
    if (!values[key]) throw new Error(`missing ${key} in repo-root .env`);
  }

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true, mode: 0o700 });
  const model = values.DEEPSEEK_MODEL;
  const settings = {
    env: {
      ANTHROPIC_AUTH_TOKEN: values.DEEPSEEK_API_KEY,
      ANTHROPIC_BASE_URL: values.DEEPSEEK_ANTHROPIC_BASE_URL,
      API_TIMEOUT_MS: values.DEEPSEEK_API_TIMEOUT_MS || '3000000',
      ANTHROPIC_MODEL: 'opus',
      ANTHROPIC_DEFAULT_OPUS_MODEL: values.DEEPSEEK_OPUS_MODEL || model,
      ANTHROPIC_DEFAULT_SONNET_MODEL: values.DEEPSEEK_SONNET_MODEL || model,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: values.DEEPSEEK_HAIKU_MODEL || model,
      CLAUDE_CODE_SUBAGENT_MODEL: values.DEEPSEEK_SUBAGENT_MODEL || model,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ENABLE_TOOL_SEARCH: 'true',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000',
    },
  };
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return 'created';
}

function writeUserMarker(fd, content) {
  writeSync(fd, `${JSON.stringify({ role: 'user', event: 'message', content })}\n`);
}

function streamInput(content) {
  return `${JSON.stringify({ type: 'user', message: { role: 'user', content } })}\n`;
}

function loadProductionSurface(bundle) {
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  const nodeRef = status.current_node;
  if (typeof nodeRef !== 'string' || !nodeRef) {
    throw new Error('bundle rb_status.json has no current_node');
  }

  const runtime = createWorkflowRuntime('iterative-interaction-subject', NODES_DIR);
  const loaded = assessNode(nodeRef, createState(), runtime);
  if (loaded.status !== 'loaded') {
    throw new Error(`failed to load current production node ${nodeRef}: ${loaded.error || 'unknown error'}`);
  }

  const entry = runtime.contentCache.get(nodeRef);
  const suggested = entry?.frontmatter?.suggested_context;
  if (suggested !== undefined && !Array.isArray(suggested)) {
    throw new Error(`current production node ${nodeRef} has invalid suggested_context`);
  }

  const orderedRefs = [];
  const seen = new Set();
  const appendPlan = (plan) => {
    for (const fileRef of plan || []) {
      if (fileRef === nodeRef || seen.has(fileRef)) continue;
      seen.add(fileRef);
      orderedRefs.push(fileRef);
    }
  };

  appendPlan(loaded.plan);
  for (const contextRef of (suggested || []).filter((fileRef) => fileRef.startsWith('brief/'))) {
    const context = assessNode(contextRef, createState(), runtime);
    if (context.status !== 'loaded') {
      throw new Error(`failed to load suggested production context ${contextRef}: ${context.error || 'unknown error'}`);
    }
    appendPlan(context.plan);
  }
  orderedRefs.push(nodeRef);

  const sections = orderedRefs.map((fileRef) => {
    const cached = runtime.contentCache.get(fileRef);
    if (!cached) throw new Error(`production surface cache is missing ${fileRef}`);
    return `<!-- DPT_LOADED_FILE_START ${fileRef} -->\n\n${cached.md.trimEnd()}\n\n<!-- DPT_LOADED_FILE_END ${fileRef} -->`;
  });

  return {
    nodeRef,
    text: [
      `<!-- DPT_SUBJECT_PRODUCTION_SURFACE_START node_ref=${nodeRef} -->`,
      ...sections,
      '<!-- DPT_SUBJECT_PRODUCTION_SURFACE_END -->',
    ].join('\n\n'),
  };
}

function loadMinimalSeedAuthoringSurface(bundle) {
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const uid = plan.match(/^\s*-\s+topic_uid:\s*(\S+)\s*$/m)?.[1];
  if (status.current_node !== 'phases/phase-seed-topics.md' || !uid) {
    throw new Error('case 204 requires a legal Seed Topics node and one canonical topic UID');
  }

  const resultPath = join(bundle, 'case-204-queue-result.json');
  const inputPath = join(bundle, 'case-204-enrich-seed.json');
  const seedPath = join(bundle, 'seed_topics', '01_canonical-seed.md');
  return {
    nodeRef: status.current_node,
    text: [
      '<!-- DPT_SUBJECT_MINIMAL_RUNBOOK case=204 -->',
      'This is a legal Seed Topics lifecycle window with exactly one queued main-agent card. Use these production commands in order.',
      `1. Claim: node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs claim ${bundle} --actor main-agent`,
      `2. Edit only ${seedPath} after its frontmatter. Do not edit its canonical frontmatter fields.`,
      `3. Write ${inputPath} with exactly this shape and non-empty values you choose: {"context":"seed_topics","action":"enrich_seed","topic_uid":"${uid}","enrichment":{"hypothesis":"...","in_scope":"...","out_of_scope":"...","search_guardrails":{"required_terms":["..."],"forbidden_broadening":["..."]},"evidence_route":{"preferred_sources":["..."],"noise_to_avoid":["..."]}}}.`,
      `4. Apply: node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle ${bundle} --input ${inputPath}`,
      `5. Write ${resultPath} with queue_item_id "case-204-seed", receipt "file:seed_topics/01_canonical-seed.md", summary, and writes ["seed_topics/01_canonical-seed.md"]; then run node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs complete ${bundle} --result ${resultPath}.`,
      `6. Gate: node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle ${bundle} --current-node phases/phase-seed-topics.md`,
      'If any command fails, stop and report its exact output. Do not hand-edit queue, trace, status, or canonical YAML.',
      '<!-- DPT_SUBJECT_MINIMAL_RUNBOOK_END -->',
    ].join('\n\n'),
  };
}

function loadIsolatedHitl1CapabilityProbeSurface() {
  if (!existsSync(HITL1_CAPABILITY_PROBE_GUIDE_PATH)) {
    throw new Error(`case 115 probe guide is missing: ${HITL1_CAPABILITY_PROBE_GUIDE_PATH}`);
  }
  return {
    nodeRef: 'shared/shared-hitl1-capability-probe.md',
    text: [
      '<!-- DPT_ISOLATED_HITL1_CAPABILITY_PROBE_GUIDE_START -->',
      readFileSync(HITL1_CAPABILITY_PROBE_GUIDE_PATH, 'utf8').trimEnd(),
      '<!-- DPT_ISOLATED_HITL1_CAPABILITY_PROBE_GUIDE_END -->',
    ].join('\n\n'),
  };
}

const [subjectId, ...args] = process.argv.slice(2);
const bundleIndex = args.indexOf('--bundle');
const subject = SUBJECTS[subjectId];
if (!subject || bundleIndex < 0 || !args[bundleIndex + 1] || args.length !== 2) usage();

const bundle = resolve(args[bundleIndex + 1]);
if (!existsSync(bundle) || !statSync(bundle).isDirectory() || !basename(bundle).startsWith(subject.bundlePrefix)) {
  throw new Error(`bundle does not match ${subjectId}: ${bundle}`);
}
if (!existsSync(LAUNCHER)) throw new Error(`launcher is missing: ${LAUNCHER}`);

const settingsStatus = ensureUniqueSettings();
const transcriptPath = join(bundle, subject.transcript);
const productionSurface = subject.surface === 'isolated_hitl1_capability_probe'
  ? loadIsolatedHitl1CapabilityProbeSurface()
  : subject.surface === 'minimal_seed_authoring'
  ? loadMinimalSeedAuthoringSurface(bundle)
  : loadProductionSurface(bundle);
const isIsolatedProbe = subject.surface === 'isolated_hitl1_capability_probe';
const systemPrompt = [
  subject.system,
  isIsolatedProbe
    ? 'The runner retains prompt, transcript, and final result outside your authority. It does not provide a bundle path or any filesystem obligation.'
    : `The exact bundle path provided by the runner is: ${bundle}`,
  isIsolatedProbe
    ? 'The adapter contract and probe guide below are your complete Agent-facing control surface. Do not inspect framework source, filesystem state, or unrelated guidance.'
    : 'The runner loaded the current production required closure plus the interaction brief below, read-only from the framework. Use it as the current Agent-facing control surface and inspect only direct bundle facts needed for the current turn.',
  `This is a bounded smoke proof. ${subject.boundary} Do not inspect framework source or unrelated repository guidance outside the injected surface.`,
  subjectId === '115'
    ? `<!-- DPT_SELECTED_RESEARCH_ACCESS_ADAPTER_START -->\n\n${readFileSync(SELECTED_RESEARCH_ACCESS_ADAPTER_PATH, 'utf8').trimEnd()}\n\n<!-- DPT_SELECTED_RESEARCH_ACCESS_ADAPTER_END -->`
    : null,
  productionSurface.text,
].filter(Boolean).join('\n\n');
const evidenceStem = `case-${subjectId}`;
const promptPath = join(bundle, `${evidenceStem}-subject-prompt.json`);
const resultPath = join(bundle, `${evidenceStem}-subject-result.json`);
const sessionId = randomUUID();
const invocation = buildIterativeInteractionSubjectInvocation({
  subjectId,
  launcherPath: LAUNCHER,
  settingsPath: SETTINGS_PATH,
  tools: subject.tools,
  sessionId,
  systemPrompt,
});
writeFileSync(promptPath, `${JSON.stringify({
  subject: subjectId,
  system_prompt: systemPrompt,
  messages: subject.messages,
  tools: subject.tools,
  loaded_node: productionSurface.nodeRef,
  ...(invocation.adapter_invocation ? { adapter_invocation: invocation.adapter_invocation } : {}),
}, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const transcriptFd = openSync(transcriptPath, 'wx', 0o600);
const claudeArgs = [LAUNCHER, ...invocation.claude_args];
const turnMessages = [...subject.messages];

const child = spawn(process.execPath, claudeArgs, {
  cwd: REPO_ROOT,
  stdio: ['pipe', 'pipe', 'pipe'],
  detached: true,
});

let parseBuffer = '';
let turnIndex = 0;
let completedTurns = 0;
let failedResult = null;
let stderr = '';
let timedOut = false;
let closed = false;
let forcedAfterResult = false;
let finalResultTimer = null;
const resultEvents = [];

function signalChild(signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function sendTurn(index) {
  writeUserMarker(transcriptFd, turnMessages[index]);
  child.stdin.write(streamInput(turnMessages[index]));
}

function handleLine(line) {
  if (!line.trim()) return;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }
  if (event.type !== 'result') return;
  resultEvents.push(event);
  completedTurns += 1;
  if (event.is_error || event.subtype !== 'success') {
    failedResult = event;
    child.stdin.end();
    return;
  }
  if (subject.afterTurn) {
    try {
      const followup = subject.afterTurn({ bundle, completedTurns });
      if (followup?.message) turnMessages[turnIndex + 1] = followup.message;
    } catch (error) {
      failedResult = { type: 'adapter_observer_error', message: error.message };
      stderr += `${error.message}\n`;
      child.stdin.end();
      return;
    }
  }
  turnIndex += 1;
  if (turnIndex < turnMessages.length) {
    sendTurn(turnIndex);
  } else {
    child.stdin.end();
    finalResultTimer = setTimeout(() => {
      if (!closed) {
        forcedAfterResult = true;
        signalChild('SIGTERM');
      }
    }, 1500);
    finalResultTimer.unref();
  }
}

child.stdout.on('data', (chunk) => {
  writeSync(transcriptFd, chunk);
  parseBuffer += chunk.toString('utf8');
  while (true) {
    const newline = parseBuffer.indexOf('\n');
    if (newline < 0) break;
    const line = parseBuffer.slice(0, newline);
    parseBuffer = parseBuffer.slice(newline + 1);
    handleLine(line);
  }
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString('utf8');
  stderr += text;
  process.stderr.write(text);
});

const timeout = setTimeout(() => {
  timedOut = true;
  signalChild('SIGTERM');
  setTimeout(() => signalChild('SIGKILL'), 1000).unref();
}, subject.timeoutMs || SUBJECT_TIMEOUT_MS);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => signalChild(signal));
}

child.once('error', (error) => {
  clearTimeout(timeout);
  closeSync(transcriptFd);
  console.error(error.message);
  process.exit(1);
});

child.once('close', (code, signal) => {
  closed = true;
  if (finalResultTimer) clearTimeout(finalResultTimer);
  clearTimeout(timeout);
  if (parseBuffer.trim()) handleLine(parseBuffer);
  closeSync(transcriptFd);
  const ok = !timedOut && !failedResult && completedTurns === turnMessages.length
    && (code === 0 || forcedAfterResult);
  const result = {
    status: ok ? 'completed' : 'failed',
    subject: subjectId,
    bundle,
    prompt: promptPath,
    transcript: transcriptPath,
    result: resultPath,
    settings: SETTINGS_PATH,
    settings_status: settingsStatus,
    loaded_node: productionSurface.nodeRef,
    session_id: sessionId,
    completed_turns: completedTurns,
    exit_code: code,
    signal,
    timed_out: timedOut,
    stderr_tail: ok ? undefined : stderr.slice(-1000),
    result_events: resultEvents,
  };
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  process.exit(ok ? 0 : 1);
});

sendTurn(0);
