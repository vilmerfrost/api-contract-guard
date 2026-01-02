import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EndpointGroup } from '@/types';
import { ChevronRight, Play, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface EndpointCardProps {
  group: EndpointGroup;
  onTest: () => void;
  isLoading?: boolean;
  testResult?: { passed: boolean; duration: number } | null;
}

export function EndpointCard({ group, onTest, isLoading, testResult }: EndpointCardProps) {
  const getMethodBadge = (method: string) => {
    const variants: Record<string, 'get' | 'post' | 'put' | 'patch' | 'delete'> = {
      GET: 'get',
      POST: 'post',
      PUT: 'put',
      PATCH: 'patch',
      DELETE: 'delete',
    };
    return variants[method] || 'secondary';
  };

  const hasTestableFlow = group.endpoints.some(e => e.method === 'GET') &&
    (group.endpoints.some(e => e.method === 'POST') || group.endpoints.some(e => e.method === 'DELETE'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-mono text-foreground">
              {group.resource}
            </CardTitle>
            {testResult && (
              <Badge variant={testResult.passed ? 'success' : 'destructive'}>
                {testResult.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {group.endpoints.map((endpoint, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <Badge variant={getMethodBadge(endpoint.method)} className="w-16 justify-center">
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono text-muted-foreground flex-1 truncate">
                  {endpoint.path}
                </code>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {testResult && (
              <span className="text-xs text-muted-foreground">
                Duration: {testResult.duration}ms
              </span>
            )}
            {!testResult && <span />}
            
            <Button
              size="sm"
              variant={hasTestableFlow ? 'default' : 'secondary'}
              onClick={onTest}
              disabled={isLoading || !hasTestableFlow}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Test
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {!hasTestableFlow && (
            <p className="text-xs text-muted-foreground italic">
              Needs GET + POST or DELETE for testing
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
