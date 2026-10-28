import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Existing + new tests must run without a local .env file.
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'test',
      DB_PASSWORD: '',
      DB_NAME: 'student_app_test',
      PASS_PERCENTAGE: '40',
      ACADEMIC_YEAR: '2026-27',
    },
  },
});
