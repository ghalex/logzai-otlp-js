import { trace, Span } from "@opentelemetry/api";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { SeverityNumber, type LogRecord } from "@opentelemetry/api-logs";

export interface LogzAIOptions {
  ingestToken: string;
  ingestEndpoint: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  mirrorToConsole?: boolean;
  timeoutMillis?: number;
}

export abstract class LogzAIBase {
  protected tracerProvider: any; // Use any to avoid Node.js/Browser type conflicts
  protected loggerProvider!: LoggerProvider;
  protected tracer: ReturnType<typeof trace.getTracer>;
  protected logger!: ReturnType<LoggerProvider["getLogger"]>;
  protected mirrorToConsole: boolean;

  constructor() {
    this.tracer = trace.getTracer("logzai");
    this.mirrorToConsole = false;
  }

  // Create HTTP transport for logs & traces
  protected makeTraceExporter(ingestEndpoint: string, headers: Record<string, string>, timeoutMillis?: number): OTLPTraceExporter {
    const url = ingestEndpoint.replace(/\/+$/, "") + "/traces";
    return new OTLPTraceExporter({
      url,
      headers,
      timeoutMillis: timeoutMillis ?? 10000
    });
  }

  protected makeLogExporter(ingestEndpoint: string, headers: Record<string, string>, timeoutMillis?: number): OTLPLogExporter {
    const url = ingestEndpoint.replace(/\/+$/, "") + "/logs";
    console.log("LogzAI log exporter URL: ", url);
    return new OTLPLogExporter({
      url,
      headers,
      timeoutMillis: timeoutMillis ?? 10000
    });
  }

  // Abstract method to be implemented by Node.js and browser versions
  abstract init(opts: LogzAIOptions): void;

  public span<T>(name: string, fn: (span: Span) => Promise<T> | T, attrs?: Record<string, any>): Promise<T> | T {
    return this.tracer.startActiveSpan(name, { attributes: attrs }, async (span) => {
      try {
        return await fn(span);
      } finally {
        span.end();
      }
    });
  }

  private emit(sev: SeverityNumber, body: string, attributes?: Record<string, any>) {
    if (!this.logger) {
      throw new Error("logzai not initialized");
    }
    
    // Mirror to console if enabled
    if (this.mirrorToConsole) {
      const logLevel = this.getSeverityName(sev);
      const timestamp = new Date().toISOString();
      const attributesStr = attributes && Object.keys(attributes).length > 0 
        ? ` ${JSON.stringify(attributes)}` 
        : '';
      
      const logMessage = `[${timestamp}] ${logLevel.toUpperCase()}: ${body}${attributesStr}`;
      
      // Use appropriate console method based on severity
      switch (sev) {
        case SeverityNumber.DEBUG:
          console.debug(logMessage);
          break;
        case SeverityNumber.INFO:
          console.info(logMessage);
          break;
        case SeverityNumber.WARN:
          console.warn(logMessage);
          break;
        case SeverityNumber.ERROR:
        case SeverityNumber.FATAL:
          console.error(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
    
    this.logger.emit({
      body,
      severityNumber: sev,
      attributes: attributes ?? {},
    } as LogRecord);
  }

  private getSeverityName(sev: SeverityNumber): string {
    switch (sev) {
      case SeverityNumber.DEBUG: return 'debug';
      case SeverityNumber.INFO: return 'info';
      case SeverityNumber.WARN: return 'warn';
      case SeverityNumber.ERROR: return 'error';
      case SeverityNumber.FATAL: return 'fatal';
      default: return 'log';
    }
  }

  public info = (msg: string, attrs?: Record<string, any>) => this.emit(SeverityNumber.INFO, msg, attrs);
  public debug = (msg: string, attrs?: Record<string, any>) => this.emit(SeverityNumber.DEBUG, msg, attrs);
  public warn = (msg: string, attrs?: Record<string, any>) => this.emit(SeverityNumber.WARN, msg, attrs);
  public error = (msg: string, attrs?: Record<string, any>) => this.emit(SeverityNumber.ERROR, msg, attrs);

  public exception = (msg: string, error: Error, attrs?: Record<string, any>) => {
    const exceptionAttrs = {
      ...attrs,
      is_exception: true,
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack || '',
    };
    this.emit(SeverityNumber.ERROR, msg, exceptionAttrs);
  };

  async shutdown() {
    await Promise.all([
      this.loggerProvider.shutdown(),
      this.tracerProvider.shutdown(),
    ]);
  }
}
