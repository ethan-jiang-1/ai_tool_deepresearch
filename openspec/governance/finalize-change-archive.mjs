#!/usr/bin/env node
// @impl CHF-002, CHF-003, CHF-004
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const FINALIZER_SCHEMA_VERSION = 'change-feedback-finalizer/v1';
export const FINALIZER_COMMAND = 'node openspec/governance/finalize-change-archive.mjs';
export const FEEDBACK_MARKERS = Object.freeze({
  plan: 'openspec-feedback:plan-review',
  closeout: 'openspec-feedback:closeout-review',
});
export const SUPPORTED_ENTRY_SURFACES = Object.freeze({
  apply: Object.freeze([
    '.agents/skills/openspec-apply-change/SKILL.md',
    '.agents/skills/source-command-opsx-apply/SKILL.md',
    '.claude/skills/openspec-apply-change/SKILL.md',
    '.claude/commands/opsx/apply.md',
  ]),
  archive: Object.freeze([
    '.agents/skills/openspec-archive-change/SKILL.md',
    '.agents/skills/source-command-opsx-archive/SKILL.md',
    '.claude/skills/openspec-archive-change/SKILL.md',
    '.claude/commands/opsx/archive.md',
  ]),
});

const ChangeNameSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be safe kebab-case');
const ResultChangeSchema = ChangeNameSchema.nullable();
const RootCodeSchema = z.enum([
  'input_invalid',
  'status_resolution_failed',
  'status_invalid',
  'artifact_incomplete',
  'task_file_unavailable',
  'review_marker_invalid',
  'review_marker_unmet',
  'task_incomplete',
  'strict_validation_failed',
  'requirement_governance_failed',
  'main_spec_governance_failed',
  'capability_taxonomy_failed',
  'capability_discovery_failed',
  'verification_routing_failed',
  'native_archive_failed',
  'native_archive_invalid',
  'post_archive_mismatch',
  'unexpected_error',
]);
const RepairSchema = z.object({
  write_to: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
}).strict().refine((value) => value.write_to || value.command, 'requires a legal repair coordinate');
const RootSchema = z.object({
  code: RootCodeSchema,
  observed: z.string().min(1),
  owner: z.string().min(1),
  repair: RepairSchema.optional(),
  rerun: z.string().min(1),
  detail: z.record(z.unknown()).optional(),
}).strict();
const CheckSchema = z.object({
  id: z.enum([
    'openspec_status',
    'artifacts',
    'tasks',
    'strict_validation',
    'requirement_governance',
    'main_spec_governance',
    'capability_taxonomy',
    'capability_discovery',
    'verification_routing',
    'native_archive',
  ]),
  status: z.literal('passed'),
}).strict();
const ArchiveSchema = z.object({
  archived_as: z.string().min(1),
  path: z.string().min(1),
  specs_updated: z.literal(false),
}).strict();

export const FinalizationResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    schema_version: z.literal(FINALIZER_SCHEMA_VERSION),
    change: ResultChangeSchema,
    outcome: z.literal('blocked'),
    root: RootSchema,
    checks: z.array(CheckSchema),
  }).strict(),
  z.object({
    schema_version: z.literal(FINALIZER_SCHEMA_VERSION),
    change: ChangeNameSchema,
    outcome: z.literal('archived'),
    checks: z.array(CheckSchema),
    archive: ArchiveSchema,
  }).strict(),
]);

const StatusSchema = z.object({
  changeName: ChangeNameSchema,
  planningHome: z.object({
    root: z.string().min(1),
    changesDir: z.string().min(1),
  }).passthrough(),
  changeRoot: z.string().min(1),
  artifacts: z.array(z.object({ id: z.string().min(1), status: z.string().min(1) }).passthrough()),
  artifactPaths: z.object({
    tasks: z.object({ resolvedOutputPath: z.string().min(1) }).passthrough(),
  }).passthrough(),
}).passthrough();
const NativeArchiveRecordSchema = z.object({
  change: ChangeNameSchema,
  archivedAs: z.string().min(1),
  path: z.string().min(1),
  specsUpdated: z.boolean(),
}).passthrough();
const NativeArchiveSchema = z.object({
  archive: NativeArchiveRecordSchema,
}).passthrough();

