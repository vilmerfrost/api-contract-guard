import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Endpoints from "./pages/Endpoints";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import { EndpointGroup, TestResult } from "./types";

const queryClient = new QueryClient();

const App = () => {
  const [config, setConfig] = useState<{
    swaggerUrl: string;
    baseUrl: string;
    auth: { type: 'none' | 'bearer' | 'apikey'; token?: string };
    endpointGroups: EndpointGroup[];
  }>({
    swaggerUrl: '',
    baseUrl: '',
    auth: { type: 'none' },
    endpointGroups: [],
  });

  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());

  const handleConfigUpdate = (newConfig: typeof config) => {
    setConfig(newConfig);
    setTestResults(new Map()); // Clear results when config changes
  };

  const handleTestComplete = (resource: string, result: TestResult) => {
    setTestResults(prev => {
      const newMap = new Map(prev);
      newMap.set(resource, result);
      return newMap;
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={<Home onConfigUpdate={handleConfigUpdate} />} 
            />
            <Route 
              path="/endpoints" 
              element={
                config.endpointGroups.length > 0 ? (
                  <Endpoints
                    swaggerUrl={config.swaggerUrl}
                    baseUrl={config.baseUrl}
                    auth={config.auth}
                    endpointGroups={config.endpointGroups}
                    onTestComplete={handleTestComplete}
                    testResults={testResults}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/results/:resource" 
              element={
                config.endpointGroups.length > 0 ? (
                  <Results
                    baseUrl={config.baseUrl}
                    auth={config.auth}
                    endpointGroups={config.endpointGroups}
                    testResults={testResults}
                    onTestComplete={handleTestComplete}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
