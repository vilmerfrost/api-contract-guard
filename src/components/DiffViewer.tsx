import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Difference } from '@/types';
import { motion } from 'framer-motion';

interface DiffViewerProps {
  original: any;
  verified: any;
  differences: Difference[];
}

export function DiffViewer({ original, verified, differences }: DiffViewerProps) {
  if (!original && !verified) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data available for comparison
      </div>
    );
  }

  const getDiffTypeColor = (type: Difference['type']) => {
    switch (type) {
      case 'added':
        return 'diff-added';
      case 'removed':
        return 'diff-removed';
      case 'changed':
        return 'diff-changed';
      default:
        return '';
    }
  };

  const getDiffBadge = (type: Difference['type']) => {
    switch (type) {
      case 'added':
        return <Badge variant="success" className="text-[10px]">ADDED</Badge>;
      case 'removed':
        return <Badge variant="destructive" className="text-[10px]">REMOVED</Badge>;
      case 'changed':
        return <Badge variant="warning" className="text-[10px]">CHANGED</Badge>;
      default:
        return null;
    }
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Differences Summary */}
      {differences.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning" />
            {differences.length} Difference{differences.length !== 1 ? 's' : ''} Found
          </h4>
          
          <div className="space-y-2">
            {differences.map((diff, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-3 rounded-md font-mono text-xs ${getDiffTypeColor(diff.type)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-foreground font-semibold">{diff.path}</code>
                  {getDiffBadge(diff.type)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Expected</span>
                    <pre className="mt-1 whitespace-pre-wrap break-words">
                      {formatValue(diff.expected)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Actual</span>
                    <pre className="mt-1 whitespace-pre-wrap break-words">
                      {formatValue(diff.actual)}
                    </pre>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-lg bg-success/10 border border-success/20 text-center"
        >
          <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
            <svg
              className="h-6 w-6 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="font-medium text-success">Perfect Match!</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Original and recreated data are identical (ignoring metadata fields)
          </p>
        </motion.div>
      )}

      {/* Side by Side View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Original
          </h4>
          <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-80">
            {original ? JSON.stringify(original, null, 2) : 'No data'}
          </pre>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Verified
          </h4>
          <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-80">
            {verified ? JSON.stringify(verified, null, 2) : 'No data'}
          </pre>
        </div>
      </div>
    </div>
  );
}
