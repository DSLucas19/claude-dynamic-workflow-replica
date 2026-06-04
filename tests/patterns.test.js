const { describe, test } = require('node:test');
const assert = require('node:assert');
const { 
  conditionalBranch, 
  loopUntil, 
  subWorkflow, 
  withRetry, 
  circuitBreaker 
} = require('../scripts/workflow-patterns.js');

describe('Advanced Patterns', () => {
  describe('conditionalBranch', () => {
    test('executes true branch when condition is true', async () => {
      const result = await conditionalBranch(
        () => true,
        async () => 'yes',
        async () => 'no'
      );
      assert.strictEqual(result, 'yes');
    });

    test('executes false branch when condition is false', async () => {
      const result = await conditionalBranch(
        () => false,
        async () => 'yes',
        async () => 'no'
      );
      assert.strictEqual(result, 'no');
    });
  });

  describe('loopUntil', () => {
    test('loops until condition is met', async () => {
      let count = 0;
      const result = await loopUntil(
        async () => { count++; return count; },
        (val) => val >= 3
      );
      assert.strictEqual(result, 3);
      assert.strictEqual(count, 3);
    });

    test('respects max iterations', async () => {
      let count = 0;
      const result = await loopUntil(
        async () => { count++; return count; },
        (val) => false,
        { maxIterations: 5 }
      );
      assert.strictEqual(count, 5);
    });
  });

  describe('subWorkflow', () => {
    test('runs sub-workflow and returns result', async () => {
      const result = await subWorkflow(
        async (ctx) => ({ sub: true }),
        { isolateMemory: true }
      );
      assert.deepStrictEqual(result, { sub: true });
    });
  });

  describe('withRetry', () => {
    test('retries on failure', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('fail');
          return 'success';
        },
        { maxRetries: 3 }
      );
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    test('throws after max retries', async () => {
      await assert.rejects(
        () => withRetry(
          async () => { throw new Error('always fail'); },
          { maxRetries: 2 }
        ),
        /always fail/
      );
    });
  });

  describe('circuitBreaker', () => {
    test('opens circuit after threshold failures', async () => {
      let failures = 0;
      const fn = circuitBreaker(
        async () => {
          failures++;
          throw new Error('fail');
        },
        { threshold: 3, resetTimeout: 1000 }
      );

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try { await fn(); } catch (e) {}
      }

      // Next call should fail immediately (circuit open)
      await assert.rejects(() => fn(), /circuit/i);
    });
  });
});
