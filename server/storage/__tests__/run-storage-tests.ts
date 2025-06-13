
/**
 * File: run-storage-tests.ts
 * Responsibility: Test runner script for all storage module tests
 * Notes: Provides a convenient way to run all storage tests together
 */

import { execSync } from 'child_process';
import { join } from 'path';

const testFiles = [
  'base-storage.test.ts',
  'content-storage.test.ts',
  'corporation-storage.test.ts',
  'user-storage.test.ts',
  'exploration-storage.test.ts',
  'tactical-storage.test.ts',
  'index.test.ts'
];

console.log('🧪 Running Storage Module Tests...\n');

let passedTests = 0;
let failedTests = 0;

for (const testFile of testFiles) {
  const testPath = join(__dirname, testFile);
  
  try {
    console.log(`📝 Running ${testFile}...`);
    
    execSync(`npx jest ${testPath} --verbose`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`✅ ${testFile} passed\n`);
    passedTests++;
    
  } catch (error) {
    console.log(`❌ ${testFile} failed\n`);
    failedTests++;
  }
}

console.log('📊 Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📁 Total: ${testFiles.length}`);

if (failedTests === 0) {
  console.log('\n🎉 All storage tests passed!');
  process.exit(0);
} else {
  console.log('\n💥 Some storage tests failed!');
  process.exit(1);
}
