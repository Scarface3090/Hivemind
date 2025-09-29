
import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  ssr: {
    // Bundle everything by default; keeps things simple for Devvit runtime
    noExternal: true,
  },
  build: {
    // Do not wipe the whole dist if client also outputs there
    emptyOutDir: false,
    // Entry is relative to this config's directory (src/server)
    ssr: 'index.ts',
    // Output to project-level dist/server
    outDir: '../../dist/server',
    // Target modern Node runtime as per Devvit docs (can be node18 or node22)
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      // Avoid bundling Node built-ins
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
})
