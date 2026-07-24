// @impl PRP-002, PRP-005
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function searchResult(links = [
  { title: 'Example', url: RESULT_URL },
  { title: 'Other', url: OTHER_URL },
]) {
  return `Web search results for query: "neutral capability probe"\n\nLinks: ${JSON.stringify([
    ...links,
  ])}`;
}

function transcript({ nativeSuccess = false, curlCommand = CURL_COMMAND, curlContent = '<html><body>Example research access</body></html>', curlError = false, duplicate = false } = {}) {
  const rows = [
    toolUse('search-1', 'WebSearch', { query: 'neutral capability probe' }),
    toolResult('search-1', searchResult()),
    toolUse('native-1', 'WebFetch', { url: RESULT_URL, prompt: 'Return the requested page content.' }),
    toolResult('native-1', nativeSuccess ? '<html><body>Native page</body></html>' : 'Unable to verify if domain is safe to fetch.', !nativeSuccess),
  ];
  if (!nativeSuccess && curlCommand !== null) {
    rows.push(toolUse('curl-1', 'Bash', { command: curlCommand, description: 'Run the bounded same-URL fallback' }));
    rows.push(toolResult('curl-1', curlContent, curlError));
  }
  if (duplicate) rows.splice(1, 0, rows[0], rows[0]);
  return rows;
}

function availableAccess(fetchSurface = 'curl', { resultUrl = RESULT_URL, count = 1 } = {}) {
  return {
    status: 'available',
    probed_at: '2026-07-21T00:00:00.000Z',
    result_url: resultUrl,
    fetch_outcome: 'success',
    search_surface: 'WebSearch',
    fetch_surface: fetchSurface,
    eligible_candidate_count: count,
    final_candidate_ordinal: count,
  };
}

function unavailableAccess({ resultUrl = RESULT_URL, count = 1 } = {}) {
  return {
    status: 'unavailable',
    probed_at: '2026-07-21T00:00:00.000Z',
    result_url: resultUrl,
    fetch_outcome: 'failed',
    reason: 'WebFetch was blocked and the exact curl fallback failed.',
    search_surface: 'WebSearch',
    fetch_surface: 'curl',
    eligible_candidate_count: count,
    final_candidate_ordinal: count,
  };
}

function unavailableSearchAccess(reason = 'Search returned no eligible HTTP(S) result.') {
  return {
    status: 'unavailable',
    probed_at: '2026-07-21T00:00:00.000Z',
    fetch_outcome: 'not_attempted',
    reason,
    search_surface: 'WebSearch',
    eligible_candidate_count: 0,
  };
}

function createCase({ events, access, gatePassed, setupLoaded = gatePassed }) {
  const bundle = mkdtempSync(join(tmpdir(), 'hitl1-fallback-observer-'));
  for (const path of ['reference', '_cache', 'artifacts', '_work_units']) mkdirSync(join(bundle, path));
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({ research_access: access }));
  const trace = [
    { ts: '2026-07-21T00:00:01.000Z', event: 'gate_attempt', gate: 'hitl1-recorded', passed: gatePassed },
  ];
  if (setupLoaded) trace.push({ ts: '2026-07-21T00:00:02.000Z', event: 'load_complete', entry: 'phases/phase-setup.md', handoff_source_gate: 'hitl1-recorded' });
  writeFileSync(join(bundle, 'rb_trace.jsonl'), `${trace.map(JSON.stringify).join('\n')}\n`);
  const transcriptPath = join(bundle, 'case-115-subject-transcript.jsonl');
  writeFileSync(transcriptPath, `${events.map(JSON.stringify).join('\n')}\n`);
  return { bundle, transcriptPath };
}

