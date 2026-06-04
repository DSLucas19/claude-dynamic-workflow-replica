const { describe, test } = require('node:test');
const assert = require('node:assert');
const { WorkflowEventBus, StateManager, AgentPool, TeamManager, WorkflowContext, WorkflowRuntime } = require('../scripts/workflow-runtime.js');

describe('WorkflowEventBus', () => {
  test('emits events as JSON lines', () => {
    const bus = new WorkflowEventBus();
    const output = [];
    
    bus.on('event', (data) => output.push(JSON.parse(data)));
    bus.emit('task_start', { agentId: 'agent-1', task: 'Build API' });
    
    assert.strictEqual(output.length, 1);
    assert.strictEqual(output[0].type, 'task_start');
    assert.strictEqual(output[0].agentId, 'agent-1');
  });

  test('includes timestamp in events', () => {
    const bus = new WorkflowEventBus();
    const output = [];
    
    bus.on('event', (data) => output.push(JSON.parse(data)));
    bus.emit('checkpoint', { state: 'saved' });
    
    assert.ok(output[0].timestamp);
    assert.strictEqual(new Date(output[0].timestamp).toISOString(), output[0].timestamp);
  });
});

describe('StateManager', () => {
  test('stores and retrieves values', () => {
    const manager = new StateManager();
    manager.set('key1', 'value1');
    assert.strictEqual(manager.get('key1'), 'value1');
  });

  test('returns undefined for missing keys', () => {
    const manager = new StateManager();
    assert.strictEqual(manager.get('missing'), undefined);
  });

  test('lists all keys', () => {
    const manager = new StateManager();
    manager.set('a', 1);
    manager.set('b', 2);
    assert.deepStrictEqual(manager.getKeys(), ['a', 'b']);
  });

  test('deletes keys', () => {
    const manager = new StateManager();
    manager.set('key', 'value');
    manager.delete('key');
    assert.strictEqual(manager.get('key'), undefined);
  });

  test('clears all memory', () => {
    const manager = new StateManager();
    manager.set('a', 1);
    manager.set('b', 2);
    manager.clear();
    assert.deepStrictEqual(manager.getKeys(), []);
  });

  test('serializes to JSON', () => {
    const manager = new StateManager();
    manager.set('key', { nested: true });
    const json = manager.toJSON();
    assert.deepStrictEqual(JSON.parse(json), { key: { nested: true } });
  });

  test('loads from JSON', () => {
    const manager = new StateManager();
    manager.fromJSON('{"key":"value"}');
    assert.strictEqual(manager.get('key'), 'value');
  });
});

describe('AgentPool', () => {
  test('creates agent with id and type', () => {
    const pool = new AgentPool();
    const agent = pool.createAgent('builder');
    
    assert.strictEqual(agent.type, 'builder');
    assert.ok(agent.id.startsWith('agent-'));
  });

  test('tracks agent count', () => {
    const pool = new AgentPool();
    pool.createAgent('builder');
    pool.createAgent('explorer');
    
    assert.strictEqual(pool.count(), 2);
  });

  test('completes agent and updates status', () => {
    const pool = new AgentPool();
    const agent = pool.createAgent('builder');
    
    pool.completeAgent(agent.id, { result: 'done' });
    
    const completed = pool.getAgent(agent.id);
    assert.strictEqual(completed.status, 'completed');
    assert.deepStrictEqual(completed.result, { result: 'done' });
  });

  test('fails agent and records error', () => {
    const pool = new AgentPool();
    const agent = pool.createAgent('builder');
    
    pool.failAgent(agent.id, new Error('timeout'));
    
    const failed = pool.getAgent(agent.id);
    assert.strictEqual(failed.status, 'failed');
    assert.strictEqual(failed.error, 'timeout');
  });

  test('limits concurrent agents', () => {
    const pool = new AgentPool({ maxConcurrent: 2 });
    pool.createAgent('builder');
    pool.createAgent('builder');
    
    assert.throws(() => pool.createAgent('builder'), /limit/i);
  });
});

