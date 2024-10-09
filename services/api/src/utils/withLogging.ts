import { logger } from "./logger";

export function withDebugLogging(fn: (...args: any[]) => Promise<any>) {
  return async function (...args: any[]) {
    const functionName = fn.name || "anonymous";

    logger.debug(`Invoking function ${functionName} with arguments:`, args);

    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;

      logger.debug(`Function ${functionName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;

      logger.error(
        `Error in function ${functionName} after ${duration}ms:`,
        error
      );
      throw error;
    }
  };
}
