// @impl CHF-001, CHF-003
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FEEDBACK_MARKERS,
  FinalizationResultSchema,
  finalizeChangeArchive,
  parseFeedbackTasks,
} from '../../openspec/governance/finalize-change-archive.mjs';

const ROOT = '/tmp/change-feedback-finalizer';
const CHANGE = 'demo-change';
const CHANGE_ROOT = `${ROOT}/openspec/changes/${CHANGE}`;
const TASK_PATH = `${CHANGE_ROOT}/tasks.md`;
const ARCHIVE_PATH = `${ROOT}/openspec/changes/archive/2026-07-31-${CHANGE}`;

function statusJson(options = {}) {
  return JSON.stringify({
    changeName: CHANGE,
    planningHome: { root: ROOT, changesDir: `${ROOT}/openspec/changes` },
    changeRoot: CHANGE_ROOT,
    artifacts: options.artifacts ?? [
      { id: 'proposal', status: 'done' },
      { id: 'specs', status: 'done' },
      { id: 'design', status: 'done' },
      { id: 'tasks', status: 'done' },
    ],
    artifactPaths: { tasks: { resolvedOutputPath: TASK_PATH } },
  });
}

function completeTasks(extra = '') {
  return [
    `- [x] 0.1 Plan review (${FEEDBACK_MARKERS.plan}).`,
    '- [x] 1.1 Implement the deterministic contract.',
    `- [x] 2.1 Closeout review (${FEEDBACK_MARKERS.closeout}).`,
    extra,
  ].filter(Boolean).join('\n');
}

function fakeFs(tasks, options = {}) {
  return {
    readFile(path) {
      assert.equal(path, TASK_PATH);
      return tasks;
    },
    exists(path) {
      if (path === CHANGE_ROOT) return options.activeExists ?? true;
      if (path === ARCHIVE_PATH || path === `${ROOT}/openspec/changes/archive`) return options.archiveExists ?? false;
      return false;
    },
    isDirectory(path) {
      return path === ARCHIVE_PATH && (options.archiveDirectory ?? false);
    },
  };
}

function runner({ failAt, nativeOutput, statusOutput } = {}) {
  const calls = [];
  return {
    calls,
    run(command, args) {
      calls.push({ command, args });
      if (command === 'openspec' && args[0] === 'status') {
        return failAt === 'status'
          ? { status: 1, stdout: '', stderr: 'status failure' }
          : { status: 0, stdout: statusOutput ?? statusJson(), stderr: '' };
      }
      if (command === 'openspec' && args[0] === 'validate') {
        return failAt === 'validate' ? { status: 1, stdout: '', stderr: 'strict failure' } : { status: 0, stdout: 'valid', stderr: '' };
      }
      if (command === process.execPath && args[0].endsWith('check-project-reqs.mjs')) {
        return failAt === 'reqs' ? { status: 1, stdout: '', stderr: 'requirement failure' } : { status: 0, stdout: 'ok', stderr: '' };
      }
      if (command === process.execPath && args[0].endsWith('check-project-specs.mjs')) {
        return failAt === 'specs' ? { status: 1, stdout: '', stderr: 'main spec failure' } : { status: 0, stdout: 'ok', stderr: '' };
      }
      if (command === process.execPath && args[0].endsWith('check-verification-routing.mjs')) {
        return failAt === 'routing' ? { status: 1, stdout: '', stderr: 'routing failure' } : { status: 0, stdout: 'ok', stderr: '' };
      }
      if (command === 'openspec' && args[0] === 'archive') {
        return {
          status: failAt === 'archive' ? 1 : 0,
          stdout: nativeOutput ?? JSON.stringify({
            archive: {
              change: CHANGE,
              archivedAs: `2026-07-31-${CHANGE}`,
              path: ARCHIVE_PATH,
              specsUpdated: false,
            },
          }),
          stderr: failAt === 'archive' ? 'native archive failure' : '',
        };
      }
      throw new Error(`unexpected command: ${command} ${args.join(' ')}`);
    },
  };
}

