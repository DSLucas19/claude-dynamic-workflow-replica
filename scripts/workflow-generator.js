const patterns = {
  'team-adversarial': (task) => `
module.exports = async function workflow(ctx) {
  // Team-based adversarial workflow
  const report = await ctx.runTeams([
    {
      id: 'team-1',
      workers: [
        { id: 'worker-a', task: '${task}', type: 'builder' },
        { id: 'worker-b', task: 'Support ${task}', type: 'builder' }
      ],
      verifier: { id: 'verifier-1', scope: 'full' }
    }
  ]);

  return report;
};
`,

  'parallel-fanout': (task) => `
module.exports = async function workflow(ctx) {
  // Parallel fan-out workflow
  const agents = [
    { type: 'explorer', task: 'Research ${task}', id: 'research-1' },
    { type: 'explorer', task: 'Analyze ${task}', id: 'research-2' },
    { type: 'explorer', task: 'Review ${task}', id: 'research-3' }
  ];

  const results = await Promise.all(
    agents.map(agent => ctx.spawnAgents([agent]))
  );

  return { results, merged: true };
};
`,

  'sequential': (task) => `
module.exports = async function workflow(ctx) {
  // Sequential pipeline workflow
  const step1 = await ctx.spawnAgent('explorer', { task: 'Research ${task}' });
  ctx.checkpoint();

  const step2 = await ctx.spawnAgent('builder', { task: 'Implement ${task}' });
  ctx.checkpoint();

  const step3 = await ctx.spawnAgent('reviewer', { task: 'Review ${task}' });
  ctx.checkpoint();

  return { step1, step2, step3 };
};
`,

  'research-build': (task) => `
module.exports = async function workflow(ctx) {
  // Research → Build → Verify workflow
  const research = await ctx.spawnAgent('explorer', { task: 'Research ${task}' });
  ctx.checkpoint();

  const build = await ctx.spawnAgent('builder', { task: 'Build ${task}' });
  ctx.checkpoint();

  const verification = await ctx.verify(build, { scope: 'full' });

  return { research, build, verification };
};
`,

  'audit': (task) => `
module.exports = async function workflow(ctx) {
  // Multi-angle audit workflow
  const results = await ctx.spawnAgents([
    { type: 'security', task: 'Security audit: ${task}', id: 'security' },
    { type: 'reviewer', task: 'Code review: ${task}', id: 'code-review' },
    { type: 'explorer', task: 'Dependency audit: ${task}', id: 'deps' }
  ]);

  const verification = await ctx.verifyAll(results, { scope: 'full' });

  return { results, verification };
};
`,

  'migration': (task) => `
module.exports = async function workflow(ctx) {
  // Parallel migration with rollback
  ctx.setMemory('rollback_available', true);

  const migration = await ctx.spawnAgent('builder', { task: '${task}' });
  ctx.checkpoint();

  try {
    const verification = await ctx.verify(migration, { scope: 'full' });
    return { migration, verification, status: 'success' };
  } catch (error) {
    // Rollback
    ctx.setMemory('rollback_triggered', true);
    return { error: error.message, status: 'rolled_back' };
  }
};
`
};

function generateWorkflow(options) {
  const { pattern, task } = options;
  
  if (!patterns[pattern]) {
    throw new Error(`Unknown pattern: ${pattern}`);
  }
  
  return patterns[pattern](task);
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const patternIdx = args.indexOf('--pattern');
  const taskIdx = args.indexOf('--task');
  const outputIdx = args.indexOf('--output');

  if (patternIdx === -1 || taskIdx === -1) {
    console.error('Usage: node workflow-generator.js --pattern <pattern> --task <task> [--output <file>]');
    process.exit(1);
  }

  const pattern = args[patternIdx + 1];
  const task = args[taskIdx + 1];
  const output = outputIdx !== -1 ? args[outputIdx + 1] : null;

  const script = generateWorkflow({ pattern, task });

  if (output) {
    const fs = require('fs');
    fs.writeFileSync(output, script);
    console.log(`Generated workflow: ${output}`);
  } else {
    console.log(script);
  }
}

module.exports = { generateWorkflow, patterns };
