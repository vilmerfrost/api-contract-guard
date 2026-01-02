import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResultsTimeline } from '@/components/ResultsTimeline';
import { DiffViewer } from '@/components/DiffViewer';
import { EndpointGroup, TestResult, TestStep } from '@/types';
import { runEndpointTest } from '@/lib/tester';
import { generateTestResultsJSON, downloadFile } from '@/lib/exporter';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, RefreshCw, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResultsProps {
  baseUrl: string;
  auth: { type: 'none' | 'bearer' | 'apikey'; token?: string };
  endpointGroups: EndpointGroup[];
  testResults: Map<string, TestResult>;
  onTestComplete: (resource: string, result: TestResult) => void;
}

export default function Results({
  baseUrl,
  auth,
  endpointGroups,
  testResults,
  onTestComplete,
}: ResultsProps) {
  const navigate = useNavigate();
  const { resource } = useParams<{ resource: string }>();
  const { toast } = useToast();
  
  const decodedResource = decodeURIComponent(resource || '');
  const group = endpointGroups.find(g => g.resource === decodedResource);
  const result = testResults.get(decodedResource);

  const [isRetesting, setIsRetesting] = useState(false);
  const [liveSteps, setLiveSteps] = useState<TestStep[]>([]);
  const [isLiveRunning, setIsLiveRunning] = useState(false);

  useEffect(() => {
    // If no result exists, run the test
    if (group && !result && !isLiveRunning) {
      runTest();
    }
  }, [group, result]);

  const runTest = async () => {
    if (!group) return;

    setIsLiveRunning(true);
    setLiveSteps([]);

    try {
      const testResult = await runEndpointTest(baseUrl, group, auth, (step) => {
        setLiveSteps(prev => [...prev, step]);
      });
      
      onTestComplete(decodedResource, testResult);
      setIsLiveRunning(false);
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsLiveRunning(false);
    }
  };

  const handleRetest = async () => {
    setIsRetesting(true);
    await runTest();
    setIsRetesting(false);
  };

  const handleExportResults = () => {
    if (!result) return;
    
    const json = generateTestResultsJSON([result]);
    downloadFile(json, `test-results-${decodedResource.replace(/\//g, '-')}.json`, 'application/json');
    
    toast({
      title: 'Results Exported',
      description: 'Downloaded test results JSON',
    });
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Resource not found</p>
          <Button onClick={() => navigate('/endpoints')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Endpoints
          </Button>
        </div>
      </div>
    );
  }

  const displaySteps = result?.steps || liveSteps;
  const compareStep = displaySteps.find(s => s.step === 'COMPARE');
  const displayResult = result || (displaySteps.length > 0 ? {
    passed: compareStep?.data?.differences?.length === 0,
    duration: displaySteps.reduce((_, s) => Date.now() - new Date(displaySteps[0]?.timestamp || Date.now()).getTime(), 0),
    steps: displaySteps,
    differences: compareStep?.data?.differences || [],
    resource: decodedResource,
  } : null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">
              Home
            </button>
            <span>/</span>
            <button onClick={() => navigate('/endpoints')} className="hover:text-foreground transition-colors">
              Endpoints
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Results</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold font-mono text-foreground">{decodedResource}</h1>
                {displayResult && (
                  <Badge variant={displayResult.passed ? 'success' : 'destructive'}>
                    {displayResult.passed ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        PASSED
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        FAILED
                      </>
                    )}
                  </Badge>
                )}
              </div>
              {displayResult && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Duration: {displayResult.duration}ms
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/endpoints')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {displayResult && (
                <Button
                  variant="outline"
                  onClick={handleExportResults}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              <Button
                variant="default"
                onClick={handleRetest}
                disabled={isRetesting || isLiveRunning}
              >
                {isRetesting || isLiveRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retest
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Results Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">Test Timeline</TabsTrigger>
              <TabsTrigger value="diff">Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Execution Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultsTimeline 
                    steps={displaySteps} 
                    isRunning={isLiveRunning}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diff">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">JSON Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  {compareStep?.data ? (
                    <DiffViewer
                      original={compareStep.data.original}
                      verified={compareStep.data.verified}
                      differences={compareStep.data.differences || []}
                    />
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      {isLiveRunning ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Waiting for comparison results...
                        </div>
                      ) : (
                        'No comparison data available'
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
