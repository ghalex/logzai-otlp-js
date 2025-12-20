# LogzAI JS

Official JavaScript/TypeScript client for LogzAI — send logs to the LogzAI platform using the OpenTelemetry Protocol (OTLP).

## Installation

```bash
npm install logzai-js
```

## Usage

### Node.js Example

```typescript
import logzai from 'logzai-js';

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
  import logzai from 'logzai-js/browser';

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

## API Reference

### Logging Methods

```typescript
// Log levels
logzai.debug('Debug message', { key: 'value' });
logzai.info('Info message', { key: 'value' });
logzai.warn('Warning message', { key: 'value' });
logzai.error('Error message', { key: 'value' });

// Exception logging with stack traces
logzai.exception('Error occurred', new Error('Something failed'), {
  userId: '123',
  context: 'checkout',
});
```

### Tracing

```typescript
// Wrap functions with spans for distributed tracing
await logzai.span('my-operation', async (span) => {
  // Your operation here
  span.setAttribute('custom.attribute', 'value');
  return result;
}, { operation: 'database-query' });
```

### Initialization Options

```typescript
logzai.init({
  ingestToken: string;          // Required: Your LogzAI ingest token
  ingestEndpoint: string;        // Required: LogzAI ingest endpoint
  serviceName?: string;          // Optional: Service name (default: 'app')
  serviceNamespace?: string;     // Optional: Service namespace (default: 'default')
  environment?: string;          // Optional: Environment (default: 'production')
  mirrorToConsole?: boolean;     // Optional: Also log to console (default: false)
  timeoutMillis?: number;        // Optional: Request timeout (default: 10000)
});
```

## Plugin System

LogzAI supports a plugin system for easy integration with different frameworks and environments.

### Browser Plugin

The browser plugin automatically captures JavaScript errors and unhandled promise rejections.

#### Basic Usage

```typescript
import logzai, { browserPlugin } from 'logzai-js/browser';

// Initialize LogzAI
logzai.init({
  ingestToken: 'your-ingest-token',
  ingestEndpoint: 'https://ingest.logzai.com',
  serviceName: 'my-app',
});

// Enable automatic error capture
logzai.plugin('browser', browserPlugin);
```

#### Advanced Configuration

```typescript
import logzai, { browserPlugin } from 'logzai-js/browser';
import store from './store'; // Your Redux/Vuex store

logzai.init({ /* ... */ });

logzai.plugin('browser', browserPlugin, {
  // Capture both errors and unhandled rejections (default: true)
  captureErrors: true,
  captureUnhandledRejections: true,

  // Filter errors before logging
  errorFilter: (error) => {
    // Skip non-critical errors
    return !error.message?.includes('ResizeObserver');
  },

  // Inject context from your application state
  contextInjector: () => {
    const state = store.getState();
    return {
      userId: state.user?.id,
      userEmail: state.user?.email,
      currentRoute: window.location.pathname,
    };
  },

  // Custom error message formatting
  messageFormatter: (error) => {
    return `Error: ${error.message}`;
  },
});
```

#### Configuration Options

- `captureErrors` (boolean, default: `true`): Enable `window.onerror` handler
- `captureUnhandledRejections` (boolean, default: `true`): Enable `window.onunhandledrejection` handler
- `errorFilter` (function): Filter errors before logging. Return `false` to skip an error.
- `contextInjector` (function): Inject additional context (user info, route, etc.) into error logs
- `messageFormatter` (function): Custom error message formatting

### Express.js Plugin

The Express plugin automatically logs HTTP requests, responses, and errors.

#### Basic Usage

```typescript
import express from 'express';
import logzai, { expressPlugin } from 'logzai-js';

const app = express();

logzai.init({ /* ... */ });

// Enable automatic request/response/error logging
logzai.plugin('express', expressPlugin, { app });
```

This will automatically:
- Create a span for each HTTP request with timing information
- Log requests and responses with duration: `POST /ingest/otel/logs -> 200  2.35s`
- Associate all logs that happen during the request with the request span
- Use appropriate log levels: info (2xx/3xx), warn (4xx), error (5xx)
- Capture all unhandled errors with stack traces

#### Advanced Configuration

```typescript
import express from 'express';
import logzai, { expressPlugin } from 'logzai-js';

const app = express();

logzai.plugin('express', expressPlugin, {
  app,

  // Skip health check endpoints
  skipPaths: ['/health', '/metrics', '/favicon.ico'],

  // Log slow requests (> 1 second)
  slowRequestThreshold: 1000,

  // Inject user context into all logs
  contextInjector: (req) => ({
    userId: req.user?.id,
    userEmail: req.user?.email,
    sessionId: req.sessionID,
  }),

  // Filter requests before logging
  requestFilter: (req) => {
    // Don't log static assets
    return !req.path.match(/\.(css|js|png|jpg)$/);
  },

  // Log request bodies (careful with sensitive data!)
  logRequestBody: true,
  logResponseBody: false,
});
```

#### Distributed Tracing

The Express plugin automatically creates OpenTelemetry spans for each HTTP request. All logs emitted during the request (including logs from your route handlers) are automatically associated with the request span, making it easy to trace the full lifecycle of a request.

```typescript
app.post('/api/users', async (req, res) => {
  // These logs will be automatically associated with the "POST /api/users" span
  logzai.info('Validating user data', { email: req.body.email });

  const user = await createUser(req.body);
  logzai.info('User created successfully', { userId: user.id });

  res.json({ success: true, userId: user.id });
  // Span ends automatically when response is sent
  // Log message: "POST /api/users -> 200  0.52s"
});
```

The span includes:
- HTTP method, path, and route
- Status code and response time
- Client IP and user agent
- Query parameters (if present)
- Custom attributes from `contextInjector`

#### Configuration Options

- `app` (required): Express application instance
- `logRequests` (boolean, default: `true`): Log incoming requests
- `logResponses` (boolean, default: `true`): Log responses with status codes
- `captureErrors` (boolean, default: `true`): Capture and log errors
- `skipPaths` (string[], default: `[]`): Paths to skip (supports wildcards: `'/api/*'`)
- `slowRequestThreshold` (number): Log requests slower than this (ms)
- `requestFilter` (function): Filter requests before logging
- `contextInjector` (function): Inject additional context (user info, session, etc.)
- `logRequestBody` (boolean, default: `false`): Include request body in logs
- `logResponseBody` (boolean, default: `false`): Include response body in logs

### Creating Custom Plugins

You can create your own plugins for custom integrations:

```typescript
import type { LogzAIPlugin } from 'logzai-js';

const myPlugin: LogzAIPlugin<{ threshold: number }> = (instance, config) => {
  // Setup your plugin
  console.log('Plugin initialized with threshold:', config?.threshold);

  // Use logzai instance methods
  instance.info('Plugin loaded');

  // Return cleanup function (optional)
  return () => {
    console.log('Plugin cleanup');
  };
};

// Use your plugin
logzai.plugin('my-plugin', myPlugin, { threshold: 100 });

// Later, unregister the plugin
logzai.unregisterPlugin('my-plugin');
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
- ES modules (`dist/logzai-js.es.js`)
- CommonJS (`dist/logzai-js.cjs.js`)
- UMD (`dist/logzai-js.umd.js`)
- TypeScript declarations (`dist/index.d.ts`)

## Publishing

```bash
npm publish
```

## License

MIT