describe('TeamManager', () => {
  test('assembles team with workers and verifier', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    
    const team = manager.assembleTeam({
      id: 'team-1',
      workers: [
        { id: 'w1', type: 'builder', task: 'Build feature' }
      ],
      verifier: { id: 'v1', scope: 'full' }
    });
    
    assert.strictEqual(team.id, 'team-1');
    assert.strictEqual(team.workers.length, 1);
    assert.ok(team.verifier);
  });

  test('runs team and collects results', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    
    const team = manager.assembleTeam({
      id: 'team-1',
      workers: [
        { id: 'w1', type: 'builder', task: 'Build' }
      ],
      verifier: { id: 'v1', scope: 'full' }
    });

    const result = await manager.runTeam(team, {
      executeAgent: async (agent) => ({ output: `done-${agent.id}` })
    });
    
    assert.strictEqual(result.id, 'team-1');
    assert.ok(result.workers.length > 0);
  });

  test('runs multiple teams sequentially', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    
    const team1 = manager.assembleTeam({
      id: 'team-1',
      workers: [{ id: 'w1', type: 'builder', task: 'A' }],
      verifier: { id: 'v1', scope: 'full' }
    });
    
    const team2 = manager.assembleTeam({
      id: 'team-2',
      workers: [{ id: 'w2', type: 'builder', task: 'B' }],
      verifier: { id: 'v2', scope: 'full' }
    });

    const results = await manager.runTeams([team1, team2], {
      executeAgent: async (agent) => ({ output: `done-${agent.id}` })
    });
    
    assert.strictEqual(results.length, 2);
  });

  test('respects max iterations per team', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool, { maxIterations: 2 });
    
    const team = manager.assembleTeam({
      id: 'team-1',
      workers: [{ id: 'w1', type: 'builder', task: 'Build' }],
      verifier: { id: 'v1', scope: 'full' }
    });

    let iterations = 0;
    const result = await manager.runTeam(team, {
      executeAgent: async (agent) => {
        iterations++;
        return { output: 'done' };
      },
      verify: async () => {
        iterations++;
        return { status: 'needs_rework' };
      }
    });
    
    assert.ok(iterations <= 4);
  });
});

describe('WorkflowContext', () => {
  test('spawns agent and returns result', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    const result = await ctx.spawnAgent('builder', { task: 'Build it' }, {
      execute: async (agent) => ({ output: 'built' })
    });
    
    assert.ok(result);
  });

  test('spawns multiple agents in parallel', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    const results = await ctx.spawnAgents([
      { type: 'builder', task: 'A' },
      { type: 'explorer', task: 'B' }
    ], {
      execute: async (agent) => ({ output: `done-${agent.type}` })
    });
    
    assert.strictEqual(results.length, 2);
  });

  test('runs teams with verification', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    const report = await ctx.runTeams([
      {
        id: 'team-1',
        workers: [{ id: 'w1', type: 'builder', task: 'Build' }],
        verifier: { id: 'v1', scope: 'full' }
      }
    ], {
      executeAgent: async (agent) => ({ output: 'done' })
    });
    
    assert.ok(report.length > 0);
  });

  test('verifies result', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    const result = await ctx.verify({ output: 'test' }, {
      verify: async () => ({ status: 'pass' })
    });
    
    assert.ok(result);
  });

  test('verifyAll checks multiple results', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    const result = await ctx.verifyAll([{ a: 1 }, { b: 2 }], {
      verify: async () => ({ status: 'pass' })
    });
    
    assert.ok(result);
  });

  test('sets and gets memory', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    ctx.setMemory('key', 'value');
    assert.strictEqual(ctx.getMemory('key'), 'value');
  });

  test('gets memory keys', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    ctx.setMemory('a', 1);
    ctx.setMemory('b', 2);
    
    assert.deepStrictEqual(ctx.getMemoryKeys().sort(), ['a', 'b']);
  });

  test('deletes memory key', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    ctx.setMemory('key', 'value');
    ctx.deleteMemory('key');
    
    assert.strictEqual(ctx.getMemory('key'), undefined);
  });

  test('clears all memory', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    ctx.setMemory('a', 1);
    ctx.setMemory('b', 2);
    ctx.clearMemory();
    
    assert.deepStrictEqual(ctx.getMemoryKeys(), []);
  });

  test('cached returns cached value on second call', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    let calls = 0;
    const fn = async () => { calls++; return 'result'; };
    
    const r1 = await ctx.cached('k', fn);
    const r2 = await ctx.cached('k', fn);
    
    assert.strictEqual(r1, 'result');
    assert.strictEqual(r2, 'result');
    assert.strictEqual(calls, 1);
  });

  test('getAgentStats returns counts', () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });
    
    pool.createAgent('builder');
    pool.createAgent('explorer');
    
    const stats = ctx.getAgentStats();
    assert.strictEqual(stats.total, 2);
    assert.strictEqual(stats.active, 2);
    assert.strictEqual(stats.completed, 0);
  });
});

