// @impl REA-002, REA-003, PRP-002, PRP-005
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { stringify as stringifyYaml } from 'yaml';

const ROOT = process.cwd();
const OBSERVER = 'experiments_env/shared/observe-iterative-interaction-case.mjs';
const PLAYBOOK = 'experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md';
const RUNNER = 'experiments_env/shared/run-iterative-interaction-subject.mjs';
const MANIFEST = 'experiments_playbook/PLAYBOOK_MANIFEST.md';

const FIXED_SAMPLES = [
  { sample_id: 'gov_cn', group: 'china', url: 'https://www.gov.cn/' },
  { sample_id: 'gitee', group: 'china', url: 'https://gitee.com/' },
  { sample_id: 'xinhuanet', group: 'china', url: 'https://www.news.cn/' },
  { sample_id: 'cnki_catalog', group: 'china', url: 'https://www.cnki.net/' },
  { sample_id: 'wikipedia', group: 'overseas', url: 'https://www.wikipedia.org/' },
  { sample_id: 'github', group: 'overseas', url: 'https://github.com/' },
  { sample_id: 'iana', group: 'overseas', url: 'https://www.iana.org/domains/reserved' },
  { sample_id: 'arxiv', group: 'overseas', url: 'https://arxiv.org/' },
  { sample_id: 'rfc_editor', group: 'overseas', url: 'https://www.rfc-editor.org/' },
];

function message(role, content) {
  return { type: role, message: { role, content: [content] } };
}

function toolUse(id, name, input) {
  return message('assistant', { type: 'tool_use', id, name, input });
}

function toolResult(id, content, isError = false) {
  return message('user', { type: 'tool_result', tool_use_id: id, content, is_error: isError });
}

function resultEvent(access) {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: stringifyYaml({ research_access: access }),
  };
}

function fetchEvents({ withCurl = false } = {}) {
  const rows = [];
  for (const [index, sample] of FIXED_SAMPLES.entries()) {
    const use = toolUse(`fetch-${index}`, 'WebFetch', { url: sample.url, prompt: 'Return the requested page content.' });
    rows.push(use);
    rows.push(toolResult(`fetch-${index}`, '<html><body>Public sample page</body></html>'));
    if (withCurl && index === 0) {
      rows.push(toolUse(`curl-0`, 'Bash', { command: `curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '${sample.url}'` }));
      rows.push(toolResult(`curl-0`, '<html><body>Reserve sample page</body></html>'));
    }
  }
  return rows;
}

function directObservation({ available = true, noRequest = false } = {}) {
  const observations = FIXED_SAMPLES.map((sample) => {
    const entry = { sample_id: sample.sample_id, source_group: sample.group };
    if (noRequest) {
      entry.outcome = 'not_attempted';
    } else if (available) {
      entry.outcome = 'content';
      entry.retrieval_surface = 'native';
    } else {
      entry.outcome = 'transport_inconclusive';
    }
    return entry;
  });
  const access = {
    status: noRequest ? 'unavailable' : available ? 'available' : 'unavailable',
    probed_at: '2026-08-10T00:00:00.000Z',
    sample_observations: observations,
  };
  if (!available || noRequest) access.reason = noRequest ? 'Relay failed before any page request.' : 'No core sample returned real content this round.';
  return access;
}

function createCase({ events, access, includeReturn = true }) {
  const bundle = mkdtempSync(join(tmpdir(), 'hitl1-isolated-probe-observer-'));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  const transcriptPath = join(bundle, 'case-115-subject-transcript.jsonl');
  const allEvents = includeReturn ? [...events, resultEvent(access)] : events;
  writeFileSync(transcriptPath, `${allEvents.map(JSON.stringify).join('\n')}\n`);
  return { bundle, transcriptPath };
}

