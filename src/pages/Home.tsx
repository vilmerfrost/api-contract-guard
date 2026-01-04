import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { parseSwaggerUrl } from '@/lib/swagger';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Shield, GitCompare, ArrowRight, Server, TestTube } from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeProps {
  onConfigUpdate: (config: {
    swaggerUrl: string;
    baseUrl: string;
    auth: { 
      type: 'none' | 'bearer' | 'apikey' | 'oauth2'; 
      token?: string;
      username?: string;
      password?: string;
      tokenUrl?: string;
    };
    endpointGroups: any[];
  }) => void;
}

export default function Home({ onConfigUpdate }: HomeProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [swaggerUrl, setSwaggerUrl] = useState('https://petstore.swagger.io/v2/swagger.json');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'apikey' | 'oauth2'>('none');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleParse = async () => {
    if (!swaggerUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a Swagger/OpenAPI URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { groups, baseUrl } = await parseSwaggerUrl(swaggerUrl);
      
      if (groups.length === 0) {
        toast({
          title: 'No Endpoints Found',
          description: 'The Swagger specification appears to have no endpoints',
          variant: 'destructive',
        });
        return;
      }

      onConfigUpdate({
        swaggerUrl,
        baseUrl,
        auth: { 
          type: authType, 
          token: token || undefined,
          username: username || undefined,
          password: password || undefined,
          tokenUrl: tokenUrl || undefined,
        },
        endpointGroups: groups,
      });

      toast({
        title: 'Endpoints Discovered!',
        description: `Found ${groups.length} resources with ${groups.reduce((sum, g) => sum + g.endpoints.length, 0)} endpoints`,
      });

      navigate('/endpoints');
    } catch (error: any) {
      toast({
        title: 'Parsing Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Server,
      title: 'Swagger Parser',
      description: 'Auto-discover endpoints from OpenAPI specs',
    },
    {
      icon: TestTube,
      title: 'Regression Tests',
      description: 'GET → DELETE → POST → VERIFY flow',
    },
    {
      icon: GitCompare,
      title: 'JSON Diff',
      description: 'Visual comparison of API responses',
    },
    {
      icon: Shield,
      title: 'Auth Support',
      description: 'OAuth2, Bearer tokens, and API keys',
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            API Contract Testing Made Simple
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            API Regression{' '}
            <span className="text-gradient">Test Suite</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Automated contract testing for your REST APIs. Parse Swagger specs, 
            run regression tests, and compare responses with visual diffs.
          </p>
        </motion.div>

        {/* Main Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="mb-8 shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Configure API Source</CardTitle>
              <CardDescription>
                Enter your Swagger/OpenAPI specification URL to discover endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Swagger URL */}
              <div className="space-y-2">
                <Label htmlFor="swagger-url">Swagger/OpenAPI URL</Label>
                <Input
                  id="swagger-url"
                  type="url"
                  placeholder="https://api.example.com/swagger.json"
                  value={swaggerUrl}
                  onChange={(e) => setSwaggerUrl(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports OpenAPI 2.0 (Swagger) and 3.0 specifications
                </p>
              </div>

              {/* Auth Configuration */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="auth-type">Authentication</Label>
                  <Select value={authType} onValueChange={(v) => setAuthType(v as any)}>
                    <SelectTrigger id="auth-type">
                      <SelectValue placeholder="Select auth type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="oauth2">OAuth2 Username/Password</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {authType === 'oauth2' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="token-url">Token Endpoint URL</Label>
                        <Input
                          id="token-url"
                          type="url"
                          placeholder="https://api.example.com/oauth/token"
                          value={tokenUrl}
                          onChange={(e) => setTokenUrl(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      OAuth2 password grant flow. Credentials are never logged or exported.
                    </p>
                  </motion.div>
                )}

                {(authType === 'bearer' || authType === 'apikey') && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="token">
                      {authType === 'bearer' ? 'Bearer Token' : 'API Key'}
                    </Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder={authType === 'bearer' ? 'eyJhbGciOiJ...' : 'sk_live_...'}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </motion.div>
                )}
              </div>

              {/* Parse Button */}
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={handleParse}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Parsing Specification...
                  </>
                ) : (
                  <>
                    Parse Endpoints
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature, idx) => (
            <Card key={idx} className="bg-card/50 border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          Try with the{' '}
          <button
            onClick={() => setSwaggerUrl('https://petstore.swagger.io/v2/swagger.json')}
            className="text-primary hover:underline"
          >
            Petstore API
          </button>
          {' '}for a quick demo
        </motion.p>
      </div>
    </div>
  );
}