describe('change feedback archive finalizer', () => {
  it('recognizes only same-line checkbox markers and preserves ordinary pending work', () => {
    const parsed = parseFeedbackTasks([
      `Prose mentions ${FEEDBACK_MARKERS.plan} but is not a task.`,
      '- [x] 0.1 Plan review.',
      `  (${FEEDBACK_MARKERS.plan}) on a continuation line is not a marker task.`,
      `- [x] 0.2 Valid plan marker (${FEEDBACK_MARKERS.plan}).`,
      `- [x] 1.1 Valid closeout marker (${FEEDBACK_MARKERS.closeout}).`,
      '- [ ] 1.2 Repair direct fact.',
    ].join('\n'));

    assert.equal(parsed.markers.plan.length, 1);
    assert.equal(parsed.markers.closeout.length, 1);
    assert.deepEqual(parsed.pending.map((task) => task.text), ['1.2 Repair direct fact.']);
  });

  it('distinguishes missing, duplicate, pending, and completed marker task lines', async () => {
    const missing = parseFeedbackTasks('- [x] 1.1 Normal work.');
    assert.equal(missing.markers.plan.length, 0);
    assert.equal(missing.markers.closeout.length, 0);

    const duplicate = parseFeedbackTasks([
      `- [x] 0.1 Plan review (${FEEDBACK_MARKERS.plan}).`,
      `- [x] 0.2 Repeated plan review (${FEEDBACK_MARKERS.plan}).`,
      `- [x] 1.1 Closeout review (${FEEDBACK_MARKERS.closeout}).`,
    ].join('\n'));
    assert.equal(duplicate.markers.plan.length, 2);

    const pending = parseFeedbackTasks([
      `- [ ] 0.1 Plan review (${FEEDBACK_MARKERS.plan}).`,
      `- [x] 1.1 Closeout review (${FEEDBACK_MARKERS.closeout}).`,
    ].join('\n'));
    assert.equal(pending.markers.plan[0].state, 'pending');

    const complete = parseFeedbackTasks(completeTasks());
    assert.equal(complete.markers.plan[0].state, 'complete');
    assert.equal(complete.markers.closeout[0].state, 'complete');

    for (const [tasks, code] of [
      ['- [x] 1.1 Normal work.', 'review_marker_invalid'],
      [[
        `- [x] 0.1 Plan review (${FEEDBACK_MARKERS.plan}).`,
        `- [x] 0.2 Duplicate plan review (${FEEDBACK_MARKERS.plan}).`,
        `- [x] 1.1 Closeout review (${FEEDBACK_MARKERS.closeout}).`,
      ].join('\n'), 'review_marker_invalid'],
      [[
        `- [ ] 0.1 Plan review (${FEEDBACK_MARKERS.plan}).`,
        `- [x] 1.1 Closeout review (${FEEDBACK_MARKERS.closeout}).`,
      ].join('\n'), 'review_marker_unmet'],
    ]) {
      const commands = runner();
      const result = await finalizeChangeArchive({
        change: CHANGE,
        projectRoot: ROOT,
        runCommand: commands.run,
        fsApi: fakeFs(tasks),
      });
      assert.equal(result.root.code, code);
      assert.deepEqual(commands.calls.map((call) => call.args[0]), ['status']);
    }
  });

  it('short-circuits status, artifact, and task-file roots before validation', async () => {
    const status = runner({ failAt: 'status' });
    const statusResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: status.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(statusResult.root.code, 'status_resolution_failed');
    assert.deepEqual(status.calls.map((call) => call.args[0]), ['status']);

    const artifacts = runner({ statusOutput: statusJson({
      artifacts: [{ id: 'proposal', status: 'in_progress' }],
    }) });
    const artifactResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: artifacts.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(artifactResult.root.code, 'artifact_incomplete');
    assert.deepEqual(artifacts.calls.map((call) => call.args[0]), ['status']);

    const taskFile = runner();
    const taskFileResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: taskFile.run,
      fsApi: {
        ...fakeFs(completeTasks()),
        readFile() { throw new Error('read denied'); },
      },
    });
    assert.equal(taskFileResult.root.code, 'task_file_unavailable');
    assert.deepEqual(taskFile.calls.map((call) => call.args[0]), ['status']);
  });

  it('returns the earliest task root before validation or governance commands', async () => {
    const commands = runner();
    const result = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: commands.run,
      fsApi: fakeFs(completeTasks('- [ ] 3.1 Pending repair.')),
    });

    assert.equal(result.outcome, 'blocked');
    assert.equal(result.root.code, 'task_incomplete');
    assert.equal(result.root.owner, 'openspec/changes/demo-change/tasks.md');
    assert.deepEqual(commands.calls.map((call) => call.args[0]), ['status']);
    assert.equal(FinalizationResultSchema.safeParse(result).success, true);
  });

  it('short-circuits each governance check in order', async () => {
    const strict = runner({ failAt: 'validate' });
    const strictResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: strict.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(strictResult.root.code, 'strict_validation_failed');
    assert.deepEqual(strict.calls.map((call) => call.args[0]), ['status', 'validate']);

    const requirements = runner({ failAt: 'reqs' });
    const requirementsResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: requirements.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(requirementsResult.root.code, 'requirement_governance_failed');
    assert.deepEqual(requirements.calls.map((call) => call.args[0]), ['status', 'validate', requirements.calls[2].args[0]]);
    assert.match(requirements.calls[2].args[0], /check-project-reqs\.mjs$/);

    const mainSpecs = runner({ failAt: 'specs' });
    const mainSpecsResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: mainSpecs.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(mainSpecsResult.root.code, 'main_spec_governance_failed');
    assert.equal(mainSpecs.calls.length, 4);
    assert.match(mainSpecs.calls.at(-1).args[0], /check-project-specs\.mjs$/);
    assert.doesNotMatch(mainSpecs.calls.map((call) => call.args.join(' ')).join('\n'), /check-verification-routing\.mjs|archive/);

    const routing = runner({ failAt: 'routing' });
    const routingResult = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: routing.run,
      fsApi: fakeFs(completeTasks()),
    });
    assert.equal(routingResult.root.code, 'verification_routing_failed');
    assert.equal(routing.calls.length, 5);
    assert.match(routing.calls.at(-1).args[0], /check-verification-routing\.mjs$/);
    assert.doesNotMatch(routing.calls.map((call) => call.args.join(' ')).join('\n'), /archive/);
  });

  it('reports invalid native output without inventing archive success', async () => {
    const commands = runner({ nativeOutput: 'not-json' });
    const result = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: commands.run,
      fsApi: fakeFs(completeTasks(), { activeExists: true, archiveExists: false }),
    });

    assert.equal(result.outcome, 'blocked');
    assert.equal(result.root.code, 'native_archive_invalid');
    assert.equal(commands.calls.at(-1).args.join(' '), `archive ${CHANGE} --json --skip-specs`);
  });

  it('reports a nonzero native archive exit without a fallback move', async () => {
    const commands = runner({ failAt: 'archive' });
    const result = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: commands.run,
      fsApi: fakeFs(completeTasks()),
    });

    assert.equal(result.outcome, 'blocked');
    assert.equal(result.root.code, 'native_archive_failed');
    assert.equal(commands.calls.at(-1).args.join(' '), `archive ${CHANGE} --json --skip-specs`);
  });

  it('returns archived only for a matching native move result', async () => {
    const commands = runner();
    const result = await finalizeChangeArchive({
      change: CHANGE,
      projectRoot: ROOT,
      runCommand: commands.run,
      fsApi: fakeFs(completeTasks(), { activeExists: false, archiveExists: true, archiveDirectory: true }),
    });

    assert.equal(result.outcome, 'archived');
    assert.equal(result.archive.path, ARCHIVE_PATH);
    assert.equal(result.archive.specs_updated, false);
    assert.equal(commands.calls.at(-1).args.join(' '), `archive ${CHANGE} --json --skip-specs`);
    assert.equal(FinalizationResultSchema.safeParse(result).success, true);
  });

  it('rejects malformed finalizer results instead of accepting partial feedback', () => {
    assert.equal(FinalizationResultSchema.safeParse({
      schema_version: 'change-feedback-finalizer/v1',
      change: CHANGE,
      outcome: 'blocked',
      root: {
        code: 'task_incomplete',
        observed: 'pending task',
        owner: 'tasks.md',
      },
      checks: [],
    }).success, false);
  });
});
