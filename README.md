# LogzAI OTL

Official JavaScript/TypeScript client for LogzAI — send logs to the LogzAI platform using the OpenTelemetry Protocol (OTLP).

## Installation

```bash
npm install logzai-otl
```

## Usage

### Node.js Example

```typescript
import logzai from 'logzai-otl';

// Initialize LogzAI
logzai.init({
  ingestToken: 'your-ingest-token',
  ingestEndpoint: 'https://ingest.logzai.com',
  serviceName: 'my-node-app',
  environment: 'production'
});

// Send logs
logzai.info('Application started', { version: '1.0.0' });
logzai.error('Something went wrong', { error: 'details' });

// Cleanup
await logzai.shutdown();
```

### Browser Example

```html
<script type="module">
  import logzai from 'logzai-otl/browser';

  // Initialize LogzAI
  logzai.init({
    ingestToken: 'your-ingest-token',
    ingestEndpoint: 'https://ingest.logzai.com',
    serviceName: 'my-web-app',
    environment: 'production'
  });

  // Send logs
  logzai.info('User action', { userId: '123', action: 'click' });
</script>
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run in development mode
npm run dev
```

## Building

The library is built using Vite and outputs multiple formats:
- ES modules (`dist/logzai-otl.es.js`)
- CommonJS (`dist/logzai-otl.cjs.js`)
- UMD (`dist/logzai-otl.umd.js`)
- TypeScript declarations (`dist/index.d.ts`)

## Publishing

```bash
npm publish
```

## License

MIT
