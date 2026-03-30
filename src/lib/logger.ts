const isDev = import.meta.env.DEV

/**
 * A simple logger utility that only outputs to the console in development mode.
 * Prevents sensitive information leakage (such as UUIDs, DB errors) in production builds.
 */
export const logger = {
  log: isDev ? console.log.bind(console) : (..._args: any[]) => {},
  warn: isDev ? console.warn.bind(console) : (..._args: any[]) => {},
  error: isDev ? console.error.bind(console) : (..._args: any[]) => {
    // In production, this is where you would integrate with an error tracking service like Sentry or Datadog
  },
}
