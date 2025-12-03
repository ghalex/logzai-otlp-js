import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'logzai-js',
      fileName: (format) => `logzai-js.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: (id) => {
        // Always externalize Node.js built-ins
        const nodeBuiltins = ['async_hooks', 'events', 'buffer', 'util', 'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'stream']
        if (nodeBuiltins.includes(id)) return true
        
        // For Node.js build, externalize all OpenTelemetry packages
        if (id.startsWith('@opentelemetry/')) return true
        
        // Don't externalize other dependencies
        return false
      },
      output: {
        globals: {}
      }
    }
  }
})
