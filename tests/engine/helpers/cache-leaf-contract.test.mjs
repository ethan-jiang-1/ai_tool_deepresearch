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
