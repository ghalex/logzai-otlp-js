import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clean the dist directory
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'logzai-js-browser',
      fileName: (format) => `logzai-js-browser.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: (id) => {
        // Always externalize Node.js built-ins
        const nodeBuiltins = ['async_hooks', 'events', 'buffer', 'util', 'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'stream']
        if (nodeBuiltins.includes(id)) return true
        
        // Always externalize Node.js specific OpenTelemetry packages (they won't work in browser anyway)
        const nodeOnlyPackages = [
          '@opentelemetry/context-async-hooks',
          '@opentelemetry/sdk-trace-node'
        ]
        if (nodeOnlyPackages.some(pkg => id.startsWith(pkg))) {
          return true
        }
        
        // For browser build, bundle all OpenTelemetry packages (don't externalize)
        // Don't externalize any other dependencies either
        return false
      },
      output: {
        globals: {},
        exports: 'named'
      }
    }
  }
})
