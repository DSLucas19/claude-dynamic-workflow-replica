const { describe, test } = require('node:test');
const assert = require('node:assert');
const { generateWorkflow } = require('../scripts/workflow-generator.js');

describe('Workflow Generator', () => {
  test('generates team-adversarial workflow', () => {
    const script = generateWorkflow({
      pattern: 'team-adversarial',
      task: 'Build auth system'
    });
    
    assert.ok(script.includes('module.exports'));
    assert.ok(script.includes('runTeams'));
    assert.ok(script.includes('verifier'));
  });

  test('generates parallel-fanout workflow', () => {
    const script = generateWorkflow({
      pattern: 'parallel-fanout',
      task: 'Research best practices'
    });
    
    assert.ok(script.includes('spawnAgents'));
    assert.ok(script.includes('Promise.all'));
  });

  test('generates sequential workflow', () => {
    const script = generateWorkflow({
      pattern: 'sequential',
      task: 'Deploy to production'
    });
    
    assert.ok(script.includes('await'));
    assert.ok(script.includes('checkpoint'));
  });

  test('generates research-build workflow', () => {
    const script = generateWorkflow({
      pattern: 'research-build',
      task: 'Implement WebSocket'
    });
    
    assert.ok(script.includes('explorer'));
    assert.ok(script.includes('builder'));
  });

  test('generates audit workflow', () => {
    const script = generateWorkflow({
      pattern: 'audit',
      task: 'Security audit'
    });
    
    assert.ok(script.includes('security'));
    assert.ok(script.includes('verify'));
  });

  test('generates migration workflow', () => {
    const script = generateWorkflow({
      pattern: 'migration',
      task: 'Database migration'
    });
    
    assert.ok(script.includes('rollback'));
    assert.ok(script.includes('checkpoint'));
  });
});
