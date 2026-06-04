const { describe, test } = require('node:test');
const assert = require('node:assert');
const { WorkflowEventBus, StateManager } = require('../scripts/workflow-runtime.js');

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
