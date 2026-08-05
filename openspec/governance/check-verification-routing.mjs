#!/usr/bin/env node
// @impl VER-002, VER-003, VER-006
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { parseMdFrontmatter } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { parsePlaybookManifest } from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs';
import { parseVerificationRoutingPlan } from './verification-routing-contract.mjs';

function usage() {
  console.error('Usage: node openspec/governance/check-verification-routing.mjs --change <name> --mode plan|assets');
  process.exit(2);
}

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const change = valueFor('--change');
const mode = valueFor('--mode');
if (!change || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change) || !['plan', 'assets'].includes(mode) || args.length !== 4) usage();

const root = resolve(process.env.VERIFICATION_ROUTING_PROJECT_ROOT || process.cwd());
const planPath = join(root, 'openspec', 'changes', change, 'verification-plan.yaml');
const failures = [];
function fail(claim, missingFact, writeTo) {
  failures.push({ claim, missingFact, writeTo });
}
function printFailures() {
  for (const item of failures) {
    console.error(`claim: ${item.claim}\nmissing_fact: ${item.missingFact}\nwrite_to: ${item.writeTo}\nrerun: node openspec/governance/check-verification-routing.mjs --change ${change} --mode ${mode}`);
  }
  process.exit(1);
}

if (!existsSync(planPath)) fail('plan', 'verification-plan.yaml is missing', relative(root, planPath));
if (failures.length) printFailures();

let plan;
try {
  plan = parseVerificationRoutingPlan(parseYaml(readFileSync(planPath, 'utf8')));
} catch (error) {
  const issues = error?.issues ?? [{ path: [], message: error.message }];
  for (const issue of issues) fail('plan', `${issue.path.join('.') || 'document'}: ${issue.message}`, relative(root, planPath));
  printFailures();
}
if (plan.change !== change || basename(dirname(planPath)) !== change) fail('plan', `change identity must equal ${change}`, 'verification-plan.yaml change');
if (failures.length) printFailures();

function inside(child, parent) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}
function collectCaseFiles(dir, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) collectCaseFiles(full, output);
    else if (entry.isFile() && /^case-.*\.md$/.test(entry.name)) output.push(full);
  }
  return output;
}

if (mode === 'assets') {
  const caseOwners = new Map();
  for (const file of collectCaseFiles(join(root, 'experiments_playbook'))) {
    try {
      const id = parseMdFrontmatter(readFileSync(file, 'utf8')).case;
      if (id) caseOwners.set(id, [...(caseOwners.get(id) ?? []), file]);
    } catch {}
  }
  const manifestPath = join(root, 'experiments_playbook', 'PLAYBOOK_MANIFEST.md');
  let manifestPaths = [];
  if (!existsSync(manifestPath)) fail('manifest', 'PLAYBOOK_MANIFEST.md is missing', 'experiments_playbook/PLAYBOOK_MANIFEST.md');
  else {
    try { manifestPaths = parsePlaybookManifest(readFileSync(manifestPath, 'utf8')); }
    catch (error) { fail('manifest', error.message, 'experiments_playbook/PLAYBOOK_MANIFEST.md'); }
  }
  for (const item of plan.claims) {
    const declared = resolve(root, item.asset.path);
    if (!existsSync(declared)) {
      fail(item.id, 'declared asset is missing', item.asset.path);
      continue;
    }
    const stat = statSync(declared);
    if (!stat.isFile()) {
      fail(item.id, 'declared asset is not a regular file', item.asset.path);
      continue;
    }
    const real = realpathSync(declared);
    const ownedRoot = item.test_class === 'agent_flow_e2e' ? join(root, 'experiments_playbook') :
      item.test_class === 'integration' ? join(root, 'tests', 'integration') :
      item.test_class === 'deterministic_e2e' ? join(root, 'tests', 'e2e') : join(root, 'tests');
    if (!inside(real, realpathSync(ownedRoot))) {
      fail(item.id, 'asset realpath escapes its owned boundary', item.asset.path);
      continue;
    }
    if (item.test_class !== 'agent_flow_e2e') continue;
    const validated = spawnSync(process.execPath, [join(root, 'DEEP_RESEARCH_HARNESS', 'cli', 'validate-playbook.mjs'), declared], { cwd: root, encoding: 'utf8' });
    if (validated.status !== 0) fail(item.id, 'canonical playbook validation failed', item.asset.path);
    let frontmatter;
    try { frontmatter = parseMdFrontmatter(readFileSync(declared, 'utf8')); } catch { frontmatter = {}; }
    const stem = basename(declared, '.md');
    if (frontmatter.case !== stem) fail(item.id, 'filename stem does not match frontmatter case', item.asset.path);
    if ((caseOwners.get(frontmatter.case) ?? []).length !== 1) fail(item.id, 'case identity is not globally unique', item.asset.path);
    const manifestRef = item.asset.path.replace(/^experiments_playbook\//, '');
    const count = manifestPaths.filter((pathValue) => pathValue === manifestRef).length;
    if (count !== 1) fail(item.id, `active manifest must contain the exact path once (found ${count})`, 'experiments_playbook/PLAYBOOK_MANIFEST.md');
  }
}

if (failures.length) printFailures();
console.log(`Verification routing ${mode} valid: ${change} (${plan.claims.length} claims).`);
