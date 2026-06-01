/**
 * Lightweight error monitoring.
 * Logs to console in all environments; optionally sends to Sentry when DSN is configured.
 */

interface ErrorContext {
  /** Where the error occurred, e.g. "swipe API", "profile save" */
  component?: string;
  /** Additional key-value metadata */
  extra?: Record<string, unknown>;
  /** Severity level */
  level?: "error" | "warning" | "info";
}

/**
 * Report an error to console + optional Sentry.
 */
export function reportError(
  error: unknown,
  context: ErrorContext = {}
): void {
  const { component = "unknown", extra = {}, level = "error" } = context;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Always log to console
  const logFn =
    level === "error"
      ? console.error
      : level === "warning"
      ? console.warn
      : console.info;

  logFn(`[Qiubi][${level.toUpperCase()}][${component}]`, message, {
    stack,
    ...extra,
  });

  // Sentry integration (lazy — only loads if DSN is present)
  if (typeof window !== "undefined") {
    const dsn = (window as unknown as Record<string, unknown>).__SENTRY_DSN__ as
      | string
      | undefined;
    if (dsn && level === "error") {
      // In a real integration you'd call Sentry.captureException(error, { ... })
      // For now we just note the intent — full Sentry SDK should be installed separately.
      console.debug("[Qiubi] Sentry DSN detected — would send error to Sentry.");
    }
  }
}

/**
 * Wrap an async function with try/catch + error reporting.
 * Returns a new function that catches errors, reports them, and returns a fallback value.
 */
export function wrapAsync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  context: ErrorContext = {},
  fallback?: TResult
): (...args: TArgs) => Promise<TResult | undefined> {
  return async (...args: TArgs): Promise<TResult | undefined> => {
    try {
      return await fn(...args);
    } catch (err) {
      reportError(err, context);
      return fallback;
    }
  };
}

/**
 * Wrap an async API route handler with error reporting.
 * Returns a standardized 500 JSON response on unhandled errors.
 */
export function wrapApiHandler<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  handlerName: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      reportError(err, {
        component: `api:${handlerName}`,
        level: "error",
      });
      return new Response(
        JSON.stringify({ code: 500, message: "服务器内部错误" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }) as unknown as T;
}
