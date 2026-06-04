const { createCliRenderer, Box, Text, Input, Select } = require('@opentui/core');
const { WorkflowRuntime, WorkflowContext } = require('./workflow-runtime.js');

class WorkflowDashboard {
  constructor(options = {}) {
    this.runtime = options.runtime || new WorkflowRuntime(options);
    this.workflowFile = options.workflowFile || null;
    this.stateFile = options.stateFile || null;
    this.running = false;
    this.paused = false;
    this.events = [];
    this.selectedTeam = null;
    this.selectedAgent = null;
  }

  async start() {
    const renderer = await createCliRenderer({
      exitOnCtrlC: false,
      title: 'Dynamic Workflows v2.0'
    });

    this.renderer = renderer;
    this.setupUI();
    this.setupKeybindings();

    if (this.workflowFile) {
      await this.loadWorkflow(this.workflowFile);
    }

    renderer.render();
  }

  setupUI() {
    const { root } = this.renderer;

    // Header
    const header = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
      Text({ content: ' DYNAMIC WORKFLOWS v2.0', fg: '#00FF00', bold: true }),
      Text({ content: '[P]ause [S]top [Q]uit', fg: '#888888' })
    );

    // Status bar
    this.statusBar = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
      Text({ content: ' Status: IDLE', fg: '#FFFF00' }),
      Text({ content: ' Elapsed: 0s', fg: '#888888' })
    );

    // Main content area
    const mainContent = Box({
      width: '100%',
      height: '100%-8',
      flexDirection: 'row'
    });

    // Left panel - Teams & Agents
    this.teamsPanel = Box({
      width: '50%',
      height: '100%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'TEAMS & AGENTS'
    });

    // Right panel - Memory & Events
    this.rightPanel = Box({
      width: '50%',
      height: '100%',
      flexDirection: 'column'
    });

    // Memory panel
    this.memoryPanel = Box({
      width: '100%',
      height: '50%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'SHARED MEMORY'
    });

    // Events panel
    this.eventsPanel = Box({
      width: '100%',
      height: '50%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'EVENTS'
    });

    // Controls bar
    this.controlsBar = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 2
    },
      Text({ content: '[A]pprove', fg: '#00FF00' }),
      Text({ content: '[R]eject', fg: '#FF0000' }),
      Text({ content: '[P]ause', fg: '#FFFF00' }),
      Text({ content: '[N]ext team', fg: '#00FFFF' }),
      Text({ content: '[E]vents log', fg: '#888888' })
    );

    // Assemble UI
    mainContent.add(this.teamsPanel);
    mainContent.add(this.rightPanel);
    this.rightPanel.add(this.memoryPanel);
    this.rightPanel.add(this.eventsPanel);

    root.add(header);
    root.add(this.statusBar);
    root.add(mainContent);
    root.add(this.controlsBar);
  }

  setupKeybindings() {
    const { root } = this.renderer;

    root.on('keypress', async (key) => {
      switch (key.toLowerCase()) {
        case 'a':
          await this.approve();
          break;
        case 'r':
          await this.reject();
          break;
        case 'p':
          this.togglePause();
          break;
        case 's':
          await this.stop();
          break;
        case 'n':
          this.nextTeam();
          break;
        case 'e':
          this.toggleEventsLog();
          break;
        case 'q':
          await this.quit();
          break;
      }
    });
  }

  async loadWorkflow(file) {
    const fs = require('fs');
    const workflowFn = require(file);

    this.statusBar.children[0].content = ' Status: LOADING';
    this.renderer.render();

    // Start execution
    this.running = true;
    this.startTime = Date.now();

    // Execute in background
    this.runtime.execute(workflowFn).then(result => {
      this.running = false;
      this.statusBar.children[0].content = ' Status: COMPLETE';
      this.addEvent('workflow_complete', { result });
      this.renderer.render();
    }).catch(error => {
      this.running = false;
      this.statusBar.children[0].content = ' Status: ERROR';
      this.addEvent('workflow_error', { error: error.message });
      this.renderer.render();
    });

    // Start update loop
    this.updateLoop();
  }

  updateLoop() {
    if (!this.running) return;

    // Update elapsed time
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.statusBar.children[1].content = ` Elapsed: ${elapsed}s`;

    // Update teams panel
    this.updateTeamsPanel();

    // Update memory panel
    this.updateMemoryPanel();

    // Update events panel
    this.updateEventsPanel();

    this.renderer.render();

    // Schedule next update
    setTimeout(() => this.updateLoop(), 100);
  }

  updateTeamsPanel() {
    const teams = this.runtime.teamManager?.getAllTeams() || [];
    const agents = this.runtime.agentPool?.getActiveAgents() || [];

    let content = '';

    // Teams
    teams.forEach(team => {
      const statusIcon = team.status === 'converged' ? '●' : '○';
      content += `${statusIcon} ${team.id} (${team.status.toUpperCase()})\n`;

      team.workers.forEach(worker => {
        const icon = worker.status === 'completed' ? '✅' : '🔄';
        content += `  ├─ ${worker.id} ${icon}\n`;
      });

      content += `  └─ ${team.verifier.id} ${team.verifier.status === 'completed' ? '✅' : '⏳'}\n`;
      content += '\n';
    });

    // Agents
    if (agents.length > 0) {
      content += '─── ACTIVE AGENTS ───\n';
      agents.forEach(agent => {
        content += `⚡ ${agent.id} (${agent.type}) ${agent.status}\n`;
      });
    }

    this.teamsPanel.children = [
      Text({ content, fg: '#FFFFFF' })
    ];
  }

  updateMemoryPanel() {
    const keys = this.runtime.stateManager?.getKeys() || [];
    let content = '';

    keys.forEach(key => {
      const value = this.runtime.stateManager.get(key);
      const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
      content += `${key}: ${display}\n`;
    });

    this.memoryPanel.children = [
      Text({ content: content || '(empty)', fg: '#888888' })
    ];
  }

  updateEventsPanel() {
    const recentEvents = this.events.slice(-10);
    let content = '';

    recentEvents.forEach(event => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      content += `${time} ${event.type}\n`;
    });

    this.eventsPanel.children = [
      Text({ content: content || '(no events)', fg: '#888888' })
    ];
  }

  addEvent(type, data) {
    this.events.push({
      type,
      timestamp: Date.now(),
      ...data
    });
  }

  async approve() {
    this.addEvent('approve', { team: this.selectedTeam });
  }

  async reject() {
    this.addEvent('reject', { team: this.selectedTeam });
  }

  togglePause() {
    this.paused = !this.paused;
    this.statusBar.children[0].content = this.paused ? ' Status: PAUSED' : ' Status: RUNNING';
    this.addEvent(this.paused ? 'pause' : 'resume', {});
  }

  async stop() {
    this.running = false;
    this.statusBar.children[0].content = ' Status: STOPPED';
    this.addEvent('stop', {});
  }

  nextTeam() {
    const teams = this.runtime.teamManager?.getAllTeams() || [];
    const currentIdx = teams.findIndex(t => t.id === this.selectedTeam);
    const nextIdx = (currentIdx + 1) % teams.length;
    this.selectedTeam = teams[nextIdx]?.id || null;
  }

  toggleEventsLog() {
    // Toggle events panel visibility
  }

  async quit() {
    if (this.running) {
      await this.stop();
    }
    process.exit(0);
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const workflowFile = args[0] || null;
  const stateIdx = args.indexOf('--state');
  const stateFile = stateIdx !== -1 ? args[stateIdx + 1] : null;

  const dashboard = new WorkflowDashboard({
    workflowFile,
    stateFile
  });

  dashboard.start().catch(console.error);
}

module.exports = { WorkflowDashboard };
