# TUI Dashboard Documentation

## Overview

The OpenTUI dashboard provides real-time monitoring and interactive control
of dynamic workflows via the `/workflow` slash command.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /workflow SLASH COMMAND                           │
│                    (OpenTUI Dashboard)                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  MONITOR    │  │  INTERACT   │  │   MEMORY    │  │  PATTERNS │ │
│  │  Panel      │  │  Panel      │  │  Panel      │  │  Panel    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Panels

### Monitor Panel
- Real-time agent status
- Team progress
- Verification results

### Interact Panel
- Start/stop/pause workflow
- Approve/reject verifications
- Skip to next team

### Memory Panel
- View shared state within workflow
- Key-value pairs display

### Patterns Panel
- Active pattern info
- Branching/loop status

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Approve current verification |
| `R` | Reject current verification |
| `P` | Pause/Resume workflow |
| `S` | Stop workflow |
| `N` | Skip to next team |
| `E` | Toggle events log |
| `Q` | Quit |
| `Tab` | Switch between panels |
| `↑/↓` | Navigate lists |

## Integration with Workflow Runtime

The dashboard connects to WorkflowRuntime and displays:
- Agent pool status
- Team assembly and verification
- State manager contents
- Event bus emissions

## Requirements

- Bun runtime
- @opentui/core package

## Example Usage

```bash
# Generate workflow
node scripts/workflow-generator.js \
  --pattern team-adversarial \
  --task "Build auth system" \
  --output workflow.js

# Launch dashboard
/workflow workflow.js --state state.json
```
