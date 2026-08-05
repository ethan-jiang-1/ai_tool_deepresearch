// @impl DEW-009

import {
  lstatSync,
  realpathSync,
  readFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROLE_REF_PREFIX = 'workflows/nodes/phases';
const SHARED_REF_PREFIX = 'workflows/nodes/shared';
const PAGE_FETCH_ID = 'shared-page-fetch-guidance';
const PAGE_FETCH_SCOPE = 'subagent-fetch';

function isInside(candidate, rootDir) {
  const relative = path.relative(rootDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isCanonicalRelativeRef(ref) {
  if (typeof ref !== 'string' || ref.length === 0 || path.posix.isAbsolute(ref)) return false;
  if (ref.includes('\\') || ref.includes('//')) return false;
  const segments = ref.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return path.posix.normalize(ref) === ref;
}

function frameworkRootFromModule() {
  return realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
}

function containedRegularFile(frameworkRoot, ref, label) {
  if (!isCanonicalRelativeRef(ref)) throw new Error(`${label} ref is not a canonical contained path`);
  const absolute = path.join(frameworkRoot, ref);
  let stat;
  let resolved;
  try {
    stat = lstatSync(absolute);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('not regular');
    resolved = realpathSync(absolute);
  } catch {
    throw new Error(`${label} file is missing or not a regular contained file`);
  }
  if (!isInside(resolved, frameworkRoot)) throw new Error(`${label} file escapes the framework root`);
  return resolved;
}

function parseFrontmatter(filePath, label) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(`${label} file is unreadable`);
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error(`${label} frontmatter is missing`);
  let parsed;
  try {
    parsed = parseYaml(match[1]);
  } catch {
    throw new Error(`${label} frontmatter is invalid`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} frontmatter must be an object`);
  }
  return parsed;
}

function sharedRefForRequirement(requirement) {
  if (typeof requirement !== 'string' || !requirement.startsWith('shared/')) {
    throw new Error('shared guidance dependency must use a canonical shared ref');
  }
  const ref = `workflows/nodes/${requirement}.md`;
  if (!ref.startsWith(`${SHARED_REF_PREFIX}/`) || !isCanonicalRelativeRef(ref)) {
    throw new Error('shared guidance dependency is not contained');
  }
  return ref;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateInput({ kind, delegated_role_key: delegatedRoleKey, actor_policy: actorPolicy } = {}) {
  if (typeof kind !== 'string' || kind.length === 0) throw new Error('work-unit kind is required for role guidance');
  if (!/^[a-z0-9-]+$/.test(delegatedRoleKey || '')) throw new Error('delegated role key is invalid for role guidance');
  if (!actorPolicy || typeof actorPolicy !== 'object' || Array.isArray(actorPolicy)) {
    throw new Error('actor policy is required for role guidance');
  }
  if (actorPolicy.delegated_role_key !== delegatedRoleKey) {
    throw new Error('actor policy delegated role key does not match the lifecycle-resolved role key');
  }
  return delegatedRoleKey;
}

function resolveGuidanceAtRoot(input, frameworkRoot) {
  const delegatedRoleKey = validateInput(input);
  const resolvedRoot = realpathSync(frameworkRoot);
  const roleRef = `${ROLE_REF_PREFIX}/subagent-${delegatedRoleKey}.md`;
  const rolePath = containedRegularFile(resolvedRoot, roleRef, 'role guidance');
  const roleFrontmatter = parseFrontmatter(rolePath, 'role guidance');
  if (
    roleFrontmatter.id !== `subagent-${delegatedRoleKey}`
    && roleFrontmatter.id !== delegatedRoleKey
    && roleFrontmatter.role !== delegatedRoleKey
  ) {
    throw new Error('role guidance identity does not match the lifecycle-resolved role key');
  }
  if (!Array.isArray(roleFrontmatter.requires)) throw new Error('role guidance requires must be a direct dependency array');

  const sharedGuidanceRefs = [];
  for (const requirement of roleFrontmatter.requires) {
    if (typeof requirement !== 'string' || !requirement.startsWith('shared/')) continue;
    const ref = sharedRefForRequirement(requirement);
    const sharedPath = containedRegularFile(resolvedRoot, ref, 'shared guidance');
    const sharedFrontmatter = parseFrontmatter(sharedPath, 'shared guidance');
    if (sharedFrontmatter.actor_delivery !== 'required') continue;
    if (typeof sharedFrontmatter.id !== 'string' || typeof sharedFrontmatter.shared_scope !== 'string') {
      throw new Error('shared guidance actor-delivery identity is invalid');
    }
    sharedGuidanceRefs.push({
      id: sharedFrontmatter.id,
      shared_scope: sharedFrontmatter.shared_scope,
      ref,
      path: sharedPath,
    });
  }

  const pageFetchRefs = sharedGuidanceRefs.filter((entry) => (
    entry.id === PAGE_FETCH_ID && entry.shared_scope === PAGE_FETCH_SCOPE
  ));
  if (pageFetchRefs.length !== 1) {
    throw new Error('shared guidance must contain exactly one actor-delivered page-fetch dependency');
  }

  return deepFreeze({
    role_key: delegatedRoleKey,
    role_ref: roleRef,
    role_path: rolePath,
    shared_guidance_refs: sharedGuidanceRefs,
  });
}

export function resolveWorkUnitRoleGuidance(input) {
  return resolveGuidanceAtRoot(input, frameworkRootFromModule());
}

// This explicit root is a temporary-fixture seam for unit tests, never a claim/CLI input.
export function resolveWorkUnitRoleGuidanceForTest(input, { frameworkRoot } = {}) {
  if (typeof frameworkRoot !== 'string' || frameworkRoot.length === 0) {
    throw new Error('test framework root is required');
  }
  return resolveGuidanceAtRoot(input, frameworkRoot);
}