const TASK_LINE = /^\s*- \[([ x])\]\s+(.+?)\s*$/;

function rerunFor(change) {
  return change ? `${FINALIZER_COMMAND} --change ${change}` : FINALIZER_COMMAND;
}

function relativeTo(root, target) {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(target);
  const value = relative(resolvedRoot, resolvedTarget);
  return value === '' ? '.' : value;
}

function inside(child, parent) {
  const value = relative(resolve(parent), resolve(child));
  return value !== '' && !value.startsWith('../') && value !== '..' && !isAbsolute(value);
}

function defaultRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env,
  });
  return {
    status: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error?.message,
  };
}

function defaultFs() {
  return {
    exists: existsSync,
    readFile: (path) => readFileSync(path, 'utf8'),
    isDirectory: (path) => statSync(path).isDirectory(),
  };
}

function summarizeProcess(result) {
  const text = String(result.stderr || result.stdout || result.error || '').trim().replace(/\s+/g, ' ');
  const suffix = text ? `: ${text.slice(0, 240)}` : '';
  return `command exited ${result.status ?? 'unknown'}${suffix}`;
}

function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function makeBlocked(change, checks, code, observed, owner, options = {}) {
  return FinalizationResultSchema.parse({
    schema_version: FINALIZER_SCHEMA_VERSION,
    change,
    outcome: 'blocked',
    root: {
      code,
      observed,
      owner,
      ...(options.repair ? { repair: options.repair } : {}),
      rerun: rerunFor(change),
      ...(options.detail ? { detail: options.detail } : {}),
    },
    checks,
  });
}

function addCheck(checks, id) {
  checks.push({ id, status: 'passed' });
}

export function parseFeedbackTasks(markdown) {
  const tasks = [];
  for (const [index, line] of String(markdown).split(/\r?\n/).entries()) {
    const match = line.match(TASK_LINE);
    if (!match) continue;
    const task = {
      line: index + 1,
      state: match[1] === 'x' ? 'complete' : 'pending',
      text: match[2],
    };
    tasks.push(task);
  }
  const markers = Object.fromEntries(Object.entries(FEEDBACK_MARKERS).map(([kind, marker]) => [
    kind,
    tasks.filter((task) => task.text.includes(marker)),
  ]));
  return {
    tasks,
    markers,
    pending: tasks.filter((task) => task.state === 'pending'),
  };
}

function pathFacts(fsApi, changeRoot, archiveDir) {
  return {
    active_change_exists: fsApi.exists(changeRoot),
    archive_directory_exists: fsApi.exists(archiveDir),
  };
}

function runStep(runCommand, command, args, cwd) {
  return Promise.resolve(runCommand(command, args, { cwd }));
}

