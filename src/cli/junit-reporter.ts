import { TestResult, Difference } from '../types/index.js';
import { writeFileSync } from 'fs';

/**
 * JUnit XML Reporter
 * 
 * Generates JUnit XML format test results for CI/CD integration
 */

interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  timestamp: string;
  testcases: JUnitTestCase[];
}

interface JUnitTestCase {
  classname: string;
  name: string;
  time: number;
  failure?: {
    message: string;
    type: string;
    content: string;
  };
  error?: {
    message: string;
    type: string;
    content: string;
  };
}

/**
 * Generate JUnit XML from test results
 */
export function generateJUnitXML(results: TestResult[], suiteName: string = 'API Regression Tests'): string {
  const testcases: JUnitTestCase[] = results.map(result => {
    const testcase: JUnitTestCase = {
      classname: 'APIRegressionTest',
      name: result.resource,
      time: result.duration / 1000, // Convert to seconds
    };
    
    if (!result.passed) {
      const failureMessage = formatFailureMessage(result);
      const failureDetails = formatFailureDetails(result);
      
      testcase.failure = {
        message: failureMessage,
        type: 'AssertionError',
        content: failureDetails
      };
    }
    
    return testcase;
  });
  
  const suite: JUnitTestSuite = {
    name: suiteName,
    tests: results.length,
    failures: results.filter(r => !r.passed).length,
    errors: 0,
    skipped: 0,
    time: results.reduce((sum, r) => sum + r.duration, 0) / 1000,
    timestamp: new Date().toISOString(),
    testcases
  };
  
  return buildXML(suite);
}

/**
 * Format failure message for JUnit
 */
function formatFailureMessage(result: TestResult): string {
  if (!result.differences || result.differences.length === 0) {
    return 'Test failed without specific differences';
  }
  
  const diffCount = result.differences.length;
  return `${diffCount} difference${diffCount !== 1 ? 's' : ''} found in API contract`;
}

/**
 * Format failure details for JUnit
 */
function formatFailureDetails(result: TestResult): string {
  const lines: string[] = [];
  
  lines.push(`Endpoint: ${result.resource}`);
  lines.push(`Duration: ${result.duration}ms`);
  lines.push('');
  
  if (result.steps && result.steps.length > 0) {
    lines.push('Test Steps:');
    result.steps.forEach(step => {
      if (step.error) {
        const statusInfo = step.status ? ` [${step.status}]` : '';
        const url = step.url || result.resource;
        const method = step.method || step.step;
        lines.push(`  ❌ ${step.step}${statusInfo}: ${method} ${url}`);
        lines.push(`     Error: ${step.error}`);
      } else if (step.status) {
        const statusSymbol = step.status >= 200 && step.status < 300 ? '✓' : '⚠';
        const url = step.url || result.resource;
        const method = step.method || step.step;
        lines.push(`  ${statusSymbol} ${step.step}: ${step.status} - ${method} ${url}`);
      } else {
        lines.push(`  - ${step.step}`);
      }
    });
    lines.push('');
  }
  
  // Add detailed failed requests section
  const failedSteps = result.steps?.filter(s => s.error || (s.status && (s.status < 200 || s.status >= 400)));
  if (failedSteps && failedSteps.length > 0) {
    lines.push('Failed Requests:');
    failedSteps.forEach(step => {
      const statusInfo = step.status ? `[${step.status}]` : '[ERROR]';
      const url = step.url || result.resource;
      const method = step.method || step.step;
      lines.push(`  ${method} ${url} ${statusInfo}`);
      if (step.error) {
        lines.push(`    └─ ${step.error}`);
      }
    });
    lines.push('');
  }
  
  if (result.differences && result.differences.length > 0) {
    lines.push('Differences:');
    result.differences.forEach((diff: Difference, idx: number) => {
      lines.push(`  ${idx + 1}. Path: ${diff.path}`);
      lines.push(`     Type: ${diff.type}`);
      lines.push(`     Expected: ${JSON.stringify(diff.expected)}`);
      lines.push(`     Actual: ${JSON.stringify(diff.actual)}`);
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

/**
 * Build JUnit XML string
 */
function buildXML(suite: JUnitTestSuite): string {
  const lines: string[] = [];
  
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<testsuites>');
  lines.push(`  <testsuite name="${escapeXml(suite.name)}" tests="${suite.tests}" failures="${suite.failures}" errors="${suite.errors}" skipped="${suite.skipped}" time="${suite.time.toFixed(3)}" timestamp="${suite.timestamp}">`);
  
  suite.testcases.forEach(testcase => {
    lines.push(`    <testcase classname="${escapeXml(testcase.classname)}" name="${escapeXml(testcase.name)}" time="${testcase.time.toFixed(3)}">`);
    
    if (testcase.failure) {
      lines.push(`      <failure message="${escapeXml(testcase.failure.message)}" type="${escapeXml(testcase.failure.type)}">`);
      lines.push(escapeXml(testcase.failure.content));
      lines.push('      </failure>');
    }
    
    if (testcase.error) {
      lines.push(`      <error message="${escapeXml(testcase.error.message)}" type="${escapeXml(testcase.error.type)}">`);
      lines.push(escapeXml(testcase.error.content));
      lines.push('      </error>');
    }
    
    lines.push('    </testcase>');
  });
  
  lines.push('  </testsuite>');
  lines.push('</testsuites>');
  
  return lines.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Write JUnit XML to file
 */
export function writeJUnitReport(results: TestResult[], outputPath: string, suiteName?: string): void {
  const xml = generateJUnitXML(results, suiteName);
  writeFileSync(outputPath, xml, 'utf-8');
  console.log(`📄 JUnit report written to: ${outputPath}`);
}

