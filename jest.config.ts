import type { Config } from 'jest';

// passWithNoTests: true keeps `pnpm test` and `pnpm test:cov` green while the repo has
// zero specs. Once Stage 6 adds the first __tests__/ file, Jest finds matching specs and
// the 80% coverageThreshold below auto-activates without any further config edit.
const config: Config = {
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '(/__tests__/.*|\\.spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['src/main.ts', '.*\\.module\\.ts$', '.*/dto/.*\\.dto\\.ts$'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      functions: 80,
      statements: 80,
    },
  },
  passWithNoTests: true,
};

export default config;
