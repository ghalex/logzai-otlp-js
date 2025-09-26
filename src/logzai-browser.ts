// logzai-browser.ts
import { trace } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { LogzAIBase, LogzAIOptions } from "./logzai-base";

class LogzAIBrowser extends LogzAIBase {
  declare protected tracerProvider: WebTracerProvider;
  private beforeUnloadHandler?: () => void;
  private pageHideHandler?: () => void;

  // Override the init method to use browser-specific providers
  init(opts: LogzAIOptions) {
    const {
      ingestToken,
      ingestEndpoint,
      serviceName = "app",
      serviceNamespace = "default",
      environment = (typeof process !== 'undefined' && process.env?.NODE_ENV) || "production",
      mirrorToConsole = false,
    } = opts;

    // Set mirror to console property (now properly protected)
    this.mirrorToConsole = mirrorToConsole;

    const resource = resourceFromAttributes({
      "service.name": serviceName,
      "service.namespace": serviceNamespace,
      "deployment.environment": environment,
    });

    // Traces - use WebTracerProvider for browser
    const spanProcessor = new BatchSpanProcessor(this.makeTraceExporter(ingestEndpoint, { "x-ingest-token": ingestToken }));
    this.tracerProvider = new WebTracerProvider({ 
      resource, 
      spanProcessors: [spanProcessor] 
    });
    this.tracerProvider.register({
      contextManager: new ZoneContextManager(), // Use ZoneContextManager for browser
    });
    this.tracer = trace.getTracer("logzai");

    // Logs - use the same LoggerProvider as Node.js version
    const logProcessor = new BatchLogRecordProcessor(this.makeLogExporter(ingestEndpoint, { "x-ingest-token": ingestToken }));
    this.loggerProvider = new LoggerProvider({ 
      resource, 
      processors: [logProcessor] 
    });
    this.logger = this.loggerProvider.getLogger("logzai");

    // Set up automatic shutdown on page unload events
    this.setupAutoShutdown();

    console.log("LogzAI browser initialized with tracing and logging support");
  }

  private setupAutoShutdown() {
    // Only set up event listeners in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Create handlers that call shutdown
    this.beforeUnloadHandler = () => {
      // Use synchronous approach for beforeunload as it's the last chance
      // Note: shutdown() is async but beforeunload has limited time
      this.shutdown().catch(console.error);
    };

    this.pageHideHandler = () => {
      // pagehide is more reliable than beforeunload in modern browsers
      // especially on mobile and when using back/forward cache
      this.shutdown().catch(console.error);
    };

    // Add event listeners
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    window.addEventListener('pagehide', this.pageHideHandler);
  }

  // Override shutdown to also clean up event listeners
  async shutdown() {
    // Remove event listeners to prevent memory leaks
    if (typeof window !== 'undefined' && this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
    
    if (typeof window !== 'undefined' && this.pageHideHandler) {
      window.removeEventListener('pagehide', this.pageHideHandler);
      this.pageHideHandler = undefined;
    }

    // Call parent shutdown
    await super.shutdown();
  }
}

// Create a singleton instance for backward compatibility
const logzaiBrowserInstance = new LogzAIBrowser();

// Export the class for direct instantiation
export { LogzAIBrowser };
export default logzaiBrowserInstance;
