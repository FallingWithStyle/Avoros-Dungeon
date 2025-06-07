module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/client/src/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(some-esm-package)/)"
  ],
  testTimeout: 10000, // 10 second timeout for individual tests
  maxWorkers: 1, // Run tests serially to avoid timer conflicts
  verbose: false // Reduce test output
};