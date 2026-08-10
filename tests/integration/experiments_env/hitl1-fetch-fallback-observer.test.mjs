// @impl PRP-002, PRP-005, REA-002, REA-003
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
const RESULT_URL = 'https://example.com/research-access';
const OTHER_URL = 'https://example.net/second-candidate';
const QUERY = 'site:wikipedia.org "Internet protocol suite"';
const CURL_COMMAND = `curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '${RESULT_URL}'`;

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

function searchResult(links = [
  { title: 'Example', url: RESULT_URL },
  { title: 'Other', url: OTHER_URL },
]) {
  return `Web search results for query: "${QUERY}"\n\nLinks: ${JSON.stringify(links)}`;
}

function probeEvents({ nativeSuccess = false, curlCommand = CURL_COMMAND, curlContent = '<html><body>Example research access</body></html>', curlError = false } = {}) {
  const rows = [
    toolUse('search-1', 'WebSearch', { query: QUERY }),
    toolResult('search-1', searchResult()),
    toolUse('native-1', 'WebFetch', { url: RESULT_URL, prompt: 'Return the requested page content.' }),
    toolResult('native-1', nativeSuccess ? '<html><body>Native page</body></html>' : 'Unable to verify if domain is safe to fetch.', !nativeSuccess),
  ];
  if (!nativeSuccess && curlCommand !== null) {
    rows.push(toolUse('curl-1', 'Bash', { command: curlCommand, description: 'Run the bounded same-URL fallback' }));
    rows.push(toolResult('curl-1', curlContent, curlError));
  }
  return rows;
}

function availableAccess(fetchSurface = 'curl', { resultUrl = RESULT_URL, count = 1 } = {}) {
  return {
    status: 'available',
    probed_at: '2026-08-10T00:00:00.000Z',
    result_url: resultUrl,
    fetch_outcome: 'success',
    search_surface: 'WebSearch',
    fetch_surface: fetchSurface,
    eligible_candidate_count: count,
    final_candidate_ordinal: count,
  };
}

function unavailableAccess({ resultUrl = RESULT_URL, count = 1, outcome = 'failed', fetchSurface = 'curl' } = {}) {
  return {
    status: 'unavailable',
    probed_at: '2026-08-10T00:00:00.000Z',
    result_url: resultUrl,
    fetch_outcome: outcome,
    reason: 'The current candidate could not return real requested page content.',
    search_surface: 'WebSearch',
    ...(fetchSurface ? { fetch_surface: fetchSurface } : {}),
    eligible_candidate_count: count,
    final_candidate_ordinal: count,
  };
}

