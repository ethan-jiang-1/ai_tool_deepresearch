// Unit contract for the regression shard partition (scripts/test-shard.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shardFiles } from '../../scripts/test-shard.mjs';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

test('partitions a sorted list into n disjoint shards covering everything', () => {
  for (const n of [1, 2, 3, 4, 7, 10]) {
    const shards = Array.from({ length: n }, (_, m) => shardFiles(FILES, n, m));
    const union = shards.flat().sort();
    assert.deepEqual(union, FILES, `n=${n} union must equal the full list`);
    for (let a = 0; a < n; a += 1) {
      for (let b = a + 1; b < n; b += 1) {
        for (const file of shards[a]) {
          assert.equal(shards[b].includes(file), false, `n=${n}: ${file} in both ${a} and ${b}`);
        }
      }
    }
  }
});

test('is deterministic for the same inputs', () => {
  for (const n of [2, 3, 5]) {
    for (let m = 0; m < n; m += 1) {
      assert.deepEqual(shardFiles(FILES, n, m), shardFiles(FILES, n, m));
    }
  }
});

test('n=1 returns the full list', () => {
  assert.deepEqual(shardFiles(FILES, 1, 0), FILES);
});

test('out-of-range shard index and invalid n return empty', () => {
  assert.deepEqual(shardFiles(FILES, 2, 2), []);
  assert.deepEqual(shardFiles(FILES, 2, -1), []);
  assert.deepEqual(shardFiles(FILES, 0, 0), []);
  assert.deepEqual(shardFiles(FILES, 1.5, 0), []);
});

test('empty list yields empty shards', () => {
  for (const n of [1, 3]) for (let m = 0; m < n; m += 1) {
    assert.deepEqual(shardFiles([], n, m), []);
  }
});
