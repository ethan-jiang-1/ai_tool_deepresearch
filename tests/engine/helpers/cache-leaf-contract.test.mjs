import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_BASE_LEAF_FILES,
  CACHE_SOURCE_MAPPING_FIELDS,
  CacheLeafMetaSchema,
  inspectCacheLeaf,
  resolveCacheLeafContract,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs';

describe('cache leaf contract projection', () => {
  it('keeps canonical base files while adding assigned sidecars', () => {
    assert.deepEqual(resolveCacheLeafContract(), CACHE_BASE_LEAF_FILES);
    assert.deepEqual(
      resolveCacheLeafContract({ leaf_files: ['snapshot.json', 'page.md'] }),
      [...CACHE_BASE_LEAF_FILES, 'snapshot.json'],
    );
  });

  it('accepts each canonical source-mapping field', () => {
    for (const field of CACHE_SOURCE_MAPPING_FIELDS) {
      assert.equal(CacheLeafMetaSchema.safeParse({ [field]: field === 'source_slug' ? 'source-a' : 'https://example.com/a' }).success, true, field);
    }
    assert.equal(CacheLeafMetaSchema.safeParse({ title: 'no mapping' }).success, false);
  });

  it('rejects placeholder-only pages unless degraded capture is explicit', () => {
    const base = {
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# Placeholder',
      meta: { url: 'https://example.com/a' },
    };
    assert.equal(inspectCacheLeaf(base).ok, false);
    assert.equal(inspectCacheLeaf({ ...base, meta: { ...base.meta, fetch_status: 'blocked' } }).ok, true);
  });

  it('reports the same missing assigned and base files from the projection', () => {
    const result = inspectCacheLeaf({
      availableFiles: ['page.md', 'meta.json'],
      pageText: 'Substantive captured content.',
      meta: { source_slug: 'source-a' },
      cachePolicy: { leaf_files: ['snapshot.json'] },
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing_files, ['websearch.json', 'snapshot.json']);
  });
});

describe('inspectCacheLeaf structural filler judgment @impl CRC-009', () => {
  it('rejects a heading + generic filler sentence page (BUG-251 shape)', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# 04_moore-threads-mtt-s5000\n\nDeep research content.',
      meta: { url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder-only/);
  });

  it('rejects a heading-only page (no body at all)', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# Topic Title',
      meta: { url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder-only/);
  });

  it('rejects a page whose only body line repeats the heading', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# Topic Title\nTopic title',
      meta: { url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder-only/);
  });

  it('accepts a real short page with substantive body text', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# Topic Title\nMoore Threads announced the MTT S5000 with 64GB HBM3.',
      meta: { url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  it('accepts a filler-shaped page when explicit degraded capture is recorded in page.md', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '# Topic Title\nfetch failure: blocked by robots.txt',
      meta: { url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.degraded, true);
  });

  it('still rejects an empty page even when meta carries degraded signals (existing page rule)', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: '   ',
      meta: { url: 'https://news.example-real.com/a', fetch_status: 'degraded_fetch_failure' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /empty/);
  });
});

describe('inspectCacheLeaf placeholder-domain judgment @impl CRC-009', () => {
  it('rejects a leaf whose every mapped URL is on an IANA example domain without a real source_slug', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'Real fetched body text about the topic.',
      meta: { url: 'https://example.com/04_moore-threads-mtt-s5000' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder domain/);
  });

  it('rejects when all URL fields are example domains', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'Real fetched body text about the topic.',
      meta: { url: 'https://example.org/a', fetched_url: 'https://example.net/a' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder domain/);
  });

  it('accepts when at least one URL is on a real domain', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'Real fetched body text about the topic.',
      meta: { url: 'https://example.com/a', final_url: 'https://news.example-real.com/a' },
    });
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  it('a source_slug that merely restates the example domain does not clear the judgment', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'Real fetched body text about the topic.',
      meta: { url: 'https://example.com/a', source_slug: 'example-com' },
    });
    assert.equal(result.ok, false);
    assert.match(result.issue, /placeholder domain/);
  });

  it('a real source_slug clears the placeholder-domain judgment', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'Real fetched body text about the topic.',
      meta: { url: 'https://example.com/a', source_slug: 'moore-threads-official' },
    });
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  it('an explicit degraded capture passes even with example-domain URLs', () => {
    const result = inspectCacheLeaf({
      availableFiles: CACHE_BASE_LEAF_FILES,
      pageText: 'access failure: example.com returned 403 for this topic',
      meta: { url: 'https://example.com/a' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.degraded, true);
  });
});
