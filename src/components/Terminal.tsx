import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CLILogEntry } from '@/types/cli';
import { Pause, Play, Download, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TerminalProps {
  logs: CLILogEntry[];
  isRunning?: boolean;
  onClear?: () => void;
  className?: string;
}

const levelColors: Record<CLILogEntry['level'], string> = {
  info: 'text-blue-400',
  error: 'text-red-400',
  warn: 'text-yellow-400',
  success: 'text-green-400',
  debug: 'text-gray-400',
};

const levelBgColors: Record<CLILogEntry['level'], string> = {
  info: 'bg-blue-500/10',
  error: 'bg-red-500/10',
  warn: 'bg-yellow-500/10',
  success: 'bg-green-500/10',
  debug: 'bg-gray-500/10',
};

export function Terminal({ logs, isRunning, onClear, className = '' }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Set<CLILogEntry['level']>>(
    new Set(['info', 'error', 'warn', 'success', 'debug'])
  );

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll to toggle auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevels.has(log.level);
    return matchesSearch && matchesLevel;
  });

  const handleExport = () => {
    const content = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cli-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleLevel = (level: CLILogEntry['level']) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  return (
    <div className={`flex flex-col bg-slate-950 rounded-lg border border-slate-800 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Terminal</span>
          {isRunning && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">
              Running
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Level filters */}
          <div className="flex items-center gap-1 mr-4">
            {(['info', 'error', 'warn', 'success'] as const).map((level) => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  selectedLevels.has(level)
                    ? `${levelBgColors[level]} ${levelColors[level]}`
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Search */}
          {showSearch && (
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-8 text-xs bg-slate-800 border-slate-700"
              autoFocus
            />
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-400"
              onClick={onClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal content */}
      <ScrollArea 
        ref={scrollRef}
        className="flex-1 bg-black font-mono text-sm"
        onScroll={handleScroll}
      >
        <div className="p-4 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-8">
              {logs.length === 0 ? 'No logs yet...' : 'No logs match your filters'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`flex gap-3 py-0.5 px-2 -mx-2 rounded ${levelBgColors[log.level]} hover:bg-slate-900/50 transition-colors`}
              >
                <span className="text-slate-600 text-xs shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`text-xs font-bold uppercase shrink-0 w-16 ${levelColors[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-slate-300 whitespace-pre-wrap break-all">
                  {log.message}
                </span>
              </div>
            ))
          )}
          
          {isRunning && (
            <div className="flex items-center gap-2 py-2 text-slate-500">
              <span className="animate-pulse">▋</span>
              <span className="text-xs">Waiting for output...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-500">
            {filteredLogs.length} / {logs.length} lines
          </span>
          {searchQuery && (
            <span className="text-blue-400">
              Filtered by: "{searchQuery}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-slate-500">
            {autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          </span>
        </div>
      </div>
    </div>
  );
}
