module.exports = {
  collectCoverageFrom: [
    "!<rootDir>/**/*.d.ts",
    "<rootDir>/src/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
  ],
  setupFiles: ['react-app-polyfill/jsdom'],
  setupFilesAfterEnv: [],
  testMatch: [
    // '<rootDir>/src/**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)',
    '**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testEnvironment: 'jest-environment-jsdom-fourteen',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/node_modules/babel-jest',
    '^.+\\.css$': '<rootDir>/config/jest/cssTransform.js',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)':
      '<rootDir>/config/jest/fileTransform.js',
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss|less)$',
  ],
  modulePaths: [],
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss|less)$': 'identity-obj-proxy',
  },
  moduleFileExtensions: [
    'web.js',
    'js',
    'web.ts',
    'ts',
    'd.ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
    'node',
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  verbose: true,
  collectCoverage: false,
  coverageReporters: ['html', 'text-lcov'],
  coverageThreshold: {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
