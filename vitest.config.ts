import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@cli': '/src/cli',
      '@proxy': '/src/proxy',
      '@storage': '/src/storage',
      '@replay': '/src/replay',
      '@diff': '/src/diff',
      '@api': '/src/api',
      '@web': '/src/web',
    },
  },
})
