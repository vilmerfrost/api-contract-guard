import express from 'express';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for active and completed tasks
interface CLILogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success' | 'debug';
  message: string;
  raw: string;
}

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
    description?: string;
  };
  process?: ChildProcess;
}

const tasks = new Map<string, CLITask>();
const taskHistory: CLITask[] = [];
const MAX_HISTORY = 50;

// Parse log level from message
function parseLogLevel(message: string): CLILogEntry['level'] {
  if (message.includes('✅') || message.includes('PASSED') || message.includes('success')) return 'success';
  if (message.includes('❌') || message.includes('FAILED') || message.includes('Error:')) return 'error';
  if (message.includes('⚠️') || message.includes('WARNING') || message.includes('warn')) return 'warn';
  if (message.includes('🚀') || message.includes('📋') || message.includes('✓')) return 'info';
  return 'debug';
}

// Execute CLI command
app.post('/api/cli/execute', (req, res) => {
  const { command, args = [], env = {}, description = '' } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const taskId = randomUUID();
  const cliPath = join(process.cwd(), 'dist', 'cli', 'cli.js');
  
  // Build command arguments
  const cliArgs = [command, ...args];
  
  const task: CLITask = {
    id: taskId,
    command,
    args: cliArgs,
    status: 'running',
    startTime: new Date(),
    logs: [],
    metadata: {
      description,
      swaggerUrl: args.find((a: string) => a.includes('swagger-url'))?.split('=')[1],
      testMode: args.find((a: string) => a.includes('mode'))?.split('=')[1],
      parallel: args.some((a: string) => a === '--parallel'),
    },
  };

  tasks.set(taskId, task);

  // Spawn the CLI process
  const childProcess = spawn('node', [cliPath, ...cliArgs], {
    env: { ...process.env, ...env },
    cwd: process.cwd(),
  });

  task.process = childProcess;

  // Capture stdout
  childProcess.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string) => {
      const entry: CLILogEntry = {
        timestamp: new Date().toISOString(),
        level: parseLogLevel(line),
        message: line,
        raw: line,
      };
      task.logs.push(entry);
    });
  });

  // Capture stderr
  childProcess.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string) => {
      const entry: CLILogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: line,
        raw: line,
      };
      task.logs.push(entry);
    });
  });

  // Handle process completion
  childProcess.on('close', (code) => {
    task.status = code === 0 ? 'completed' : 'failed';
    task.endTime = new Date();
    task.exitCode = code ?? undefined;
    
    // Add to history
    taskHistory.unshift({ ...task });
    if (taskHistory.length > MAX_HISTORY) {
      taskHistory.pop();
    }
    
    // Clean up process reference
    delete task.process;
  });

  childProcess.on('error', (error) => {
    task.status = 'failed';
    task.endTime = new Date();
    task.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Process error: ${error.message}`,
      raw: error.message,
    });
  });

  res.json({ taskId, status: 'running' });
});

// Get task status
app.get('/api/cli/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    id: task.id,
    status: task.status,
    exitCode: task.exitCode,
    startTime: task.startTime,
    endTime: task.endTime,
    duration: task.endTime 
      ? task.endTime.getTime() - task.startTime.getTime()
      : Date.now() - task.startTime.getTime(),
    metadata: task.metadata,
    logCount: task.logs.length,
  });
});

// Get task logs
app.get('/api/cli/logs/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ logs: task.logs });
});

// Stream logs via SSE
app.get('/api/cli/logs/:taskId/stream', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let lastIndex = 0;
  
  const sendLogs = () => {
    const newLogs = task.logs.slice(lastIndex);
    lastIndex = task.logs.length;
    
    if (newLogs.length > 0) {
      res.write(`data: ${JSON.stringify({ logs: newLogs, status: task.status })}\n\n`);
    }
    
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      res.write(`data: ${JSON.stringify({ done: true, status: task.status, exitCode: task.exitCode })}\n\n`);
      res.end();
      return;
    }
    
    setTimeout(sendLogs, 100);
  };

  sendLogs();
});

// Cancel running task
app.post('/api/cli/cancel/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status !== 'running' || !task.process) {
    return res.status(400).json({ error: 'Task is not running' });
  }

  task.process.kill('SIGTERM');
  task.status = 'cancelled';
  task.endTime = new Date();
  
  task.logs.push({
    timestamp: new Date().toISOString(),
    level: 'warn',
    message: 'Task cancelled by user',
    raw: 'Task cancelled by user',
  });

  res.json({ success: true });
});

// Get execution history
app.get('/api/cli/history', (req, res) => {
  const { limit = '20', offset = '0' } = req.query;
  
  const allTasks = [...taskHistory, ...Array.from(tasks.values())]
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  
  const start = parseInt(offset as string);
  const end = start + parseInt(limit as string);
  
  res.json({
    tasks: allTasks.slice(start, end).map(task => ({
      id: task.id,
      command: task.command,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.endTime 
        ? task.endTime.getTime() - task.startTime.getTime()
        : Date.now() - task.startTime.getTime(),
      metadata: task.metadata,
      logCount: task.logs.length,
    })),
    total: allTasks.length,
  });
});

// Get active tasks
app.get('/api/cli/active', (req, res) => {
  const activeTasks = Array.from(tasks.values())
    .filter(task => task.status === 'running')
    .map(task => ({
      id: task.id,
      command: task.command,
      status: task.status,
      startTime: task.startTime,
      metadata: task.metadata,
      logCount: task.logs.length,
    }));
  
  res.json({ tasks: activeTasks });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeTasks: tasks.size });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CLI API Server running on port ${PORT}`);
});

export default app;
