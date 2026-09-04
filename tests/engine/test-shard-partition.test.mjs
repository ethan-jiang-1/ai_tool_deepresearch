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

test('balances shards according to provided weights using greedy LPT', () => {
  const weightedFiles = ['heavy1', 'heavy2', 'medium1', 'medium2', 'light1', 'light2'];
  const weights = {
    heavy1: 100,
    heavy2: 90,
    medium1: 40,
    medium2: 30,
    light1: 15,
    light2: 5,
  };
  const shard0 = shardFiles(weightedFiles, 2, 0, weights);
  const shard1 = shardFiles(weightedFiles, 2, 1, weights);

  // Shard 0 gets heavy1 (100) + medium2 (30) + light1 (15) = 145
  // Shard 1 gets heavy2 (90) + medium1 (40) + light2 (5) = 135
  assert.deepEqual(shard0, ['heavy1', 'medium2', 'light1']);
  assert.deepEqual(shard1, ['heavy2', 'medium1', 'light2']);

  const union = [...shard0, ...shard1].sort();
  assert.deepEqual(union, [...weightedFiles].sort());
});

test('handles unweighted or partially weighted files gracefully', () => {
  const mixedFiles = ['a', 'b', 'c', 'd'];
  const weights = {
    a: 50,
    b: 20,
    // c and d are unweighted (weight 0)
  };
  const s0 = shardFiles(mixedFiles, 2, 0, weights);
  const s1 = shardFiles(mixedFiles, 2, 1, weights);

  // 'a' (50) -> s0 (50)
  // 'b' (20) -> s1 (20)
  // 'c' (0) -> s1 (20 < 50) -> s1 gets 'c'
  // 'd' (0) -> s1 (20 < 50) -> s1 gets 'd'
  assert.deepEqual(s0, ['a']);
  assert.deepEqual(s1, ['b', 'c', 'd']);
  assert.deepEqual([...s0, ...s1].sort(), [...mixedFiles].sort());
});

