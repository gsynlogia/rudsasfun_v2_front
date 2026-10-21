// Testy mutacyjne czystych funkcji frontu: npm run test:mutation (raport w konsoli).
export default {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.mts' },
  mutate: ['lib/utils/guardians.ts', 'lib/utils/seasons.ts', 'lib/qualificationSeasonTexts.ts'],
  ignorePatterns: ['.next', 'tests_scripts', 'public', 'e2e', 'reports', '.stryker-tmp'],
  reporters: ['clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
};
