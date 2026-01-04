import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EndpointCard } from '@/components/EndpointCard';
import { EndpointGroup, TestResult, AuthConfig } from '@/types';
import { runEndpointTest } from '@/lib/tester';
import { generateYAMLConfig, downloadFile } from '@/lib/exporter';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Play, Loader2, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

interface EndpointsProps {
  swaggerUrl: string;
  baseUrl: string;
  auth: AuthConfig;
  endpointGroups: EndpointGroup[];
  onTestComplete: (resource: string, result: TestResult) => void;
  testResults: Map<string, TestResult>;
}

export default function Endpoints({
  swaggerUrl,
  baseUrl,
  auth,
  endpointGroups,
  onTestComplete,
  testResults,
}: EndpointsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loadingResource, setLoadingResource] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const handleTestResource = async (group: EndpointGroup) => {
    setLoadingResource(group.resource);

    try {
      const result = await runEndpointTest(baseUrl, group, auth);
      onTestComplete(group.resource, result);
      
      navigate(`/results/${encodeURIComponent(group.resource)}`);
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingResource(null);
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    
    let passed = 0;
    let failed = 0;

    for (const group of endpointGroups) {
      const hasTestableFlow = group.endpoints.some(e => e.method === 'GET') &&
        (group.endpoints.some(e => e.method === 'POST') || group.endpoints.some(e => e.method === 'DELETE'));
      
      if (!hasTestableFlow) continue;

      try {
        setLoadingResource(group.resource);
        const result = await runEndpointTest(baseUrl, group, auth);
        onTestComplete(group.resource, result);
        
        if (result.passed) passed++;
        else failed++;
      } catch (error) {
        failed++;
      }
    }

    setLoadingResource(null);
    setIsTestingAll(false);

    toast({
      title: 'All Tests Complete',
      description: `${passed} passed, ${failed} failed`,
      variant: passed > 0 && failed === 0 ? 'default' : 'destructive',
    });
  };

  const handleExportConfig = () => {
    const yaml = generateYAMLConfig(swaggerUrl, baseUrl, auth, endpointGroups);
    downloadFile(yaml, 'regression-config.yaml', 'application/x-yaml');
    
    toast({
      title: 'Config Exported',
      description: 'Downloaded regression-config.yaml',
    });
  };

  const totalEndpoints = endpointGroups.reduce((sum, g) => sum + g.endpoints.length, 0);
  const testedCount = testResults.size;
  const passedCount = Array.from(testResults.values()).filter(r => r.passed).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">Discovered Endpoints</h1>
                <Badge variant="secondary" className="text-sm">
                  {endpointGroups.length} resources
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {totalEndpoints} endpoints from{' '}
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {baseUrl}
                </code>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExportConfig}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Config
              </Button>
              <Button
                variant="hero"
                onClick={handleTestAll}
                disabled={isTestingAll}
                className="gap-2"
              >
                {isTestingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing All...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Test All
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Stats */}
          {testedCount > 0 && (
            <div className="flex items-center gap-4 mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Tested: <span className="font-medium text-foreground">{testedCount}/{endpointGroups.length}</span>
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <Badge variant="success">{passedCount} Passed</Badge>
              {testedCount - passedCount > 0 && (
                <Badge variant="destructive">{testedCount - passedCount} Failed</Badge>
              )}
            </div>
          )}
        </motion.div>

        {/* Endpoint Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {endpointGroups.map((group, idx) => (
            <EndpointCard
              key={group.resource}
              group={group}
              onTest={() => handleTestResource(group)}
              isLoading={loadingResource === group.resource}
              testResult={testResults.get(group.resource) ? {
                passed: testResults.get(group.resource)!.passed,
                duration: testResults.get(group.resource)!.duration,
              } : null}
            />
          ))}
        </div>

        {endpointGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No endpoints discovered. Try a different Swagger URL.</p>
          </div>
        )}
      </div>
    </div>
  );
}
