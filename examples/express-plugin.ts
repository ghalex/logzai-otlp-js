/**
 * Example: Using the Express plugin with LogzAI
 *
 * This example shows how to use the Express plugin to automatically
 * log HTTP requests, responses, and errors.
 */

import express from 'express';
import logzai, { expressPlugin } from '../src/index';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize LogzAI
logzai.init({
  ingestToken: 'your-ingest-token',
  ingestEndpoint: 'https://ingest.logzai.com',
  serviceName: 'my-api',
  environment: process.env.NODE_ENV || 'development',
  mirrorToConsole: true,
});

// Example 1: Basic Express plugin usage
// This will log all requests and responses automatically
logzai.plugin('express', expressPlugin, {
  app,
});

// Example 2: Advanced configuration with context injection and filtering
/*
logzai.plugin('express', expressPlugin, {
  app,

  // Skip health check and metrics endpoints
  skipPaths: ['/health', '/metrics', '/favicon.ico'],

  // Log slow requests that take more than 1 second
  slowRequestThreshold: 1000,

  // Inject user context from request
  contextInjector: (req) => {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      sessionId: req.sessionID,
      apiVersion: req.headers['x-api-version'],
    };
  },

  // Filter out certain requests
  requestFilter: (req) => {
    // Don't log static asset requests
    if (req.path.match(/\.(css|js|png|jpg|ico)$/)) {
      return false;
    }
    return true;
  },

  // Log request/response bodies (be careful with sensitive data)
  logRequestBody: true,
  logResponseBody: false,
});
*/

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;

  // Simulate user lookup
  res.json({
    id,
    name: 'John Doe',
    email: 'john@example.com',
  });
});

app.post('/users', (req, res) => {
  const user = req.body;

  // Log custom event
  logzai.info('User created', {
    userId: user.id,
    userName: user.name,
  });

  res.status(201).json({
    id: Math.random().toString(36).substr(2, 9),
    ...user,
  });
});

// Slow endpoint to test slow request logging
app.get('/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({ message: 'This was slow!' });
});

// Error endpoint to test error logging
app.get('/error', (req, res) => {
  throw new Error('Something went wrong!');
});

app.get('/async-error', async (req, res, next) => {
  try {
    throw new Error('Async error occurred!');
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler (must be last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Express plugin example initialized!');
  console.log('Check the LogzAI dashboard for captured requests and errors.');
  console.log('');
  console.log('Try these endpoints:');
  console.log(`  - GET  http://localhost:${PORT}/`);
  console.log(`  - GET  http://localhost:${PORT}/users/123`);
  console.log(`  - POST http://localhost:${PORT}/users`);
  console.log(`  - GET  http://localhost:${PORT}/slow (tests slow request logging)`);
  console.log(`  - GET  http://localhost:${PORT}/error (tests error logging)`);
  console.log(`  - GET  http://localhost:${PORT}/async-error (tests async error logging)`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await logzai.shutdown();
  process.exit(0);
});