function unavailableSearchAccess(reason = 'Search returned no eligible HTTP(S) result.') {
  return {
    status: 'unavailable',
    probed_at: '2026-08-10T00:00:00.000Z',
    fetch_outcome: 'not_attempted',
    reason,
    search_surface: 'WebSearch',
    eligible_candidate_count: 0,
  };
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

describe('case-115 isolated HITL1 probe observer', () => {
  it('binds the existing manifest case to an isolated runner and final-return observer', () => {
    const playbook = readFileSync(join(ROOT, PLAYBOOK), 'utf8');
    const runner = readFileSync(join(ROOT, RUNNER), 'utf8');
    const manifest = readFileSync(join(ROOT, MANIFEST), 'utf8');
    const observer = readFileSync(join(ROOT, OBSERVER), 'utf8');
    assert.match(manifest, /case-115-heavy-hitl1-research-access-probe\.md/);
    assert.match(runner, /surface: 'isolated_hitl1_capability_probe'/);
    assert.match(runner, /tools: 'Bash,WebFetch,WebSearch'/);
    assert.match(runner, /does not provide a bundle path or any filesystem obligation/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 hash/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 verdict/);
    assert.match(playbook, /case-115-NOT-RUN\.json/);
    assert.match(observer, /parseCase115Return/);
    assert.match(observer, /no profile write or Gate execution/);
  });

  it('accepts a retained public native-failure same-URL fallback and compact available return', () => {
    const caseRoot = createCase({ events: probeEvents(), access: availableAccess() });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'probe-evidence-boundary')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('accepts a native available return without claiming a Phase write or Gate attempt', () => {
    const caseRoot = createCase({ events: probeEvents({ nativeSuccess: true }), access: availableAccess('WebFetch') });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback'), undefined);
      assert.equal(readFileSync(join(caseRoot.bundle, 'rb_trace.jsonl'), 'utf8').includes('gate_attempt'), false);
    } finally { remove(caseRoot); }
  });

  it('accepts the permitted same-URL fallback when native fetch is absent before invocation', () => {
    const events = [
      toolUse('search-1', 'WebSearch', { query: QUERY }),
      toolResult('search-1', searchResult()),
      toolUse('curl-1', 'Bash', { command: CURL_COMMAND, description: 'Run the bounded same-URL fallback' }),
      toolResult('curl-1', '<html><body>Fallback page</body></html>'),
    ];
    const caseRoot = createCase({ events, access: availableAccess('curl') });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('accepts an honest unavailable fallback return', () => {
    const caseRoot = createCase({
      events: probeEvents({ curlContent: 'Exit code 28', curlError: true }),
      access: unavailableAccess(),
    });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('accepts an honest no-candidate return without a fetch event', () => {
    const events = [
      toolUse('search-1', 'WebSearch', { query: QUERY }),
      toolResult('search-1', 'Web search results\n\nLinks: []'),
    ];
    const caseRoot = createCase({ events, access: unavailableSearchAccess() });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('allows a second candidate only after the first exact fallback cannot return content', () => {
    const firstCurl = CURL_COMMAND;
    const events = [
      toolUse('search-1', 'WebSearch', { query: QUERY }),
      toolResult('search-1', searchResult()),
      toolUse('native-1', 'WebFetch', { url: RESULT_URL, prompt: 'Return the requested page content.' }),
      toolResult('native-1', 'Unable to fetch.', true),
      toolUse('curl-1', 'Bash', { command: firstCurl }),
      toolResult('curl-1', 'Exit code 28', true),
      toolUse('native-2', 'WebFetch', { url: OTHER_URL, prompt: 'Return the requested page content.' }),
      toolResult('native-2', '<html><body>Second candidate page</body></html>'),
    ];
    const caseRoot = createCase({ events, access: availableAccess('WebFetch', { resultUrl: OTHER_URL, count: 2 }) });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN when the final compact return is absent', () => {
    const caseRoot = createCase({ events: probeEvents({ nativeSuccess: true }), access: availableAccess('WebFetch'), includeReturn: false });
    try { expectNotRun(caseRoot, /exactly one final Subject result|compact YAML return/i); } finally { remove(caseRoot); }
  });

  it('uses NOT_RUN when the public search query or return target contradicts the fixed sequence', () => {
    const wrongQuery = probeEvents({ nativeSuccess: true });
    wrongQuery[0] = toolUse('search-1', 'WebSearch', { query: 'other query' });
    const queryCase = createCase({ events: wrongQuery, access: availableAccess('WebFetch') });
    const wrongTarget = createCase({ events: probeEvents({ nativeSuccess: true }), access: availableAccess('WebFetch', { resultUrl: OTHER_URL }) });
    try {
      expectNotRun(queryCase, /fixed neutral capability query/i);
      expectNotRun(wrongTarget, /candidate metadata|candidate order/i);
    } finally {
      remove(queryCase);
      remove(wrongTarget);
    }
  });

  it('uses NOT_RUN for an unauthorized public tool or wrong-URL curl fallback', () => {
    const unauthorized = [...probeEvents({ nativeSuccess: true }), toolUse('write-1', 'Write', { file_path: 'rb_profile.yaml', content: 'bad' })];
    const unauthorizedCase = createCase({ events: unauthorized, access: availableAccess('WebFetch') });
    const wrongCurl = CURL_COMMAND.replace(RESULT_URL, OTHER_URL);
    const curlCase = createCase({ events: probeEvents({ curlCommand: wrongCurl }), access: availableAccess() });
    try {
      expectNotRun(unauthorizedCase, /unauthorized public tool/i);
      expectNotRun(curlCase, /same-URL/i);
    } finally {
      remove(unauthorizedCase);
      remove(curlCase);
    }
  });
});