describe('Performance Optimizations', () => {
  test('cached prevents redundant computation', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });

    let computeCount = 0;
    const expensiveFn = async () => {
      computeCount++;
      return { data: 'expensive' };
    };

    await ctx.cached('key1', expensiveFn);
    await ctx.cached('key1', expensiveFn);
    await ctx.cached('key1', expensiveFn);
    await ctx.cached('key1', expensiveFn);
    await ctx.cached('key1', expensiveFn);

    assert.strictEqual(computeCount, 1);
  });

  test('verifyAll processes results in parallel', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });

    const results = [{ a: 1 }, { b: 2 }, { c: 3 }];

    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const verification = await ctx.verifyAll(results, {
      verify: async (r) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return { status: 'pass' };
      }
    });

    assert.ok(verification.allPassed);
    assert.ok(maxConcurrent > 1);
  });

  test('spawnAgents runs in parallel', async () => {
    const pool = new AgentPool();
    const manager = new TeamManager(pool);
    const bus = new WorkflowEventBus();
    const state = new StateManager();
    const ctx = new WorkflowContext({ pool, teamManager: manager, bus, state });

    const start = Date.now();

    await ctx.spawnAgents([
      { type: 'builder', task: 'A' },
      { type: 'builder', task: 'B' },
      { type: 'builder', task: 'C' }
    ], {
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { done: true };
      }
    });

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 250);
  });
});

describe('WorkflowRuntime', () => {
  test('executes workflow function', async () => {
    const runtime = new WorkflowRuntime();
    
    const result = await runtime.execute(async (ctx) => {
      return { success: true };
    });
    
    assert.deepStrictEqual(result, { success: true });
  });

  test('provides WorkflowContext to workflow function', async () => {
    const runtime = new WorkflowRuntime();
    
    const result = await runtime.execute(async (ctx) => {
      assert.ok(ctx.spawnAgent);
      assert.ok(ctx.setMemory);
      assert.ok(ctx.verify);
      return { ok: true };
    });
    
    assert.ok(result);
  });

  test('emits workflow_start event', async () => {
    const runtime = new WorkflowRuntime();
    const events = [];
    
    runtime.bus.on('workflow_start', (data) => events.push(data));
    
    await runtime.execute(async (ctx) => 'done');
    
    assert.strictEqual(events.length, 1);
  });

  test('emits workflow_complete event', async () => {
    const runtime = new WorkflowRuntime();
    const events = [];
    
    runtime.bus.on('workflow_complete', (data) => events.push(data));
    
    await runtime.execute(async (ctx) => 'done');
    
    assert.strictEqual(events.length, 1);
  });

  test('emits workflow_error on failure', async () => {
    const runtime = new WorkflowRuntime();
    const events = [];
    
    runtime.bus.on('workflow_error', (data) => events.push(data));
    
    await assert.rejects(
      () => runtime.execute(async (ctx) => { throw new Error('boom'); }),
      /boom/
    );
    
    assert.strictEqual(events.length, 1);
  });

  test('exports all classes', () => {
    const exported = require('../scripts/workflow-runtime.js');
    
    assert.ok(exported.WorkflowEventBus);
    assert.ok(exported.StateManager);
    assert.ok(exported.AgentPool);
    assert.ok(exported.TeamManager);
    assert.ok(exported.WorkflowContext);
    assert.ok(exported.WorkflowRuntime);
  });
});
