/* eslint-disable */
module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  coverageDirectory: '../../coverage/apps/api',
};