function runObserver(caseRoot) {
  return spawnSync(process.execPath, [OBSERVER, '115', 'verdict', '--bundle', caseRoot.bundle, '--transcript', caseRoot.transcriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function checks(bundle) {
  const text = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim();
  return text ? text.split(/\r?\n/).map(JSON.parse).filter((event) => event.event === 'check' && event.source === 'playbook') : [];
}

function checkFor(bundle, gate) {
  return checks(bundle).filter((event) => event.gate === gate).at(-1);
}

function expectNotRun(caseRoot, expression) {
  const result = runObserver(caseRoot);
  assert.equal(result.status, 3, result.stderr || result.stdout);
  const notRun = JSON.parse(readFileSync(join(caseRoot.bundle, 'case-115-NOT-RUN.json'), 'utf8'));
  assert.equal(notRun.status, 'NOT RUN');
  assert.match(notRun.reason, expression);
  assert.equal(checks(caseRoot.bundle).length, 0);
}

function remove(caseRoot) {
  rmSync(caseRoot.bundle, { recursive: true, force: true });
}

describe('case-115 isolated HITL1 direct-sample probe observer', () => {
  it('binds the existing manifest case to an isolated direct-sample runner and observer', () => {
    const playbook = readFileSync(join(ROOT, PLAYBOOK), 'utf8');
    const runner = readFileSync(join(ROOT, RUNNER), 'utf8');
    const manifest = readFileSync(join(ROOT, MANIFEST), 'utf8');
    const observer = readFileSync(join(ROOT, OBSERVER), 'utf8');
    assert.match(manifest, /case-115-heavy-hitl1-research-access-probe\.md/);
    assert.match(runner, /surface: 'isolated_hitl1_capability_probe'/);
    assert.match(runner, /tools: 'Bash,WebFetch'/);
    assert.match(runner, /does not provide a bundle path or any filesystem obligation/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 hash/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 verdict/);
    assert.match(playbook, /case-115-NOT-RUN\.json/);
    assert.match(observer, /parseCase115Return/);
    assert.match(observer, /no profile write or Gate execution/);
    assert.match(playbook, /fixed direct-sample suite/);
    assert.doesNotMatch(playbook, /one literal neutral `WebSearch`/);
  });

  it('accepts a retained fixed direct-sample available return over both groups', () => {
    const caseRoot = createCase({ events: fetchEvents(), access: directObservation({ available: true }) });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'probe-evidence-boundary')?.passed, true);
      assert.equal(readFileSync(join(caseRoot.bundle, 'rb_trace.jsonl'), 'utf8').includes('gate_attempt'), false);
    } finally { remove(caseRoot); }
  });

  it('accepts an honest unavailable direct-sample return without a Phase write or Gate attempt', () => {
    const caseRoot = createCase({ events: fetchEvents(), access: directObservation({ available: false }) });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'probe-evidence-boundary')?.passed, true);
      assert.equal(readFileSync(join(caseRoot.bundle, 'rb_trace.jsonl'), 'utf8').includes('gate_attempt'), false);
    } finally { remove(caseRoot); }
  });

  it('accepts an honest whole no-request relay return with no retrieval events', () => {
    const caseRoot = createCase({ events: [], access: directObservation({ noRequest: true }) });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN when the final compact return is absent', () => {
    const caseRoot = createCase({ events: fetchEvents(), access: directObservation({ available: true }), includeReturn: false });
    try { expectNotRun(caseRoot, /exactly one final Subject result|compact YAML return/i); } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN when the probe omits one declared source group (short-circuit)', () => {
    const overseasOnly = fetchEvents().filter((event) => {
      const input = event.message?.content?.[0];
      if (input?.type !== 'tool_use') return true;
      return input.name !== 'WebFetch' || FIXED_SAMPLES.find((sample) => sample.url === input.input.url)?.group !== 'china';
    });
    const caseRoot = createCase({ events: overseasOnly, access: directObservation({ available: true }) });
    try { expectNotRun(caseRoot, /did not observe both declared source groups/i); } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN when the probe returns content without a public direct retrieval event', () => {
    const access = directObservation({ available: true });
    access.sample_observations[0].outcome = 'content';
    access.sample_observations[0].retrieval_surface = 'native';
    const caseRoot = createCase({ events: fetchEvents().slice(2), access });
    try { expectNotRun(caseRoot, /without a public retrieval event|without a public direct retrieval|did not observe both declared source groups/i); } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN for an unauthorized public tool or a non-declared sample URL', () => {
    const unauthorized = [...fetchEvents(), toolUse('search-1', 'WebSearch', { query: 'other query' }), toolResult('search-1', 'links')];
    const unauthorizedCase = createCase({ events: unauthorized, access: directObservation({ available: true }) });
    const wrongUrl = fetchEvents();
    wrongUrl[0] = toolUse('fetch-0', 'WebFetch', { url: 'https://example.com/not-declared' });
    wrongUrl[1] = toolResult('fetch-0', '<html><body>x</body></html>');
    const urlCase = createCase({ events: wrongUrl, access: directObservation({ available: true }) });
    try {
      expectNotRun(unauthorizedCase, /unauthorized public tool/i);
      expectNotRun(urlCase, /outside the fixed declared sample suite/i);
    } finally {
      remove(unauthorizedCase);
      remove(urlCase);
    }
  });
});
