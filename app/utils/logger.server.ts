export const log = {
  info: (message: string, data?: Record<string, any>) =>
    console.log(`[INFO] ${message}`, data || ""),
  debug: (message: string, data?: Record<string, any>) =>
    console.debug(`[DEBUG] ${message}`, data || ""),
  warn: (message: string, data?: Record<string, any>) =>
    console.warn(`[WARN] ${message}`, data || ""),
  error: (message: string, data?: Record<string, any>) =>
    console.error(`[ERROR] ${message}`, data || ""),
};