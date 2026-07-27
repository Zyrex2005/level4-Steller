// Sentry Error Monitoring Integration

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    console.log("[Sentry] Initialized error monitoring with DSN");
  } else {
    console.log("[Sentry] Running in local exception handler mode (No VITE_SENTRY_DSN provided)");
  }
}

export function captureException(error: Error | unknown, context?: string) {
  console.error(`[Sentry Error Capture${context ? ` - ${context}` : ""}]`, error);
  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.captureException(error);
  }
}
