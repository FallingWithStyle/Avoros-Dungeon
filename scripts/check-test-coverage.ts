
/**
 * File: check-test-coverage.ts
 * Responsibility: Analyze test coverage and identify untested functions across the codebase
 * Notes: Parses TypeScript files to find exported functions and cross-references with test files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface FunctionInfo {
  name: string;
  file: string;
  line: number;
  isTested: boolean;
}

function findTsFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      findTsFiles(fullPath, files);
    } else if (extname(item) === '.ts' && !item.includes('.test.') && !item.includes('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractFunctions(filePath: string): FunctionInfo[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const functions: FunctionInfo[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match exported functions, methods, and arrow functions
    const functionMatch = line.match(/export\s+(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\()/);
    const methodMatch = line.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
    
    if (functionMatch) {
      const name = functionMatch[1] || functionMatch[2] || functionMatch[3];
      if (name && !name.startsWith('_')) {
        functions.push({
          name,
          file: filePath,
          line: i + 1,
          isTested: false
        });
      }
    } else if (methodMatch && !line.includes('//') && !line.includes('import')) {
      const name = methodMatch[1];
      if (name && !name.startsWith('_') && name !== 'constructor') {
        functions.push({
          name,
          file: filePath,
          line: i + 1,
          isTested: false
        });
      }
    }
  }
  
  return functions;
}

function findTestFiles(dir: string): string[] {
  const testFiles: string[] = [];
  
  function searchDir(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules')) {
        searchDir(fullPath);
      } else if (item.includes('.test.ts')) {
        testFiles.push(fullPath);
      }
    }
  }
  
  searchDir(dir);
  return testFiles;
}

function checkIfFunctionIsTested(funcName: string, testFiles: string[]): boolean {
  for (const testFile of testFiles) {
    const content = readFileSync(testFile, 'utf-8');
    // Look for the function name in test descriptions or actual test calls
    if (content.includes(funcName)) {
      return true;
    }
  }
  return false;
}

function main() {
  console.log('🔍 Analyzing test coverage...\n');
  
  const sourceFiles = [
    ...findTsFiles('shared'),
    ...findTsFiles('server')
  ];
  
  const testFiles = findTestFiles('.');
  
  console.log(`Found ${sourceFiles.length} source files and ${testFiles.length} test files\n`);
  
  let allFunctions: FunctionInfo[] = [];
  
  for (const file of sourceFiles) {
    const functions = extractFunctions(file);
    allFunctions = allFunctions.concat(functions);
  }
  
  // Check which functions are tested
  for (const func of allFunctions) {
    func.isTested = checkIfFunctionIsTested(func.name, testFiles);
  }
  
  const testedFunctions = allFunctions.filter(f => f.isTested);
  const untestedFunctions = allFunctions.filter(f => !f.isTested);
  
  console.log(`📊 Coverage Summary:`);
  console.log(`Total functions: ${allFunctions.length}`);
  console.log(`Tested functions: ${testedFunctions.length}`);
  console.log(`Untested functions: ${untestedFunctions.length}`);
  console.log(`Coverage: ${((testedFunctions.length / allFunctions.length) * 100).toFixed(1)}%\n`);
  
  if (untestedFunctions.length > 0) {
    console.log('❌ Untested Functions:');
    console.log('='.repeat(50));
    
    const groupedByFile = untestedFunctions.reduce((acc, func) => {
      if (!acc[func.file]) acc[func.file] = [];
      acc[func.file].push(func);
      return acc;
    }, {} as Record<string, FunctionInfo[]>);
    
    for (const [file, functions] of Object.entries(groupedByFile)) {
      console.log(`\n📁 ${file}:`);
      for (const func of functions) {
        console.log(`  • ${func.name} (line ${func.line})`);
      }
    }
  }
  
  if (testedFunctions.length > 0) {
    console.log('\n✅ Tested Functions:');
    console.log('='.repeat(50));
    
    const groupedByFile = testedFunctions.reduce((acc, func) => {
      if (!acc[func.file]) acc[func.file] = [];
      acc[func.file].push(func);
      return acc;
    }, {} as Record<string, FunctionInfo[]>);
    
    for (const [file, functions] of Object.entries(groupedByFile)) {
      console.log(`\n📁 ${file}:`);
      for (const func of functions) {
        console.log(`  • ${func.name} (line ${func.line})`);
      }
    }
  }
}

// Check if this module is being run directly (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
