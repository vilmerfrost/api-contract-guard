import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CommandBuilder } from '@/components/CommandBuilder';
import { Terminal } from '@/components/Terminal';
import { ExecutionHistory } from '@/components/ExecutionHistory';
import { CLITask, CLITaskSummary, CLILogEntry } from '@/types/cli';
import { 
  executeCLI, 
  streamTaskLogs, 
  getTaskHistory, 
  cancelTask,
  checkHealth 
} from '@/lib/cli-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Terminal as TerminalIcon, 
  History, 
  Settings,
  Server,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<CLITask | null>(null);
  const [logs, setLogs] = useState<CLILogEntry[]>([]);
  const [history, setHistory] = useState<CLITaskSummary[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'run' | 'history' | 'settings'>('run');

  // Check server health on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await checkHealth();
        setIsServerConnected(true);
      } catch {
        setIsServerConnected(false);
        toast({
          title: 'Server Not Connected',
          description: 'Please start the API server with "npm run server"',
          variant: 'destructive',
        });
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getTaskHistory(20);
      setHistory(data.tasks);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleExecute = useCallback(async (command: string, args: string[], description: string) => {
    try {
      setLogs([]);
      
      const { taskId } = await executeCLI({
        command,
        args,
        description,
      });

      const newTask: CLITask = {
        id: taskId,
        command,
        args,
        status: 'running',
        startTime: new Date().toISOString(),
        logs: [],
        metadata: { description },
      };

      setActiveTask(newTask);
      setSelectedTaskId(taskId);

      // Start streaming logs
      const unsubscribe = streamTaskLogs(
        taskId,
        (log) => {
          setLogs(prev => [...prev, log]);
        },
        async (status, exitCode) => {
          setActiveTask(prev => prev ? { ...prev, status: status as CLITask['status'] } : null);
          
          if (status === 'completed') {
            toast({
              title: 'Task Completed',
              description: `${command} finished successfully`,
            });
          } else if (status === 'failed') {
            toast({
              title: 'Task Failed',
              description: `${command} exited with code ${exitCode}`,
              variant: 'destructive',
            });
          }
          
          // Refresh history
          loadHistory();
        },
        (error) => {
          toast({
            title: 'Log Stream Error',
            description: error.message,
            variant: 'destructive',
          });
        }
      );

      // Cleanup function stored on the task
      (newTask as any).unsubscribe = unsubscribe;

    } catch (error: any) {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleCancel = async () => {
    if (!activeTask || activeTask.status !== 'running') return;
    
    try {
      await cancelTask(activeTask.id);
      toast({
        title: 'Task Cancelled',
        description: 'The running task has been cancelled',
      });
    } catch (error: any) {
      toast({
        title: 'Cancel Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSelectTask = (task: CLITaskSummary) => {
    setSelectedTaskId(task.id);
    // In a real implementation, you'd fetch the logs for this task
    // For now, we just show the selection
  };

  const handleRerun = (task: CLITaskSummary) => {
    // Reconstruct the command from the task
    handleExecute(task.command, [], task.metadata.description || '');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                <TerminalIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">API Contract Guard</h1>
                <p className="text-sm text-muted-foreground">CLI Control Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Server Status */}
              <div className="flex items-center gap-2">
                {isServerConnected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Server Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Server Offline</span>
                  </>
                )}
              </div>
              
              {/* Active Task Badge */}
              {activeTask?.status === 'running' && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Command Builder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <CommandBuilder
              onExecute={handleExecute}
              isRunning={activeTask?.status === 'running'}
            />
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <History className="h-4 w-4" />
                  <span className="text-sm">Total Runs</span>
                </div>
                <p className="text-2xl font-bold">{history.length}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Success Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {history.length > 0
                    ? Math.round(
                        (history.filter(t => t.status === 'completed').length / history.length) * 100
                      )
                    : 0}%
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Terminal & History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Terminal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TerminalIcon className="h-5 w-5" />
                  Live Output
                </h2>
                {activeTask?.status === 'running' && (
                  <Button variant="destructive" size="sm" onClick={handleCancel}>
                    Cancel Task
                  </Button>
                )}
              </div>
              
              <Terminal
                logs={logs}
                isRunning={activeTask?.status === 'running'}
                onClear={handleClearLogs}
                className="h-[400px]"
              />
            </div>

            {/* Execution History */}
            <ExecutionHistory
              tasks={history}
              onSelect={handleSelectTask}
              onRerun={handleRerun}
              selectedTaskId={selectedTaskId || undefined}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
