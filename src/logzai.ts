import { trace } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { LogzAIBase, LogzAIOptions } from "./logzai-base";

class LogzAI extends LogzAIBase {
  declare protected tracerProvider: NodeTracerProvider;

  init(opts: LogzAIOptions) {
    const {
      ingestToken,
      ingestEndpoint,
      serviceName = "app",
      serviceNamespace = "default",
      environment = "prod",
      mirrorToConsole = false,
    } = opts;

    this.mirrorToConsole = mirrorToConsole;

    const resource = resourceFromAttributes({
      "service.name": serviceName,
      "service.namespace": serviceNamespace,
      "deployment.environment": environment,
    });

    // Traces
    const spanProcessor = new BatchSpanProcessor(this.makeTraceExporter(ingestEndpoint, { "x-ingest-token": ingestToken }));
    this.tracerProvider = new NodeTracerProvider({ 
      resource, 
      spanProcessors: [spanProcessor] 
    });
    this.tracerProvider.register({
      contextManager: new AsyncLocalStorageContextManager(),
    });
    this.tracer = trace.getTracer("logzai");

    // Logs
    const logProcessor = new BatchLogRecordProcessor(this.makeLogExporter(ingestEndpoint, { "x-ingest-token": ingestToken }));
    this.loggerProvider = new LoggerProvider({ 
      resource, 
      processors: [logProcessor] 
    });
    this.logger = this.loggerProvider.getLogger("logzai");
  }
}

// Create a singleton instance for backward compatibility
const logzaiInstance = new LogzAI();

// Export the class for direct instantiation
export { LogzAI };
export default logzaiInstance;
