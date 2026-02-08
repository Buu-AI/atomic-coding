export type LogLevel = "info" | "warn" | "error" | "debug";

export function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Wrap an async function with timing and error logging */
export function withLog<T>(
  label: string,
  params: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  log("info", `${label} started`, params);
  return fn()
    .then((result) => {
      const durationMs = Math.round(performance.now() - start);
      log("info", `${label} completed`, { durationMs });
      return result;
    })
    .catch((err) => {
      const durationMs = Math.round(performance.now() - start);
      log("error", `${label} threw`, {
        durationMs,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    });
}
