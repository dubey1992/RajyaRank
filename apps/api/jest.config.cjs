/** Unit tests for API services (no DB). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: {
    '^@rajyarank/auth$': '<rootDir>/../../../packages/auth/src/index.ts',
    '^@rajyarank/contracts$': '<rootDir>/../../../packages/contracts/src/index.ts',
    '^@rajyarank/config/env$': '<rootDir>/../../../packages/config/src/env.ts',
  },
};