function runObserver(caseRoot) {
  return spawnSync(process.execPath, [OBSERVER, '115', 'verdict', '--bundle', caseRoot.bundle, '--transcript', caseRoot.transcriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function checks(bundle) {
  return readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse)
    .filter((event) => event.event === 'check' && event.source === 'playbook');
}

function checkFor(bundle, gate) {
  return checks(bundle).filter((event) => event.gate === gate).at(-1);
}

function remove(caseRoot) {
  rmSync(caseRoot.bundle, { recursive: true, force: true });
}

describe('case-115 HITL1 fallback observer', () => {
  it('binds the existing manifest case, Subject runner, and shared observer', () => {
    const playbook = readFileSync(join(ROOT, PLAYBOOK), 'utf8');
    const runner = readFileSync(join(ROOT, RUNNER), 'utf8');
    const manifest = readFileSync(join(ROOT, MANIFEST), 'utf8');
    const observer = readFileSync(join(ROOT, OBSERVER), 'utf8');
    assert.match(manifest, /case-115-heavy-hitl1-research-access-probe\.md/);
    assert.match(runner, /'115':\s*\{/);
    assert.match(runner, /WebFetch,WebSearch/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 hash/);
    assert.match(playbook, /observe-iterative-interaction-case\.mjs 115 verdict/);
    assert.match(playbook, /case-115-NOT-RUN\.json/);
    assert.match(playbook, /at most the first three syntactically eligible actual HTTP\(S\) results/);
    assert.match(runner, /at most the first three actual eligible HTTP\(S\) results/);
    assert.match(observer, /'115'/);
  });

  it('deduplicates stable tool IDs and records the applicable fallback PASS', () => {
    const caseRoot = createCase({ events: transcript({ duplicate: true }), access: availableAccess(), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'probe-evidence-boundary')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('keeps native success general and omits the optional fallback check', () => {
    const caseRoot = createCase({ events: transcript({ nativeSuccess: true }), access: availableAccess('WebFetch'), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback'), undefined);
    } finally { remove(caseRoot); }
  });

  it('keeps an exact curl error on the honest unavailable branch without an optional check', () => {
    const caseRoot = createCase({ events: transcript({ curlContent: 'Exit code 28', curlError: true }), access: unavailableAccess(), gatePassed: false });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback'), undefined);
    } finally { remove(caseRoot); }
  });

  it('treats a public empty Links result as an honest general unavailable branch', () => {
    const events = [
      toolUse('search-1', 'WebSearch', { query: 'neutral capability probe' }),
      toolResult('search-1', 'Web search results\n\nLinks: []'),
    ];
    const caseRoot = createCase({ events, access: unavailableSearchAccess(), gatePassed: false });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback'), undefined);
    } finally { remove(caseRoot); }
  });

  it('allows an observed second candidate after the first candidate cannot return real content', () => {
    const events = [
      toolUse('search-1', 'WebSearch', { query: 'neutral capability probe' }),
      toolResult('search-1', `Web search results\n\nLinks: ${JSON.stringify([
        { title: 'First', url: RESULT_URL },
        { title: 'Other', url: OTHER_URL },
      ])}`),
      toolUse('native-1', 'WebFetch', { url: RESULT_URL, prompt: 'Return the requested page content.' }),
      toolResult('native-1', 'Unable to verify if domain is safe to fetch.', true),
      toolUse('native-2', 'WebFetch', { url: OTHER_URL, prompt: 'Return the requested page content.' }),
      toolResult('native-2', '<html><body>Second candidate page</body></html>'),
    ];
    const caseRoot = createCase({ events, access: availableAccess('WebFetch', { resultUrl: OTHER_URL, count: 2 }), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback'), undefined);
    } finally { remove(caseRoot); }
  });

  it('does not mistake an eligible domain prefix for a literal private IPv6 target', () => {
    const url = 'https://fda.gov/research';
    const events = [
      toolUse('search-1', 'WebSearch', { query: 'neutral capability probe' }),
      toolResult('search-1', `Web search results\n\nLinks: ${JSON.stringify([{ title: 'FDA', url }])}`),
      toolUse('native-1', 'WebFetch', { url, prompt: 'Return the requested page content.' }),
      toolResult('native-1', '<html><body>Public page</body></html>'),
    ];
    const access = availableAccess('WebFetch', { resultUrl: url });
    const caseRoot = createCase({ events, access, gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-research-access-probe')?.passed, true);
    } finally { remove(caseRoot); }
  });

  it('records a failed optional check for an observed wrong-URL curl command', () => {
    const wrongCommand = CURL_COMMAND.replace(RESULT_URL, OTHER_URL);
    const caseRoot = createCase({ events: transcript({ curlCommand: wrongCommand }), access: availableAccess(), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback')?.passed, false);
    } finally { remove(caseRoot); }
  });

  it('records a failed optional check when successful curl facts disagree with the profile', () => {
    const caseRoot = createCase({ events: transcript(), access: availableAccess('WebFetch'), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(checkFor(caseRoot.bundle, 'hitl1-native-to-curl-fallback')?.passed, false);
    } finally { remove(caseRoot); }
  });

  it('uses the existing exit-3 NOT RUN artifact for conflicting public event identities', () => {
    const events = transcript();
    events.splice(1, 0, toolUse('search-1', 'WebSearch', { query: 'conflicting query' }));
    const caseRoot = createCase({ events, access: availableAccess(), gatePassed: true });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 3, result.stderr || result.stdout);
      const notRun = JSON.parse(readFileSync(join(caseRoot.bundle, 'case-115-NOT-RUN.json'), 'utf8'));
      assert.equal(notRun.status, 'NOT RUN');
      assert.match(notRun.reason, /conflict|ambiguous|identity/i);
      assert.equal(checks(caseRoot.bundle).length, 0);
    } finally { remove(caseRoot); }
  });

  it('uses the existing exit-3 NOT RUN artifact when current candidate metadata contradicts public candidates', () => {
    const caseRoot = createCase({
      events: transcript({ nativeSuccess: true }),
      access: availableAccess('WebFetch', { resultUrl: OTHER_URL, count: 2 }),
      gatePassed: true,
    });
    try {
      const result = runObserver(caseRoot);
      assert.equal(result.status, 3, result.stderr || result.stdout);
      const notRun = JSON.parse(readFileSync(join(caseRoot.bundle, 'case-115-NOT-RUN.json'), 'utf8'));
      assert.equal(notRun.status, 'NOT RUN');
      assert.match(notRun.reason, /candidate metadata|candidate order/i);
      assert.equal(checks(caseRoot.bundle).length, 0);
    } finally { remove(caseRoot); }
  });
});
