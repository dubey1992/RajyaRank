/** Integration tests: real Postgres + Redis (docker-compose.ci.yml). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.int-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: {
    '^@rajyarank/auth$': '<rootDir>/../../packages/auth/src/index.ts',
    '^@rajyarank/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    '^@rajyarank/config/env$': '<rootDir>/../../packages/config/src/env.ts',
  },
  testTimeout: 30000,
};
