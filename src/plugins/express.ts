/**
 * Express.js plugin for LogzAI
 * Automatically logs HTTP requests, responses, and errors
 */

import type { LogzAIBase } from '../logzai-base';
import type { ExpressPluginConfig, LogzAIPlugin } from './types';

/**
 * Express plugin that automatically logs HTTP requests, responses, and errors
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import logzai, { expressPlugin } from 'logzai-js';
 *
 * const app = express();
 *
 * logzai.init({ ... });
 * logzai.plugin('express', expressPlugin, {
 *   app,
 *   skipPaths: ['/health', '/metrics'],
 *   contextInjector: (req) => ({ userId: req.user?.id })
 * });
 * ```
 */
export const expressPlugin: LogzAIPlugin<ExpressPluginConfig> = (
  instance: LogzAIBase,
  config?: ExpressPluginConfig
) => {
  if (!config || !config.app) {
    throw new Error('expressPlugin: app instance is required in config');
  }

  const {
    app,
    logRequests = true,
    logResponses = true,
    captureErrors = true,
    requestFilter,
    contextInjector,
    slowRequestThreshold,
    skipPaths = [],
    logRequestBody = false,
    logResponseBody = false,
  } = config;

  // Store original json and send methods for response body capture
  const originalJson = app.response.json;
  const originalSend = app.response.send;

  /**
   * Check if a path should be skipped
   */
  const shouldSkipPath = (path: string): boolean => {
    return skipPaths.some(skipPath => {
      if (skipPath.includes('*')) {
        const regex = new RegExp('^' + skipPath.replace(/\*/g, '.*') + '$');
        return regex.test(path);
      }
      return path === skipPath;
    });
  };

  /**
   * Request/Response logging middleware
   */
  const loggingMiddleware = (req: any, res: any, next: any) => {
    // Skip if path is in skipPaths
    if (shouldSkipPath(req.path)) {
      return next();
    }

    // Apply request filter
    if (requestFilter && !requestFilter(req)) {
      return next();
    }

    const startTime = Date.now();

    // Build base attributes
    const getBaseAttributes = () => {
      const attrs: Record<string, any> = {
        'http.method': req.method,
        'http.url': req.url,
        'http.path': req.path,
        'http.route': req.route?.path || req.path,
        'http.host': req.hostname,
        'http.user_agent': req.get('user-agent'),
        'http.remote_addr': req.ip || req.connection.remoteAddress,
      };

      // Add query params if present
      if (req.query && Object.keys(req.query).length > 0) {
        attrs['http.query'] = JSON.stringify(req.query);
      }

      // Add request body if enabled
      if (logRequestBody && req.body) {
        attrs['http.request_body'] = JSON.stringify(req.body);
      }

      // Inject custom context
      if (contextInjector) {
        Object.assign(attrs, contextInjector(req));
      }

      return attrs;
    };

    // Log incoming request
    if (logRequests) {
      instance.info(`${req.method} ${req.path}`, {
        ...getBaseAttributes(),
        'log.type': 'http.request',
      });
    }

    // Capture response
    const originalEnd = res.end;
    let responseBody: any;

    // Intercept json responses
    res.json = function (body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Intercept send responses
    res.send = function (body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log response when finished
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      if (logResponses) {
        const attrs: Record<string, any> = {
          ...getBaseAttributes(),
          'http.status_code': statusCode,
          'http.duration_ms': duration,
          'log.type': 'http.response',
        };

        // Add response body if enabled
        if (logResponseBody && responseBody) {
          attrs['http.response_body'] = typeof responseBody === 'string'
            ? responseBody
            : JSON.stringify(responseBody);
        }

        // Determine log level based on status code
        const message = `${req.method} ${req.path} -> ${statusCode}`;

        if (statusCode >= 500) {
          instance.error(message, attrs);
        } else if (statusCode >= 400) {
          instance.warn(message, attrs);
        } else {
          instance.info(message, attrs);
        }

        // Log slow requests if threshold is set
        if (slowRequestThreshold && duration > slowRequestThreshold) {
          instance.warn(`Slow request detected: ${req.method} ${req.path}`, {
            ...attrs,
            'log.type': 'http.slow_request',
            'http.threshold_ms': slowRequestThreshold,
          });
        }
      }

      return originalEnd.apply(res, args);
    };

    next();
  };

  /**
   * Error handling middleware (must be added after all other middleware/routes)
   */
  const errorMiddleware = (err: Error, req: any, res: any, next: any) => {
    // Skip if path is in skipPaths
    if (shouldSkipPath(req.path)) {
      return next(err);
    }

    const attrs: Record<string, any> = {
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
      'http.route': req.route?.path || req.path,
      'http.status_code': res.statusCode || 500,
      'http.host': req.hostname,
      'http.user_agent': req.get('user-agent'),
      'http.remote_addr': req.ip || req.connection.remoteAddress,
      'log.type': 'http.error',
    };

    // Add request body if enabled
    if (logRequestBody && req.body) {
      attrs['http.request_body'] = JSON.stringify(req.body);
    }

    // Inject custom context
    if (contextInjector) {
      Object.assign(attrs, contextInjector(req));
    }

    // Log the exception
    instance.exception(
      `${req.method} ${req.path} - Error: ${err.message}`,
      err,
      attrs
    );

    // Pass error to next error handler
    next(err);
  };

  // Register middleware
  app.use(loggingMiddleware);

  // Register error middleware (must be last)
  if (captureErrors) {
    app.use(errorMiddleware);
  }

  instance.info('Express plugin initialized', {
    'plugin.name': 'express',
    'plugin.logRequests': logRequests,
    'plugin.logResponses': logResponses,
    'plugin.captureErrors': captureErrors,
    'plugin.skipPaths': skipPaths.join(', '),
  });

  // Return cleanup function
  return () => {
    // Restore original methods
    app.response.json = originalJson;
    app.response.send = originalSend;

    instance.info('Express plugin cleaned up');
  };
};
