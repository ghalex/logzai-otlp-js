import { trace, Span } from "@opentelemetry/api";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { SeverityNumber, type LogRecord } from "@opentelemetry/api-logs";
import type { LogzAIPlugin, PluginEntry } from "./plugins/types";

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
  protected pluginRegistry: Map<string, PluginEntry> = new Map();

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

  /**
   * Register and activate a plugin
   * @param name - Unique plugin identifier
   * @param plugin - Plugin function
   * @param params - Plugin configuration parameters
   */
  public plugin<T = any>(name: string, plugin: LogzAIPlugin<T>, params?: T): void {
    // Prevent duplicate registration
    if (this.pluginRegistry.has(name)) {
      console.warn(`Plugin "${name}" is already registered. Skipping.`);
      return;
    }

    try {
      // Execute plugin and store cleanup function
      const cleanup = plugin(this, params);

      // Store plugin entry
      this.pluginRegistry.set(name, {
        name,
        plugin,
        cleanup: cleanup || undefined,
      });

      console.log(`Plugin "${name}" registered successfully`);
    } catch (error) {
      console.error(`Failed to register plugin "${name}":`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin and call its cleanup function
   * @param name - Plugin identifier
   */
  public unregisterPlugin(name: string): void {
    const entry = this.pluginRegistry.get(name);

    if (!entry) {
      console.warn(`Plugin "${name}" not found`);
      return;
    }

    // Call cleanup function if exists
    if (entry.cleanup) {
      try {
        const result = entry.cleanup();
        if (result instanceof Promise) {
          result.catch(err =>
            console.error(`Error in cleanup for plugin "${name}":`, err)
          );
        }
      } catch (error) {
        console.error(`Error in cleanup for plugin "${name}":`, error);
      }
    }

    this.pluginRegistry.delete(name);
    console.log(`Plugin "${name}" unregistered`);
  }

  async shutdown() {
    // Cleanup all plugins first
    for (const [name, entry] of this.pluginRegistry.entries()) {
      if (entry.cleanup) {
        try {
          await entry.cleanup();
        } catch (error) {
          console.error(`Error cleaning up plugin "${name}":`, error);
        }
      }
    }
    this.pluginRegistry.clear();

    // Existing shutdown logic
    await Promise.all([
      this.loggerProvider.shutdown(),
      this.tracerProvider.shutdown(),
    ]);
  }
}
