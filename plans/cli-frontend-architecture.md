# CLI Frontend Architecture Plan

## Overview
Transform the API Contract Guard into a stunning web-based CLI control center that allows users to:
1. Execute CLI commands from the browser
2. View real-time CLI logs with streaming output
3. Manage and monitor test executions
4. Visualize results in a modern dashboard

## Architecture

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[Dashboard Layout] --> B[CLI Control Panel]
        A --> C[Live Log Viewer]
        A --> D[Execution History]
        A --> E[Results Visualization]
        
        B --> F[Command Builder]
        B --> G[Quick Actions]
        B --> H[Environment Config]
        
        C --> I[Log Stream]
        C --> J[Progress Indicators]
        C --> K[Status Badges]
    end
    
    subgraph "Backend API (Express/Vite Plugin)"
        L[API Routes] --> M[/api/cli/execute]
        L --> N[/api/cli/status/:id]
        L --> O[/api/cli/logs/:id]
        L --> P[/api/cli/history]
        L --> Q[/api/cli/cancel/:id]
        
        M --> R[Child Process Spawner]
        N --> S[Process Registry]
        O --> T[Log Buffer/Stream]
    end
    
    subgraph "Real-time Communication"
        U[WebSocket/SSE] --> V[Log Events]
        U --> W[Status Updates]
        U --> X[Progress Events]
    end
    
    R --> U
    S --> U
    T --> U
```

## CLI Commands to Support

| Command | Description | Key Options |
|---------|-------------|-------------|
| `test` | Run regression tests | --swagger-url, --token-url, --username, --password, --parallel, --mode, --use-hierarchical |
| `test-posts` | Run POST endpoint tests | --swagger-url, --module, --skip-cleanup |
| `vm-start` | Start Azure VM | --api-url, --max-wait |
| `list-endpoints` | List all endpoints | --swagger-url, --include-blacklisted |

## Data Models

### CLI Task
```typescript
interface CLITask {
  id: string;
  command: string;
  args: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  logs: CLILogEntry[];
  metadata: {
    swaggerUrl?: string;
    testMode?: string;
    parallel?: boolean;
  };
}

interface CLILogEntry {
  timestamp: Date;
  level: 'info' | 'error' | 'warn' | 'success' | 'debug';
  message: string;
  raw: string;
}
```

## UI Components

### 1. Dashboard Layout
- Sidebar navigation with command categories
- Main content area with tabbed interface
- Status bar showing active executions
- Quick action buttons for common tasks

### 2. CLI Control Panel
- Command selector dropdown
- Dynamic form builder based on command schema
- Environment variable management
- Save/load configuration presets

### 3. Live Log Viewer
- Terminal-like interface with ANSI color support
- Auto-scroll with pause/resume
- Log level filtering
- Search within logs
- Export logs to file

### 4. Execution History
- List of past executions with status
- Duration and result summary
- Re-run functionality
- Delete/archive old executions

### 5. Results Visualization
- Pass/fail charts
- Endpoint coverage heatmap
- Response time graphs
- JUnit report viewer

## API Endpoints

```typescript
// Start a new CLI execution
POST /api/cli/execute
Body: { command: string, args: string[], env?: Record<string, string> }
Response: { taskId: string, status: string }

// Get execution status
GET /api/cli/status/:taskId
Response: { status: string, exitCode?: number, duration: number }

// Stream logs (SSE)
GET /api/cli/logs/:taskId/stream
Content-Type: text/event-stream

// Get all logs
GET /api/cli/logs/:taskId
Response: { logs: CLILogEntry[] }

// Cancel running execution
POST /api/cli/cancel/:taskId
Response: { success: boolean }

// Get execution history
GET /api/cli/history
Query: { limit?: number, offset?: number, status?: string }
Response: { tasks: CLITask[], total: number }
```

## Design System

### Colors
- Background: Slate 950 (#020617)
- Terminal Background: Black (#000000)
- Success: Green 500 (#22c55e)
- Error: Red 500 (#ef4444)
- Warning: Yellow 500 (#eab308)
- Info: Blue 500 (#3b82f6)
- Primary Accent: Cyan 400 (#22d3ee)

### Typography
- UI Font: Inter
- Terminal Font: JetBrains Mono / Fira Code
- Status indicators: Monospace with icons

### Layout
- Sidebar: 280px fixed width
- Terminal: Min 400px height, expandable
- Cards: Rounded-xl with subtle borders
- Spacing: Consistent 4px grid

## Implementation Phases

### Phase 1: Backend API
1. Create Express server with Vite integration
2. Implement process spawning with log capture
3. Set up WebSocket/SSE for real-time logs
4. Build task registry and history storage

### Phase 2: Frontend Core
1. Create dashboard layout with sidebar
2. Build command builder forms
3. Implement terminal component with xterm.js or custom
4. Add execution history list

### Phase 3: Real-time Features
1. Connect to SSE endpoints
2. Animate log streaming
3. Add progress indicators
4. Implement live status updates

### Phase 4: Polish
1. Add syntax highlighting for logs
2. Implement search and filters
3. Add export functionality
4. Responsive design adjustments
