import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathPattern: ['__tests__'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/lib/auditEngine.ts',
    'src/lib/pricing.ts',
    'src/types/index.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
};

export default config;
