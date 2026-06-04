const { describe, test } = require('node:test');
const assert = require('node:assert');
const { WorkflowEventBus } = require('../scripts/workflow-runtime.js');

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
