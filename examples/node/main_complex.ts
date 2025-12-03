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

import * as logzai from 'logzai-js';

async function main() {
  
    // Initialize LogzAI
  logzai.init({
    ingestToken: 'your-ingest-token-here',
    ingestEndpoint: 'http://ingest.logzai.com', // or your OTLP endpoint
    serviceName: 'my-node-app',
    serviceNamespace: 'examples',
    // environment will automatically use process.env.NODE_ENV || 'production'
  });
  
  logzai.info('Application started successfully', { 
    version: '1.0.0',
    port: 3000 
  });
  
  logzai.debug('Debug information', { 
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  });
  
  logzai.warn('This is a warning message', { 
    warning: 'Low disk space',
    threshold: '90%'
  });

  // Span tracing examples
  console.log('\n=== Span Tracing Examples ===');
  
  await logzai.span('user-registration', async (span) => {
    logzai.info('Starting user registration process');
    
    // Add events to the span
    logzai.event('validation-started', { step: 1 });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logzai.event('validation-completed', { 
      step: 2, 
      valid: true 
    });
    
    // More work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    logzai.info('User registration completed successfully', {
      userId: 'user-123',
      email: 'user@example.com'
    });
    
    return 'registration-success';
  });

  // Nested spans example
  console.log('\n=== Nested Spans Example ===');
  
  await logzai.span('order-processing', async (span) => {
    logzai.info('Processing order', { orderId: 'order-456' });
    
    // Nested span for payment
    await logzai.span('payment-processing', async (paymentSpan) => {
      logzai.info('Processing payment');
      logzai.event('payment-started', { amount: 99.99, currency: 'USD' });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      logzai.event('payment-completed', { 
        transactionId: 'txn-789',
        status: 'success' 
      });
    });
    
    // Nested span for inventory
    await logzai.span('inventory-update', async (inventorySpan) => {
      logzai.info('Updating inventory');
      logzai.event('inventory-check', { productId: 'prod-123' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logzai.event('inventory-updated', { 
        productId: 'prod-123',
        newQuantity: 45 
      });
    });
    
    logzai.info('Order processed successfully');
  });

  // Error handling example
  console.log('\n=== Error Handling Example ===');
  
  try {
    await logzai.span('database-operation', async (span) => {
      logzai.info('Attempting database connection');
      logzai.event('connection-started');
      
      // Simulate an error
      throw new Error('Database connection failed');
    });
  } catch (error) {
    logzai.error('Database operation failed', {
      error: error.message,
      stack: error.stack,
      operation: 'user-lookup'
    });
  }

  // Performance monitoring example
  console.log('\n=== Performance Monitoring Example ===');
  
  const result = await logzai.span('api-call', async (span) => {
    const startTime = Date.now();
    
    logzai.event('api-call-started', { 
      endpoint: '/api/users',
      method: 'GET' 
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const duration = Date.now() - startTime;
    
    logzai.event('api-call-completed', { 
      duration,
      statusCode: 200,
      responseSize: 1024 
    });
    
    logzai.info('API call completed', {
      endpoint: '/api/users',
      duration,
      success: true
    });
    
    return { users: ['user1', 'user2'], count: 2 };
  });
  
  console.log('API Result:', result);

  // Cleanup
  console.log('\n=== Shutting Down ===');
  logzai.info('Application shutting down gracefully');
  
  await logzai.shutdown();
  console.log('LogzAI shutdown completed');
}

// Run the example
main().catch(console.error);
