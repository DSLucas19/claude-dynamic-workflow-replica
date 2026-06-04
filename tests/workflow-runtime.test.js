const { describe, test } = require('node:test');
const assert = require('node:assert');
const { WorkflowEventBus, StateManager, AgentPool, TeamManager } = require('../scripts/workflow-runtime.js');

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
