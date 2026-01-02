import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TestStep } from '@/types';
import { CheckCircle2, XCircle, AlertCircle, Clock, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResultsTimelineProps {
  steps: TestStep[];
  isRunning?: boolean;
}

export function ResultsTimeline({ steps, isRunning }: ResultsTimelineProps) {
  const getStepIcon = (step: TestStep) => {
    if (step.error && step.step !== 'DELETE') {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (step.status && step.status >= 200 && step.status < 300) {
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
    if (step.status === 404 && step.step === 'DELETE') {
      return <AlertCircle className="h-5 w-5 text-warning" />;
    }
    if (step.error) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  const getStepLabel = (step: TestStep) => {
    switch (step.step) {
      case 'GET':
        return 'Fetch Original';
      case 'DELETE':
        return 'Delete Resource';
      case 'POST':
        return 'Recreate Resource';
      case 'VERIFY':
        return 'Verify Created';
      case 'COMPARE':
        return 'Compare Results';
      default:
        return step.step;
    }
  };

  const getStatusBadge = (step: TestStep) => {
    if (step.step === 'COMPARE') {
      const differences = step.data?.differences || [];
      return differences.length === 0 ? (
        <Badge variant="success">MATCH</Badge>
      ) : (
        <Badge variant="warning">{differences.length} DIFF(S)</Badge>
      );
    }
    
    if (step.status) {
      const variant = step.status >= 200 && step.status < 300 ? 'success' :
        step.status === 404 ? 'warning' : 'destructive';
      return <Badge variant={variant}>{step.status}</Badge>;
    }
    
    if (step.error) {
      return <Badge variant="destructive">ERROR</Badge>;
    }
    
    return <Badge variant="secondary">PENDING</Badge>;
  };

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.1 }}
        >
          <div className="relative flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-card">
                {getStepIcon(step)}
              </div>
              {idx < steps.length - 1 && (
                <div className="h-full w-0.5 bg-border flex-1 min-h-[20px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-foreground">{getStepLabel(step)}</h4>
                  {step.method && (
                    <Badge 
                      variant={step.method.toLowerCase() as any}
                      className="text-[10px]"
                    >
                      {step.method}
                    </Badge>
                  )}
                </div>
                {getStatusBadge(step)}
              </div>

              {step.url && (
                <code className="text-xs font-mono text-muted-foreground block mb-2">
                  {step.url}
                </code>
              )}

              {step.error && (
                <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{step.error}</p>
                </div>
              )}

              {step.data && step.step !== 'COMPARE' && !step.error && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View response data
                  </summary>
                  <pre className="mt-2 p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(step.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {isRunning && (
        <div className="flex gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-card animate-pulse">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 py-2">
            <p className="text-sm text-muted-foreground">Running...</p>
          </div>
        </div>
      )}
    </div>
  );
}
