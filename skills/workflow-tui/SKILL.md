# Workflow TUI Dashboard

Launch interactive TUI dashboard for monitoring and controlling dynamic workflows.

## Usage

/workflow [workflow-script.js] [--state state.json]

## Features

- Real-time monitoring of agents and teams
- Interactive controls (start/stop/pause, approve/reject)
- Shared memory visualization
- Pattern status display
- Event log with filtering

## Keyboard Shortcuts

- `A` - Approve current verification
- `R` - Reject current verification
- `P` - Pause/Resume workflow
- `S` - Stop workflow
- `N` - Skip to next team
- `E` - Toggle events log
- `Q` - Quit

## Requirements

- Bun runtime (for OpenTUI)
- @opentui/core package

## Example

```bash
/workflow workflow.js --state state.json
```
