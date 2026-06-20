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
import { loadFSM } from './transition-fsm.mjs';
import { parseFrontmatter } from './workflow-chain.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Validate the workflow package for consistency.
 *
 * @param {object} opts
 * @param {string} [opts.workflowsDir] — path to workflows/ directory (default: DPT_FRAMEWORK/workflows/)
 * @param {string} [opts.gateDefsDir] — path to gate definitions directory (default: DPT_FRAMEWORK/schema/gate_definitions/)
 * @param {string} [opts.transitionsChainPath] — path to transitions.chain.json (optional)
 * @param {string} [opts.transitionsFsmPath] — path to transitions.fsm.json (optional)
 * @returns {{ passed: boolean, issues: Array<{ class: string, detail: string, file?: string }> }}
 *
 * @impl WNC-007
 */
export function validateWorkflowPackage(opts = {}) {
  const workflowsDir = opts.workflowsDir || join(__dirname, '..', 'workflows');
  const gateDefsDir = opts.gateDefsDir || join(__dirname, '..', 'schema', 'gate_definitions');
  const chainPath = opts.transitionsChainPath || join(workflowsDir, 'transitions.chain.json');
  const fsmPath = opts.transitionsFsmPath || join(workflowsDir, 'transitions.fsm.json');

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

  // FSM table
  if (existsSync(fsmPath)) {
    try {
      const fsm = loadFSM(fsmPath);
      for (const [stateKey, stateDef] of Object.entries(fsm.states)) {
        const statePath = join(nodesDir, stateKey);
        if (!existsSync(statePath)) {
          issues.push({
            class: 'fsm_transition_missing_node',
            detail: `FSM state references missing node: "${stateKey}"`,
            file: fsmPath,
          });
        }

        for (const [outcome, target] of Object.entries(stateDef.on)) {
          if (target !== null) {
            const targetPath = join(nodesDir, target);
            if (!existsSync(targetPath)) {
              issues.push({
                class: 'fsm_transition_missing_target',
                detail: `FSM transition "${stateKey}" + "${outcome}" → "${target}" references missing target node`,
                file: fsmPath,
              });
            }
          }
        }
      }
    } catch (err) {
      issues.push({
        class: 'fsm_transition_invalid',
        detail: `Cannot validate FSM transitions: ${err.message}`,
        file: fsmPath,
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

  return {
    passed: issues.length === 0,
    issues,
  };
}
