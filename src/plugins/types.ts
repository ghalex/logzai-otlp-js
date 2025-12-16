/**
 * Plugin type definitions for LogzAI
 */

/**
 * Plugin function signature
 * @param instance - The LogzAI instance
 * @param params - Configuration parameters for the plugin
 * @returns Optional cleanup function to be called on shutdown
 */
export type LogzAIPlugin<T = any> = (
  instance: any, // Use any to avoid circular dependencies with LogzAIBase
  params?: T
) => void | (() => void | Promise<void>);

/**
 * Plugin registry entry
 */
export interface PluginEntry {
  name: string;
  plugin: LogzAIPlugin;
  cleanup?: () => void | Promise<void>;
}

/**
 * Browser plugin configuration
 */
export interface BrowserPluginConfig {
  /**
   * Enable window.onerror handler to capture uncaught errors
   * @default true
   */
  captureErrors?: boolean;

  /**
   * Enable window.onunhandledrejection handler to capture unhandled promise rejections
   * @default true
   */
  captureUnhandledRejections?: boolean;

  /**
   * Filter errors before logging
   * Return false to skip logging this error
   * @param error - The error object or event
   * @returns true to log the error, false to skip
   */
  errorFilter?: (error: Error | ErrorEvent | PromiseRejectionEvent) => boolean;

  /**
   * Inject additional context into error logs
   * Useful for adding user info from Redux/Vuex state, current route, etc.
   * @returns Object with additional attributes to add to error logs
   */
  contextInjector?: () => Record<string, any>;

  /**
   * Custom error message formatter
   * @param error - The error object or event
   * @returns Formatted error message
   */
  messageFormatter?: (error: Error | ErrorEvent | PromiseRejectionEvent) => string;
}

/**
 * Express plugin configuration
 */
export interface ExpressPluginConfig {
  /**
   * The Express application instance
   */
  app: any; // Use any to avoid Express type dependency

  /**
   * Log all incoming requests
   * @default true
   */
  logRequests?: boolean;

  /**
   * Log all responses with status codes
   * @default true
   */
  logResponses?: boolean;

  /**
   * Capture and log errors from error-handling middleware
   * @default true
   */
  captureErrors?: boolean;

  /**
   * Filter requests before logging
   * Return false to skip logging this request
   * @param req - Express request object
   * @returns true to log the request, false to skip
   */
  requestFilter?: (req: any) => boolean;

  /**
   * Inject additional context into request/error logs
   * Useful for adding user info, session data, etc.
   * @param req - Express request object
   * @returns Object with additional attributes to add to logs
   */
  contextInjector?: (req: any) => Record<string, any>;

  /**
   * Log slow requests that exceed this threshold (in milliseconds)
   * @default undefined (disabled)
   */
  slowRequestThreshold?: number;

  /**
   * Skip logging for specific paths (e.g., health checks)
   * @default []
   */
  skipPaths?: string[];

  /**
   * Log request body (be careful with sensitive data)
   * @default false
   */
  logRequestBody?: boolean;

  /**
   * Log response body (be careful with large responses)
   * @default false
   */
  logResponseBody?: boolean;
}
