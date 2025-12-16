/**
 * Example: Using the browser plugin with LogzAI
 *
 * This example shows how to use the browser plugin to automatically
 * capture JavaScript errors and unhandled promise rejections.
 */

import logzai, { browserPlugin } from '../src/browser';

// Initialize LogzAI
logzai.init({
  ingestToken: 'd3bdf829-c801-480d-b32d-39a871a7ed67',
  ingestEndpoint: 'https://ingest.logzai.com',
  serviceName: 'logzai-frontend',
  environment: process.env.NODE_ENV,
  mirrorToConsole: true
});

// Example 1: Basic browser plugin usage
// This will capture all errors with default settings
logzai.plugin('browser', browserPlugin);

// Example 2: Advanced usage with context injection and error filtering
// This is what you would use in a real application with Redux/Vuex
/*
import store from './store'; // Your Redux/Vuex store
import { selectCurrentUser, selectSelectedOrg } from './selectors';

logzai.plugin('browser', browserPlugin, {
  // Capture both errors and unhandled rejections (default: true)
  captureErrors: true,
  captureUnhandledRejections: true,

  // Filter out non-critical errors
  errorFilter: (error) => {
    // Skip ResizeObserver errors (common false positive)
    if (error.message?.includes('ResizeObserver')) {
      return false;
    }

    // Skip third-party script errors
    if (error instanceof ErrorEvent && error.filename?.includes('third-party')) {
      return false;
    }

    return true; // Log this error
  },

  // Inject context from your application state
  contextInjector: () => {
    const state = store.getState();
    const currentUser = selectCurrentUser(state);
    const selectedOrg = selectSelectedOrg(state);

    return {
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      orgId: selectedOrg?.id,
      orgName: selectedOrg?.name,
      currentRoute: window.location.pathname,
      environment: process.env.NODE_ENV,
    };
  },

  // Custom error message formatting
  messageFormatter: (error) => {
    if (error instanceof ErrorEvent) {
      return `UI Error: ${error.message} at ${error.filename}:${error.lineno}`;
    }
    if (error instanceof PromiseRejectionEvent) {
      const err = error.reason instanceof Error ? error.reason : new Error(String(error.reason));
      return `Async Error: ${err.message}`;
    }
    return `Error: ${error.message}`;
  },
});
*/

// Example 3: Testing error capture
// These will now be automatically logged via the plugin

// Test 1: JavaScript error
setTimeout(() => {
  throw new Error('Test error from setTimeout');
}, 1000);

// Test 2: Unhandled promise rejection
setTimeout(() => {
  Promise.reject(new Error('Test unhandled rejection'));
}, 2000);

// Example 4: Manual error logging (still works as before)
try {
  // Some operation that might fail
  JSON.parse('invalid json');
} catch (error) {
  logzai.exception('Failed to parse JSON', error as Error, {
    operation: 'manual-test',
    data: 'invalid json',
  });
}

// Example 5: Unregistering the plugin
// This will remove the error handlers
// logzai.unregisterPlugin('browser');

console.log('Browser plugin example initialized!');
console.log('Check the LogzAI dashboard for captured errors.');
