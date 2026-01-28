import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CLITaskSummary } from '@/types/cli';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw,
  Terminal,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ExecutionHistoryProps {
  tasks: CLITaskSummary[];
  onSelect: (task: CLITaskSummary) => void;
  onRerun: (task: CLITaskSummary) => void;
  selectedTaskId?: string;
  className?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' },
  running: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  cancelled: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Cancelled' },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

export function ExecutionHistory({ 
  tasks, 
  onSelect, 
  onRerun, 
  selectedTaskId,
  className = '' 
}: ExecutionHistoryProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Execution History
          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No executions yet</p>
                <p className="text-sm">Run a command to see history</p>
              </div>
            ) : (
              tasks.map((task, index) => {
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;
                const isSelected = selectedTaskId === task.id;
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(task)}
                    className={`
                      group flex items-center gap-3 p-3 rounded-lg cursor-pointer
                      transition-all duration-200
                      ${isSelected 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted border border-transparent'
                      }
                    `}
                  >
                    {/* Status Icon */}
                    <div className={`p-2 rounded-full ${status.bg} ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-medium truncate">
                          {task.command}
                        </code>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {task.logCount} logs
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatTime(task.startTime)}</span>
                        <span>•</span>
                        <span>{formatDuration(task.duration)}</span>
                        {task.metadata.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{task.metadata.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRerun(task);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
