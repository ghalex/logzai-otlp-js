/**
 * Browser error tracking plugin for LogzAI
 * Automatically captures window.onerror and window.onunhandledrejection events
 */

import type { LogzAIBase } from '../logzai-base';
import type { BrowserPluginConfig, LogzAIPlugin } from './types';

/**
 * Browser plugin that automatically captures JavaScript errors and unhandled promise rejections
 *
 * @example
 * ```typescript
 * import logzai, { browserPlugin } from 'logzai-js/browser';
 *
 * logzai.init({ ... });
 * logzai.plugin('browser', browserPlugin, {
 *   contextInjector: () => ({ userId: store.getState().user.id })
 * });
 * ```
 */
export const browserPlugin: LogzAIPlugin<BrowserPluginConfig> = (
  instance: LogzAIBase,
  config: BrowserPluginConfig = {}
) => {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    console.warn('browserPlugin: Not in browser environment, skipping initialization');
    return;
  }

  const {
    captureErrors = true,
    captureUnhandledRejections = true,
    errorFilter,
    contextInjector,
    messageFormatter,
  } = config;

  let errorHandler: OnErrorEventHandler | null = null;
  let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  let previousErrorHandler: OnErrorEventHandler | null = null;
  let previousRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  // Setup window.onerror handler
  if (captureErrors) {
    errorHandler = (
      message: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      try {
        // Create error object if not provided
        const err = error || new Error(typeof message === 'string' ? message : 'Unknown error');

        // Apply error filter
        if (errorFilter && !errorFilter(err)) {
          return false;
        }

        // Build error message
        const errorMessage = messageFormatter
          ? messageFormatter(err)
          : `JavaScript Exception: ${err.message}`;

        // Build attributes
        const attributes: Record<string, any> = {
          errorType: 'javascript-error',
          source: source || 'unknown',
          lineno,
          colno,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        };

        // Inject additional context
        if (contextInjector) {
          const context = contextInjector();
          Object.assign(attributes, context);
        }

        // Log using exception method
        instance.exception(errorMessage, err, attributes);
      } catch (e) {
        console.error('browserPlugin: Error in onerror handler', e);
      }

      // Call previous handler if it exists
      if (previousErrorHandler && typeof previousErrorHandler === 'function') {
        return previousErrorHandler(message, source, lineno, colno, error);
      }

      return false; // Allow default error handling
    };

    // Store previous handler to chain
    previousErrorHandler = window.onerror;
    window.onerror = errorHandler;
  }

  // Setup window.onunhandledrejection handler
  if (captureUnhandledRejections) {
    rejectionHandler = (event: PromiseRejectionEvent) => {
      try {
        // Extract error from rejection
        const error = event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

        // Apply error filter
        if (errorFilter && !errorFilter(event)) {
          return;
        }

        // Build error message
        const errorMessage = messageFormatter
          ? messageFormatter(event)
          : `Unhandled promise rejection: ${error.message}`;

        // Build attributes
        const attributes: Record<string, any> = {
          errorType: 'unhandled-rejection',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        };

        // Inject additional context
        if (contextInjector) {
          const context = contextInjector();
          Object.assign(attributes, context);
        }

        // Log using exception method
        instance.exception(errorMessage, error, attributes);

        // Prevent default handling (console.error)
        event.preventDefault();
      } catch (e) {
        console.error('browserPlugin: Error in unhandledrejection handler', e);
      }
    };

    // Store previous handler to chain
    previousRejectionHandler = window.onunhandledrejection;
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Also call previous handler if it exists
    if (previousRejectionHandler && typeof previousRejectionHandler === 'function') {
      window.addEventListener('unhandledrejection', previousRejectionHandler);
    }
  }

  // Return cleanup function
  return () => {
    if (errorHandler && captureErrors) {
      // Restore previous handler or clear
      window.onerror = previousErrorHandler;
      errorHandler = null;
    }

    if (rejectionHandler && captureUnhandledRejections) {
      window.removeEventListener('unhandledrejection', rejectionHandler);

      // Remove previous handler if we added it
      if (previousRejectionHandler && typeof previousRejectionHandler === 'function') {
        window.removeEventListener('unhandledrejection', previousRejectionHandler);
      }

      rejectionHandler = null;
    }
  };
};
