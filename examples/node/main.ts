/**
 * Basic LogzAI Node.js Usage Example
 * 
 * This example demonstrates:
 * - Initialization
 * - Basic logging (info, debug, warn, error)
 * - Span tracing
 * - Events within spans
 * - Error handling with tracing
 */

import logzai from 'logzai-js';

async function main() {
  
    // Initialize LogzAI
  logzai.init({
    ingestToken: '86927992-6b66-47cd-9ccf-b785678f2372',
    ingestEndpoint: 'https://ingest.logzai.com', // or your OTLP endpoint
    serviceName: 'my-node-app',
    serviceNamespace: 'examples',
    environment: 'development',
    mirrorToConsole: true
  })

  logzai.info('Application started successfully', { 
    version: '1.0.0',
    port: 3000 
  })
  
  logzai.debug('Debug information', { 
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  })

  logzai.error("Some error")

  await logzai.shutdown();
  console.log("Shutdown complete");
}

// Run the example
main().catch(console.error);
