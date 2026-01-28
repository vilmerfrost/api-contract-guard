import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CLI_COMMANDS, CLICommandConfig, CLICommandOption } from '@/types/cli';
import { Play, Terminal, ChevronDown, ChevronUp, Save, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandBuilderProps {
  onExecute: (command: string, args: string[], description: string) => void;
  isRunning?: boolean;
  className?: string;
}

export function CommandBuilder({ onExecute, isRunning, className = '' }: CommandBuilderProps) {
  const [selectedCommand, setSelectedCommand] = useState<string>(CLI_COMMANDS[0].name);
  const [values, setValues] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<Array<{ name: string; command: string; values: Record<string, any> }>>([]);

  const currentCommand = CLI_COMMANDS.find(cmd => cmd.name === selectedCommand)!;

  const requiredOptions = currentCommand.options.filter(opt => opt.required);
  const advancedOptions = currentCommand.options.filter(opt => !opt.required);

  const handleValueChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const buildArgs = (): string[] => {
    const args: string[] = [];
    
    currentCommand.options.forEach(option => {
      const value = values[option.name];
      
      if (value === undefined || value === '' || value === false) return;
      if (value === option.default) return;
      
      if (option.type === 'boolean') {
        if (value === true) {
          args.push(option.flag);
        }
      } else {
        args.push(`${option.flag}=${value}`);
      }
    });
    
    return args;
  };

  const handleExecute = () => {
    const args = buildArgs();
    const description = `${currentCommand.name}: ${values.swaggerUrl || values.apiUrl || 'CLI Task'}`;
    onExecute(currentCommand.name, args, description);
  };

  const handleSaveConfig = () => {
    const name = prompt('Enter a name for this configuration:');
    if (name) {
      setSavedConfigs(prev => [...prev, { name, command: selectedCommand, values: { ...values } }]);
    }
  };

  const loadConfig = (config: typeof savedConfigs[0]) => {
    setSelectedCommand(config.command);
    setValues(config.values);
  };

  const renderField = (option: CLICommandOption) => {
    const value = values[option.name];

    switch (option.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{option.name}</Label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              checked={value ?? option.default ?? false}
              onCheckedChange={(checked) => handleValueChange(option.name, checked)}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={option.name} className="text-sm font-medium">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value ?? option.default ?? ''}
              onValueChange={(val) => handleValueChange(option.name, val)}
            >
              <SelectTrigger id={option.name}>
                <SelectValue placeholder={`Select ${option.name}`} />
              </SelectTrigger>
              <SelectContent>
                {option.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={option.name} className="text-sm font-medium">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={option.name}
              type="number"
              value={value ?? option.default ?? ''}
              onChange={(e) => handleValueChange(option.name, parseInt(e.target.value))}
              placeholder={option.placeholder}
            />
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={option.name} className="text-sm font-medium">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={option.name}
              type={option.name.toLowerCase().includes('password') ? 'password' : 'text'}
              value={value ?? ''}
              onChange={(e) => handleValueChange(option.name, e.target.value)}
              placeholder={option.placeholder}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        );
    }
  };

  const isValid = requiredOptions.every(opt => {
    const value = values[opt.name];
    return value !== undefined && value !== '' && value !== null;
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Command Builder
            </CardTitle>
            <CardDescription>Configure and execute CLI commands</CardDescription>
          </div>
          
          {savedConfigs.length > 0 && (
            <Select onValueChange={(idx) => loadConfig(savedConfigs[parseInt(idx)])}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load saved config..." />
              </SelectTrigger>
              <SelectContent>
                {savedConfigs.map((config, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Command Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Command</Label>
          <Select value={selectedCommand} onValueChange={setSelectedCommand}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLI_COMMANDS.map(cmd => (
                <SelectItem key={cmd.name} value={cmd.name}>
                  <div className="flex flex-col items-start">
                    <span className="font-mono font-medium">{cmd.name}</span>
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Required Fields */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Required Options
          </h4>
          {requiredOptions.map(option => (
            <motion.div
              key={option.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {renderField(option)}
            </motion.div>
          ))}
        </div>

        {/* Advanced Options */}
        {advancedOptions.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced Options
              <Badge variant="secondary" className="text-xs">{advancedOptions.length}</Badge>
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {advancedOptions.map(option => (
                    <motion.div
                      key={option.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {renderField(option)}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Command Preview */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
          <Label className="text-xs text-slate-500 uppercase tracking-wider">Command Preview</Label>
          <code className="block mt-2 text-sm font-mono text-slate-300">
            api-contract-guard {selectedCommand} {buildArgs().join(' ')}
          </code>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="hero"
            size="lg"
            className="flex-1 gap-2"
            onClick={handleExecute}
            disabled={!isValid || isRunning}
          >
            {isRunning ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Execute Command
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={handleSaveConfig}
            disabled={!isValid}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
