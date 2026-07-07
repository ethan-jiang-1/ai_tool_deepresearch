// consistency-validator.mjs — Workflow package consistency validation
// @impl WNC-007
// Canonical engine location: DPT_FRAMEWORK/engine/consistency-validator.mjs
//
// ## Role
// Validates the workflow package as a whole: manifest, node frontmatter,
// gate definitions, transition tables, and loader runtime cache / dependency
// plan. Returns a structured report of mismatches.
//
// ## Exports
//   validateWorkflowPackage(opts) → { passed, issues }

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChain } from './transition-chain.mjs';
import { parseFrontmatter } from './workflow-chain.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Validate the workflow package for consistency.
 *
 * @param {object} opts
 * @param {string} [opts.workflowsDir] — path to workflows/ directory (default: DPT_FRAMEWORK/workflows/)
 * @param {string} [opts.gateDefsDir] — path to gate definitions directory (default: DPT_FRAMEWORK/schema/gate_definitions/)
 * @param {string} [opts.transitionsChainPath] — path to transitions.chain.json (optional)
 * @returns {{ passed: boolean, issues: Array<{ class: string, detail: string, file?: string }> }}
 *
 * @impl WNC-007
 */
export function validateWorkflowPackage(opts = {}) {
  const workflowsDir = opts.workflowsDir || join(__dirname, '..', 'workflows');
  const gateDefsDir = opts.gateDefsDir || join(__dirname, '..', 'schema', 'gate_definitions');
  const chainPath = opts.transitionsChainPath || join(workflowsDir, 'transitions.chain.json');

  const issues = [];

  // ── Load manifest ──────────────────────────────────────────────────
  const manifestPath = join(workflowsDir, 'manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    issues.push({ class: 'manifest_unreadable', detail: `Cannot read manifest.json: ${err.message}`, file: manifestPath });
    return { passed: false, issues };
  }

  const nodesDir = join(workflowsDir, 'nodes');
  const frontmatterCache = new Map();

  function readNodeFrontmatter(nodePath) {
    if (frontmatterCache.has(nodePath)) {
      return frontmatterCache.get(nodePath);
    }

    const md = readFileSync(nodePath, 'utf-8');
    let fm = null;
    try {
      fm = parseFrontmatter(md);
    } catch (err) {
      issues.push({
        class: 'frontmatter_invalid',
        detail: `Cannot parse node frontmatter: ${err.message}`,
        file: nodePath,
      });
    }

    frontmatterCache.set(nodePath, fm);
    return fm;
  }

  function readNodeMarkdown(nodePath) {
    try {
      return readFileSync(nodePath, 'utf-8');
    } catch (err) {
      issues.push({
        class: 'node_unreadable',
        detail: `Cannot read node markdown: ${err.message}`,
        file: nodePath,
      });
      return '';
    }
  }

  function findOrderedFields(sectionText, fieldNames) {
    let cursor = -1;
    const missing = [];
    for (const field of fieldNames) {
      const pattern = `**${field}**`;
      const idx = sectionText.indexOf(pattern);
      if (idx === -1) {
        missing.push(field);
        continue;
      }
      if (idx <= cursor) {
        missing.push(`${field} (out of order)`);
      }
      cursor = idx;
    }
    return missing;
  }

  function findOrderedExecutionBriefFields(sectionText) {
    let cursor = -1;
    const checks = [
      { name: 'Objective', pattern: /\*\*Objective\*\*/ },
      { name: 'Start here', pattern: /\*\*Start here\*\*/ },
      { name: 'Path field', pattern: /\*\*[^*\n]*path[^*\n]*\*\*/i },
      { name: 'Completion check', pattern: /\*\*Completion check\*\*/ },
      { name: 'Failure posture', pattern: /\*\*Failure posture\*\*/ },
    ];
    const missing = [];
    for (const check of checks) {
      const match = sectionText.match(check.pattern);
      const idx = match ? match.index : -1;
      if (idx === -1) {
        missing.push(check.name);
        continue;
      }
      if (idx <= cursor) {
        missing.push(`${check.name} (out of order)`);
      }
      cursor = idx;
    }
    return missing;
  }

  function declaresFilesystemWriteCapability(ec) {
    if (!ec || typeof ec !== 'object') return false;
    if (ec.filesystem_write === 'required' || ec.write_capability === 'filesystem_write') return true;
    const writeTools = [
      ...(Array.isArray(ec.required_write_tools) ? ec.required_write_tools : []),
      ...(Array.isArray(ec.write_tools) ? ec.write_tools : []),
    ].map((tool) => String(tool).toLowerCase());
    return writeTools.some((tool) => /write|append|mkdir|filesystem/.test(tool));
  }

  // ── 1. Manifest entries → missing node files ───────────────────────
  for (const phase of manifest.phases || []) {
    const nodePath = join(nodesDir, phase.node);
    if (!existsSync(nodePath)) {
      issues.push({
        class: 'manifest_missing_node',
        detail: `Manifest phase "${phase.key}" references missing node file: ${phase.node}`,
        file: manifestPath,
      });
    }
  }

  for (const sharedRef of manifest.shared || []) {
    const sharedPath = join(nodesDir, sharedRef);
    if (!existsSync(sharedPath)) {
      issues.push({
        class: 'manifest_missing_shared',
        detail: `Manifest shared entry references missing file: ${sharedRef}`,
        file: manifestPath,
      });
    }
  }

  // ── 2. Node frontmatter gate ↔ manifest gate ──────────────────────
  for (const phase of manifest.phases || []) {
    const nodePath = join(nodesDir, phase.node);
    if (!existsSync(nodePath)) continue; // already reported above

    const fm = readNodeFrontmatter(nodePath);

    if (fm && fm.gate !== undefined) {
      if (fm.gate !== phase.gate) {
        issues.push({
          class: 'gate_binding_mismatch',
          detail: `Node "${phase.node}" frontmatter gate="${fm.gate}" disagrees with manifest gate="${phase.gate}"`,
          file: nodePath,
        });
      }

      // Check against gate definition
      if (phase.gate !== null) {
        const defPath = join(gateDefsDir, `gate-${phase.gate}.definition.json`);
        if (!existsSync(defPath)) {
          issues.push({
            class: 'gate_definition_missing',
            detail: `Gate definition missing for "${phase.gate}" (referenced by ${phase.node})`,
            file: defPath,
          });
        }
      }
    }
  }

  // ── 3. Gate definition gate ↔ node binding ────────────────────────
  for (const phase of manifest.phases || []) {
    if (phase.gate === null) continue;

    const defPath = join(gateDefsDir, `gate-${phase.gate}.definition.json`);
    if (!existsSync(defPath)) continue; // already reported above

    try {
      const def = JSON.parse(readFileSync(defPath, 'utf-8'));
      if (def.gate !== phase.gate) {
        issues.push({
          class: 'gate_definition_name_mismatch',
          detail: `Gate definition for "${phase.gate}" has internal gate field "${def.gate}"`,
          file: defPath,
        });
      }
    } catch (err) {
      issues.push({
        class: 'gate_definition_unreadable',
        detail: `Cannot parse gate definition "${phase.gate}": ${err.message}`,
        file: defPath,
      });
    }
  }

  // ── 4. Transition table references ─────────────────────────────────
  // Chain table
  if (existsSync(chainPath)) {
    try {
      const chain = loadChain(chainPath);
      for (const [currentNodeRef, outcomes] of Object.entries(chain)) {
        // Check current node exists
        const currentNodePath = join(nodesDir, currentNodeRef);
        if (!existsSync(currentNodePath)) {
          issues.push({
            class: 'transition_missing_current_node',
            detail: `Chain transition references missing current node: "${currentNodeRef}"`,
            file: chainPath,
          });
        }

        // Check next nodes exist
        for (const [outcome, nextNodeRef] of Object.entries(outcomes)) {
          if (nextNodeRef !== null) {
            const nextNodePath = join(nodesDir, nextNodeRef);
            if (!existsSync(nextNodePath)) {
              issues.push({
                class: 'transition_missing_next_node',
                detail: `Chain transition "${currentNodeRef}" + "${outcome}" → "${nextNodeRef}" references missing next node`,
                file: chainPath,
              });
            }
          }
        }
      }

      // Check that all manifest phases are in the transition table
      for (const phase of manifest.phases || []) {
        if (phase.gate === null) continue; // final phase has no outgoing transition
        if (!chain[phase.node]) {
          issues.push({
            class: 'transition_missing_entry',
            detail: `Manifest phase "${phase.key}" (node "${phase.node}") has no entry in chain transition table`,
            file: chainPath,
          });
        }
      }
    } catch (err) {
      issues.push({
        class: 'transition_chain_invalid',
        detail: `Cannot validate chain transitions: ${err.message}`,
        file: chainPath,
      });
    }
  }

  // ── 5. Dependency refs can be resolved ─────────────────────────────
  // Check that `requires` refs in node frontmatter resolve to existing files
  for (const phase of manifest.phases || []) {
    const nodePath = join(nodesDir, phase.node);
    if (!existsSync(nodePath)) continue;

    const fm = readNodeFrontmatter(nodePath);

    if (fm && Array.isArray(fm.requires)) {
      for (const depRef of fm.requires) {
        // Try resolving with and without .md extension
        const depWithMd = depRef.endsWith('.md') ? depRef : `${depRef}.md`;
        // Dependencies could be in phases/ or shared/
        const candidates = [
          join(nodesDir, 'phases', depWithMd),
          join(nodesDir, 'shared', depWithMd),
          join(nodesDir, depWithMd),
        ];
        const resolved = candidates.find(c => existsSync(c));
        if (!resolved) {
          issues.push({
            class: 'unresolvable_dependency',
            detail: `Node "${phase.node}" requires "${depRef}" but it cannot be resolved under nodes/`,
            file: nodePath,
          });
        }
      }
    }

    // Check suggested_context refs too
    if (fm && Array.isArray(fm.suggested_context)) {
      for (const ctxRef of fm.suggested_context) {
        const ctxWithMd = ctxRef.endsWith('.md') ? ctxRef : `${ctxRef}.md`;
        const candidates = [
          join(nodesDir, 'phases', ctxWithMd),
          join(nodesDir, 'shared', ctxWithMd),
          join(nodesDir, ctxWithMd),
        ];
        const resolved = candidates.find(c => existsSync(c));
        if (!resolved) {
          issues.push({
            class: 'unresolvable_context',
            detail: `Node "${phase.node}" suggests_context "${ctxRef}" but it cannot be resolved under nodes/`,
            file: nodePath,
          });
        }
      }
    }
  }

  // ── 6. Execution contract validation (WNC-001, WNC-002, WNC-008) ──
  // Lifecycle inventory of nodes that SHALL have execution_contract
  const LIFECYCLE_INVENTORY = [
    { node: 'phases/phase-instantiation.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-hitl1.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-setup.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-seed-topics.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-wave0.md', surface: 'phase-agent', search_policy: 'work_unit_required', work_unit_capable: true },
    { node: 'phases/phase-wave1.md', surface: 'phase-agent', search_policy: 'work_unit_required', work_unit_capable: true },
    { node: 'phases/phase-wave2.md', surface: 'phase-agent', search_policy: 'work_unit_required_for_new_evidence', work_unit_capable: true },
    { node: 'phases/phase-hitl2.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-readiness.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-rerun.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
    { node: 'phases/phase-final.md', surface: 'phase-agent', search_policy: 'no_search', relay_capable: false },
  ];

  const ROLE_SPEC_INVENTORY = [
    {
      node: 'phases/subagent-dpt-source-intake.md',
      id: 'subagent-dpt-source-intake',
      roleKey: 'dpt-source-intake',
      h1: '# Work-Unit Role: dpt-source-intake - Foundation Reference Intake',
    },
    {
      node: 'phases/subagent-dpt-evidence-extractor.md',
      id: 'subagent-dpt-evidence-extractor',
      roleKey: 'dpt-evidence-extractor',
      h1: '# Work-Unit Role: dpt-evidence-extractor - Topic-Specific Deepening',
    },
    {
      node: 'phases/subagent-dpt-topic-scout.md',
      id: 'subagent-dpt-topic-scout',
      roleKey: 'dpt-topic-scout',
      h1: '# Work-Unit Role: dpt-topic-scout - Gap-Fill Search',
    },
    {
      node: 'phases/subagent-dpt-claim-verifier.md',
      id: 'subagent-dpt-claim-verifier',
      roleKey: 'dpt-claim-verifier',
      h1: '# Work-Unit Role: dpt-claim-verifier - Critical Claim Verification',
    },
    {
      node: 'phases/subagent-dpt-source-diagnostic.md',
      id: 'subagent-dpt-source-diagnostic',
      roleKey: 'dpt-source-diagnostic',
      h1: '# Work-Unit Role: dpt-source-diagnostic - Source Quality Diagnostic',
    },
  ];

  const SHARED_GUIDANCE_INVENTORY = [
    'shared/shared-silent-execution.md',
    'shared/shared-subagent-protocol.md',
    'shared/shared-anti-cheating-rules.md',
  ];

  const VALID_SURFACES = ['phase-agent', 'work-unit-subagent-role', 'shared-guidance', 'shared-work-unit-subagent-protocol'];
  const VALID_SEARCH_POLICIES = ['no_search', 'work_unit_required', 'work_unit_required_for_new_evidence', 'subagent_performs_search'];
  const DEFAULT_PHASE_BODY_SECTIONS = [
    '## 1. Stage Goal',
    '## 2. Required Inputs',
    '## 3. Allowed Actions',
    '## 4. Expected Artifacts',
    '## 5. Gate Command',
    '## 6. On Gate Pass',
    '## 7. On Gate Fail',
    '## 8. Stop Behavior',
    '## 9. Anti-Cheating Rules',
  ];
  const ROLE_BRIEF_FIELDS = ['Role key', 'Used by', 'Receives', 'Produces', 'Write capability', 'Boundary', 'Handoff'];
  const ROLE_BODY_SECTIONS = [
    '## Lifecycle Logging Mandate (always-loaded)',
    '## 1. Purpose',
  ];

  // Check lifecycle nodes have valid execution_contract
  for (const entry of LIFECYCLE_INVENTORY) {
    const nodePath = join(nodesDir, entry.node);
    if (!existsSync(nodePath)) continue;

    const fm = readNodeFrontmatter(nodePath);
    if (!fm) continue;
    const md = readNodeMarkdown(nodePath);

    const ec = fm.execution_contract;
    if (!ec) {
      issues.push({
        class: 'execution_contract_missing',
        detail: `Lifecycle node "${entry.node}" is missing execution_contract frontmatter`,
        file: nodePath,
      });
      continue;
    }

    // Validate surface
    if (!VALID_SURFACES.includes(ec.surface)) {
      issues.push({
        class: 'execution_contract_invalid_surface',
        detail: `Node "${entry.node}" has unknown execution_contract.surface: "${ec.surface}". Valid: ${VALID_SURFACES.join(', ')}`,
        file: nodePath,
      });
    }

    // Validate search_policy
    if (!VALID_SEARCH_POLICIES.includes(ec.search_policy)) {
      issues.push({
        class: 'execution_contract_invalid_search_policy',
        detail: `Node "${entry.node}" has unknown execution_contract.search_policy: "${ec.search_policy}". Valid: ${VALID_SEARCH_POLICIES.join(', ')}`,
        file: nodePath,
      });
    }

    // Check surface matches expected
    if (ec.surface && ec.surface !== entry.surface) {
      issues.push({
        class: 'execution_contract_surface_mismatch',
        detail: `Node "${entry.node}" execution_contract.surface="${ec.surface}" expected="${entry.surface}"`,
        file: nodePath,
      });
    }

    // Check search_policy matches expected
    if (ec.search_policy && ec.search_policy !== entry.search_policy) {
      issues.push({
        class: 'execution_contract_search_policy_mismatch',
        detail: `Node "${entry.node}" execution_contract.search_policy="${ec.search_policy}" expected="${entry.search_policy}"`,
        file: nodePath,
      });
    }

    // Work-unit-capable phases MUST have shared-subagent-protocol + shared-anti-cheating-rules in requires
    if (entry.work_unit_capable) {
      if (!fm.requires || (!fm.requires.includes('shared/shared-subagent-protocol') && !fm.requires.includes('shared/shared-subagent-protocol.md'))) {
        issues.push({
          class: 'work_unit_capable_missing_subagent_protocol',
          detail: `Work-unit-capable node "${entry.node}" must have shared-subagent-protocol in requires, not only suggested_context`,
          file: nodePath,
        });
      }
      if (!fm.requires || (!fm.requires.includes('shared/shared-anti-cheating-rules') && !fm.requires.includes('shared/shared-anti-cheating-rules.md'))) {
        issues.push({
          class: 'work_unit_capable_missing_anti_cheating',
          detail: `Work-unit-capable node "${entry.node}" must have shared-anti-cheating-rules in requires, not only suggested_context`,
          file: nodePath,
        });
      }
    }

    // Check delegated_role_keys for work_unit_required / work_unit_required_for_new_evidence
    if ((ec.search_policy === 'work_unit_required' || ec.search_policy === 'work_unit_required_for_new_evidence') && ec.surface === 'phase-agent') {
      if (!ec.delegated_role_keys || !Array.isArray(ec.delegated_role_keys) || ec.delegated_role_keys.length === 0) {
        issues.push({
          class: 'execution_contract_missing_delegated_role_keys',
          detail: `Node "${entry.node}" has search_policy="${ec.search_policy}" but no delegated_role_keys`,
          file: nodePath,
        });
      }
    }

    const h1Match = md.match(/^# .+$/m);
    const h1Idx = h1Match ? md.indexOf(h1Match[0]) : -1;
    const briefIdx = md.indexOf('## 0. Execution Brief');
    const stageIdx = md.indexOf('## 1. Stage Goal');
    if (h1Idx === -1 || briefIdx === -1 || stageIdx === -1 || !(h1Idx < briefIdx && briefIdx < stageIdx)) {
      issues.push({
        class: 'lifecycle_execution_brief_invalid',
        detail: `Lifecycle node "${entry.node}" must place ## 0. Execution Brief immediately after H1 and before ## 1. Stage Goal`,
        file: nodePath,
      });
    } else {
      const briefText = md.slice(briefIdx, stageIdx);
      const missingFields = findOrderedExecutionBriefFields(briefText);
      if (missingFields.length > 0) {
        issues.push({
          class: 'lifecycle_execution_brief_fields_invalid',
          detail: `Lifecycle node "${entry.node}" Execution Brief missing or misordered fields: ${missingFields.join(', ')}`,
          file: nodePath,
        });
      }
    }

    for (const section of DEFAULT_PHASE_BODY_SECTIONS) {
      if (!md.includes(section)) {
        issues.push({
          class: 'lifecycle_phase_body_section_missing',
          detail: `Lifecycle node "${entry.node}" is missing required body section "${section}"`,
          file: nodePath,
        });
      }
    }
  }

  // Check role specs
  for (const entry of ROLE_SPEC_INVENTORY) {
    const nodePath = join(nodesDir, entry.node);
    if (!existsSync(nodePath)) {
      issues.push({
        class: 'missing_role_spec',
        detail: `Work-unit role spec "${entry.node}" is missing`,
        file: nodePath,
      });
      continue;
    }

    const fm = readNodeFrontmatter(nodePath);
    if (!fm) continue;
    const md = readNodeMarkdown(nodePath);

    const ec = fm.execution_contract;
    if (!ec) {
      issues.push({
        class: 'execution_contract_missing',
        detail: `Role spec "${entry.node}" is missing execution_contract`,
        file: nodePath,
      });
      continue;
    }

    if (fm.node_type !== 'shared') {
      issues.push({
        class: 'role_spec_wrong_node_type',
        detail: `Role spec "${entry.node}" must declare node_type: shared`,
        file: nodePath,
      });
    }

    if (fm.id !== entry.id) {
      issues.push({
        class: 'role_spec_id_mismatch',
        detail: `Role spec "${entry.node}" id="${fm.id}" expected="${entry.id}"`,
        file: nodePath,
      });
    }

    if (fm.shared_scope !== 'subagent-protocol') {
      issues.push({
        class: 'role_spec_wrong_shared_scope',
        detail: `Role spec "${entry.node}" must declare shared_scope: subagent-protocol`,
        file: nodePath,
      });
    }

    if (fm.role !== entry.roleKey) {
      issues.push({
        class: 'role_spec_role_mismatch',
        detail: `Role spec "${entry.node}" role="${fm.role}" expected="${entry.roleKey}"`,
        file: nodePath,
      });
    }

    if (fm.authority !== 'guidance-only') {
      issues.push({
        class: 'role_spec_wrong_authority',
        detail: `Role spec "${entry.node}" must declare authority: guidance-only`,
        file: nodePath,
      });
    }

    for (const forbidden of ['phase', 'gate', 'stop']) {
      if (Object.hasOwn(fm, forbidden)) {
        issues.push({
          class: 'role_spec_lifecycle_frontmatter',
          detail: `Role spec "${entry.node}" must not declare lifecycle frontmatter field "${forbidden}"`,
          file: nodePath,
        });
      }
    }

    const requiredDeps = ['shared/shared-subagent-protocol', 'shared/shared-schemas'];
    for (const dep of requiredDeps) {
      if (!Array.isArray(fm.requires) || !fm.requires.includes(dep)) {
        issues.push({
          class: 'role_spec_requires_invalid',
          detail: `Role spec "${entry.node}" must require "${dep}"`,
          file: nodePath,
        });
      }
    }

    if (!Array.isArray(fm.suggested_context) || fm.suggested_context.length !== 0) {
      issues.push({
        class: 'role_spec_suggested_context_invalid',
        detail: `Role spec "${entry.node}" must declare suggested_context: []`,
        file: nodePath,
      });
    }

    const h1Match = md.match(/^# .+$/m);
    const actualH1 = h1Match ? h1Match[0] : '';
    if (actualH1 !== entry.h1) {
      issues.push({
        class: 'role_spec_h1_mismatch',
        detail: `Role spec "${entry.node}" H1="${actualH1}" expected="${entry.h1}"`,
        file: nodePath,
      });
    }

    if (actualH1.startsWith('# Phase:')) {
      issues.push({
        class: 'role_spec_phase_h1',
        detail: `Role spec "${entry.node}" must not use a lifecycle phase H1`,
        file: nodePath,
      });
    }

    const h1Idx = actualH1 ? md.indexOf(actualH1) : -1;
    const briefIdx = md.indexOf('## 0. Role Brief');
    const purposeIdx = md.indexOf('## 1. Purpose');
    if (h1Idx === -1 || briefIdx === -1 || purposeIdx === -1 || !(h1Idx < briefIdx && briefIdx < purposeIdx)) {
      issues.push({
        class: 'role_brief_invalid',
        detail: `Role spec "${entry.node}" must place ## 0. Role Brief after H1 and before ## 1. Purpose`,
        file: nodePath,
      });
    } else {
      const briefText = md.slice(briefIdx, purposeIdx);
      const missingFields = findOrderedFields(briefText, ROLE_BRIEF_FIELDS);
      if (missingFields.length > 0) {
        issues.push({
          class: 'role_brief_fields_invalid',
          detail: `Role spec "${entry.node}" Role Brief missing or misordered fields: ${missingFields.join(', ')}`,
          file: nodePath,
        });
      }
      if (!briefText.includes(`**Role key**: \`${entry.roleKey}\``)) {
        issues.push({
          class: 'role_brief_role_key_mismatch',
          detail: `Role spec "${entry.node}" Role Brief Role key must be "${entry.roleKey}"`,
          file: nodePath,
        });
      }
    }

    for (const section of ROLE_BODY_SECTIONS) {
      if (!md.includes(section)) {
        issues.push({
          class: 'role_body_section_missing',
          detail: `Role spec "${entry.node}" is missing required role body section "${section}"`,
          file: nodePath,
        });
      }
    }

    const lifecycleHeadings = ['## 1. Stage Goal', '## 5. Gate Command', '## 8. Stop Behavior'];
    for (const heading of lifecycleHeadings) {
      if (md.includes(heading)) {
        issues.push({
          class: 'role_spec_lifecycle_heading',
          detail: `Role spec "${entry.node}" must not use lifecycle-primary heading "${heading}"`,
          file: nodePath,
        });
      }
    }

    if (ec.surface !== 'work-unit-subagent-role') {
      issues.push({
        class: 'role_spec_wrong_surface',
        detail: `Role spec "${entry.node}" must have surface: work-unit-subagent-role, got "${ec.surface}"`,
        file: nodePath,
      });
    }

    if (ec.search_policy !== 'subagent_performs_search') {
      issues.push({
        class: 'role_spec_wrong_search_policy',
        detail: `Role spec "${entry.node}" must have search_policy: subagent_performs_search, got "${ec.search_policy}"`,
        file: nodePath,
      });
    }

    if (ec.loaded_by !== 'phase-agent') {
      issues.push({
        class: 'role_spec_missing_loaded_by',
        detail: `Role spec "${entry.node}" must have loaded_by: phase-agent`,
        file: nodePath,
      });
    }

    if (ec.delivered_via !== 'work_unit_task_md') {
      issues.push({
        class: 'role_spec_missing_delivered_via',
        detail: `Role spec "${entry.node}" must have delivered_via: work_unit_task_md`,
        file: nodePath,
      });
    }

    if (!declaresFilesystemWriteCapability(ec)) {
      issues.push({
        class: 'role_write_capability_missing',
        detail: `Write-producing role spec "${entry.node}" must declare filesystem_write: required or required_write_tools capable of writing result, receipt, outputs, and cache leaves`,
        file: nodePath,
      });
    }

    // Role spec must NOT appear in manifest.phases[]
    const inManifestPhases = (manifest.phases || []).some((p) => p.node === entry.node);
    if (inManifestPhases) {
      issues.push({
        class: 'role_spec_in_manifest_phases',
        detail: `Role spec "${entry.node}" has surface: work-unit-subagent-role but appears in manifest.phases[] - it must not be a manifest lifecycle phase`,
        file: nodePath,
      });
    }

    const inManifestShared = (manifest.shared || []).some((sharedRef) => sharedRef === entry.node);
    if (inManifestShared) {
      issues.push({
        class: 'role_spec_in_manifest_shared',
        detail: `Role spec "${entry.node}" must not appear in manifest.shared[] — role specs are Phase-Agent-loaded guidance, not globally loaded shared nodes`,
        file: nodePath,
      });
    }

    // WNC-009: Serialization contract — role spec §3 (Artifacts) must require
    // yaml.stringify() / JSON.stringify() for structured output.
    // Check: if the Artifacts section mentions YAML or JSON file output, it must
    // reference the correct serialization method (not hand-concatenation patterns).
    const artifactsSection = md.match(/## 3\. Artifacts\b[\s\S]*?(?=## [4-9]\. |## 1[0-9]\. |$)/);
    if (artifactsSection) {
      const sectionText = artifactsSection[0];
      const mentionsYamlOrJson = /\b(?:yaml|YAML|\.yaml|\.json|JSON)\b/.test(sectionText);
      const hasCorrectMethod = /yaml\.stringify|JSON\.stringify/.test(sectionText);
      if (mentionsYamlOrJson && !hasCorrectMethod) {
        issues.push({
          class: 'serialization_contract_violation',
          detail: `Role spec "${entry.node}" §3 Artifacts mentions YAML/JSON output but does not require yaml.stringify() / JSON.stringify() for serialization`,
          file: nodePath,
        });
      }
    }
  }

  // Check shared guidance
  for (const sharedRef of SHARED_GUIDANCE_INVENTORY) {
    const candidates = [
      join(nodesDir, sharedRef),
      join(nodesDir, 'shared', sharedRef.replace('shared/', '')),
    ];
    const nodePath = candidates.find((c) => existsSync(c));
    if (!nodePath) continue;

    const fm = readNodeFrontmatter(nodePath);
    if (!fm) continue;

    const ec = fm.execution_contract;
    if (!ec) {
      if (fm.surface === 'shared-work-unit-subagent-protocol') continue;
      issues.push({
        class: 'execution_contract_missing',
        detail: `Shared guidance "${sharedRef}" is missing execution_contract`,
        file: nodePath,
      });
      continue;
    }

    if (ec.surface !== 'shared-guidance') {
      issues.push({
        class: 'shared_guidance_wrong_surface',
        detail: `Shared guidance "${sharedRef}" must have surface: shared-guidance, got "${ec.surface}"`,
        file: nodePath,
      });
    }

    if (ec.search_policy !== 'no_search') {
      issues.push({
        class: 'shared_guidance_search_capable',
        detail: `Shared guidance "${sharedRef}" has search_policy="${ec.search_policy}" — shared guidance must have no_search`,
        file: nodePath,
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
