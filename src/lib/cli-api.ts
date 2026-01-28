import { CLITask, CLITaskSummary, CLILogEntry } from '@/types/cli';

const API_BASE = 'http://localhost:3001';

export interface ExecuteCLIOptions {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

export async function executeCLI(options: ExecuteCLIOptions): Promise<{ taskId: string; status: string }> {
  const response = await fetch(`${API_BASE}/api/cli/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute CLI command');
  }

  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<{
  id: string;
  status: CLITask['status'];
  exitCode?: number;
  startTime: string;
  endTime?: string;
  duration: number;
  metadata: CLITask['metadata'];
  logCount: number;
}> {
  const response = await fetch(`${API_BASE}/api/cli/status/${taskId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get task status');
  }

  return response.json();
}

export async function getTaskLogs(taskId: string): Promise<{ logs: CLILogEntry[] }> {
  const response = await fetch(`${API_BASE}/api/cli/logs/${taskId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get task logs');
  }

  return response.json();
}

export function streamTaskLogs(
  taskId: string,
  onLog: (entry: CLILogEntry) => void,
  onComplete?: (status: string, exitCode?: number) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/cli/logs/${taskId}/stream`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.logs) {
      data.logs.forEach((log: CLILogEntry) => onLog(log));
    }
    
    if (data.done) {
      eventSource.close();
      onComplete?.(data.status, data.exitCode);
    }
  };

  eventSource.onerror = (error) => {
    eventSource.close();
    onError?.(new Error('Log stream error'));
  };

  return () => {
    eventSource.close();
  };
}

export async function cancelTask(taskId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/cli/cancel/${taskId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel task');
  }

  return response.json();
}

export async function getTaskHistory(limit = 20, offset = 0): Promise<{
  tasks: CLITaskSummary[];
  total: number;
}> {
  const response = await fetch(
    `${API_BASE}/api/cli/history?limit=${limit}&offset=${offset}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get task history');
  }

  return response.json();
}

export async function getActiveTasks(): Promise<{ tasks: CLITaskSummary[] }> {
  const response = await fetch(`${API_BASE}/api/cli/active`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get active tasks');
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; activeTasks: number }> {
  const response = await fetch(`${API_BASE}/api/health`);
  
  if (!response.ok) {
    throw new Error('API server is not available');
  }

  return response.json();
}