export async function finalizeChangeArchive({
  change,
  projectRoot = process.cwd(),
  runCommand = defaultRun,
  fsApi = defaultFs(),
} = {}) {
  const parsedChange = ChangeNameSchema.safeParse(change);
  if (!parsedChange.success) {
    return makeBlocked(null, [], 'input_invalid', 'a safe --change value is required', 'finalizer CLI');
  }
  const selectedChange = parsedChange.data;
  const checks = [];
  const initialRoot = resolve(projectRoot);

  try {
    const statusRun = await runStep(runCommand, 'openspec', ['status', '--change', selectedChange, '--json'], initialRoot);
    if (statusRun.status !== 0) {
      return makeBlocked(selectedChange, checks, 'status_resolution_failed', summarizeProcess(statusRun), 'openspec status');
    }
    const statusJson = parseJson(statusRun.stdout);
    if (!statusJson.ok) {
      return makeBlocked(selectedChange, checks, 'status_invalid', `status JSON is invalid: ${statusJson.error}`, 'openspec status');
    }
    const statusResult = StatusSchema.safeParse(statusJson.value);
    if (!statusResult.success || statusResult.data.changeName !== selectedChange) {
      return makeBlocked(selectedChange, checks, 'status_invalid', 'status JSON does not describe the selected active change', 'openspec status');
    }
    const status = statusResult.data;
    const planningRoot = resolve(status.planningHome.root);
    const changeRoot = resolve(status.changeRoot);
    const taskPath = resolve(status.artifactPaths.tasks.resolvedOutputPath);
    const archiveDir = join(resolve(status.planningHome.changesDir), 'archive');
    addCheck(checks, 'openspec_status');

    const incompleteArtifacts = status.artifacts.filter((artifact) => !['done', 'skipped'].includes(artifact.status));
    if (incompleteArtifacts.length > 0) {
      return makeBlocked(
        selectedChange,
        checks,
        'artifact_incomplete',
        `incomplete artifacts: ${incompleteArtifacts.map((artifact) => `${artifact.id}=${artifact.status}`).join(', ')}`,
        relativeTo(planningRoot, changeRoot),
      );
    }
    addCheck(checks, 'artifacts');

    let tasksText;
    try {
      tasksText = fsApi.readFile(taskPath);
    } catch (error) {
      return makeBlocked(
        selectedChange,
        checks,
        'task_file_unavailable',
        `cannot read task file: ${error.message}`,
        relativeTo(planningRoot, taskPath),
      );
    }
    const taskState = parseFeedbackTasks(tasksText);
    for (const [kind, marker] of Object.entries(FEEDBACK_MARKERS)) {
      if (taskState.markers[kind].length !== 1) {
        return makeBlocked(
          selectedChange,
          checks,
          'review_marker_invalid',
          `${marker} must appear on exactly one checkbox task line; found ${taskState.markers[kind].length}`,
          relativeTo(planningRoot, taskPath),
          { repair: { write_to: relativeTo(planningRoot, taskPath) } },
        );
      }
      if (taskState.markers[kind][0].state !== 'complete') {
        return makeBlocked(
          selectedChange,
          checks,
          'review_marker_unmet',
          `${marker} is incomplete on task line ${taskState.markers[kind][0].line}`,
          relativeTo(planningRoot, taskPath),
          { repair: { write_to: relativeTo(planningRoot, taskPath) } },
        );
      }
    }
    const ordinaryPending = taskState.pending.filter((task) => !Object.values(FEEDBACK_MARKERS).some((marker) => task.text.includes(marker)));
    if (ordinaryPending.length > 0) {
      return makeBlocked(
        selectedChange,
        checks,
        'task_incomplete',
        `incomplete task at line ${ordinaryPending[0].line}: ${ordinaryPending[0].text}`,
        relativeTo(planningRoot, taskPath),
        { repair: { write_to: relativeTo(planningRoot, taskPath) } },
      );
    }
    addCheck(checks, 'tasks');

    const strictValidation = await runStep(runCommand, 'openspec', ['validate', selectedChange, '--strict'], planningRoot);
    if (strictValidation.status !== 0) {
      return makeBlocked(selectedChange, checks, 'strict_validation_failed', summarizeProcess(strictValidation), 'openspec validate');
    }
    addCheck(checks, 'strict_validation');

    const reqCheck = await runStep(
      runCommand,
      process.execPath,
      [
        join(planningRoot, 'openspec/governance/check-project-reqs.mjs'),
        planningRoot,
        '--mode',
        'archive',
        '--change',
        selectedChange,
      ],
      planningRoot,
    );
    if (reqCheck.status !== 0) {
      return makeBlocked(selectedChange, checks, 'requirement_governance_failed', summarizeProcess(reqCheck), 'openspec/governance/check-project-reqs.mjs');
    }
    addCheck(checks, 'requirement_governance');

    const specCheck = await runStep(runCommand, process.execPath, [join(planningRoot, 'openspec/governance/check-project-specs.mjs'), planningRoot], planningRoot);
    if (specCheck.status !== 0) {
      return makeBlocked(selectedChange, checks, 'main_spec_governance_failed', summarizeProcess(specCheck), 'openspec/governance/check-project-specs.mjs');
    }
    addCheck(checks, 'main_spec_governance');

    const taxonomyCheck = await runStep(
      runCommand,
      process.execPath,
      [join(planningRoot, 'openspec/governance/check-capability-taxonomy.mjs'), planningRoot],
      planningRoot,
    );
    if (taxonomyCheck.status !== 0) {
      return makeBlocked(selectedChange, checks, 'capability_taxonomy_failed', summarizeProcess(taxonomyCheck), 'openspec/governance/check-capability-taxonomy.mjs');
    }
    addCheck(checks, 'capability_taxonomy');

    const discoveryCheck = await runStep(
      runCommand,
      process.execPath,
      [join(planningRoot, 'openspec/governance/check-capability-discovery.mjs'), '--change', selectedChange],
      planningRoot,
    );
    if (discoveryCheck.status !== 0) {
      return makeBlocked(selectedChange, checks, 'capability_discovery_failed', summarizeProcess(discoveryCheck), 'openspec/governance/check-capability-discovery.mjs');
    }
    addCheck(checks, 'capability_discovery');

    const routingCheck = await runStep(
      runCommand,
      process.execPath,
      [join(planningRoot, 'openspec/governance/check-verification-routing.mjs'), '--change', selectedChange, '--mode', 'assets'],
      planningRoot,
    );
    if (routingCheck.status !== 0) {
      return makeBlocked(selectedChange, checks, 'verification_routing_failed', summarizeProcess(routingCheck), 'openspec/governance/check-verification-routing.mjs');
    }
    addCheck(checks, 'verification_routing');

    const nativeArchive = await runStep(runCommand, 'openspec', ['archive', selectedChange, '--json', '--skip-specs'], planningRoot);
    if (nativeArchive.status !== 0) {
      return makeBlocked(
        selectedChange,
        checks,
        'native_archive_failed',
        summarizeProcess(nativeArchive),
        'openspec archive',
        { detail: pathFacts(fsApi, changeRoot, archiveDir) },
      );
    }
    const nativeJson = parseJson(nativeArchive.stdout);
    if (!nativeJson.ok) {
      return makeBlocked(
        selectedChange,
        checks,
        'native_archive_invalid',
        `native archive JSON is invalid: ${nativeJson.error}`,
        'openspec archive',
        { detail: pathFacts(fsApi, changeRoot, archiveDir) },
      );
    }
    const nativeResult = NativeArchiveSchema.safeParse(nativeJson.value);
    if (!nativeResult.success) {
      return makeBlocked(
        selectedChange,
        checks,
        'native_archive_invalid',
        'native archive JSON is missing required result fields',
        'openspec archive',
        { detail: pathFacts(fsApi, changeRoot, archiveDir) },
      );
    }

    const archive = nativeResult.data.archive;
    const archivePath = resolve(planningRoot, archive.path);
    const expectedPath = join(archiveDir, archive.archivedAs);
    const expected = archive.change === selectedChange
      && archive.specsUpdated === false
      && archivePath === expectedPath
      && inside(archivePath, archiveDir)
      && fsApi.exists(archivePath)
      && fsApi.isDirectory(archivePath)
      && !fsApi.exists(changeRoot);
    if (!expected) {
      return makeBlocked(
        selectedChange,
        checks,
        'post_archive_mismatch',
        'native archive result and resolved active/archive paths do not agree',
        'openspec archive',
        {
          detail: {
            ...pathFacts(fsApi, changeRoot, archiveDir),
            reported_archive_path: archivePath,
            expected_archive_path: expectedPath,
            native_change: archive.change,
            specs_updated: archive.specsUpdated,
          },
        },
      );
    }
    addCheck(checks, 'native_archive');
    return FinalizationResultSchema.parse({
      schema_version: FINALIZER_SCHEMA_VERSION,
      change: selectedChange,
      outcome: 'archived',
      checks,
      archive: {
        archived_as: archive.archivedAs,
        path: archivePath,
        specs_updated: false,
      },
    });
  } catch (error) {
    return makeBlocked(selectedChange, checks, 'unexpected_error', error.message, 'finalizer implementation');
  }
}

async function main() {
  let change;
  try {
    const parsed = parseArgs({
      args: process.argv.slice(2),
      options: { change: { type: 'string' } },
      strict: true,
      allowPositionals: false,
    });
    change = parsed.values.change;
  } catch (error) {
    const result = makeBlocked(null, [], 'input_invalid', error.message, 'finalizer CLI');
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = 2;
    return;
  }
  const result = await finalizeChangeArchive({ change });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.outcome === 'archived' ? 0 : 1;
}

function isDirectInvocation() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]));
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  main();
}
