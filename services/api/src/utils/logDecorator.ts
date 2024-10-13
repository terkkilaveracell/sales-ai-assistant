import { logger } from "./logger";

export const logMethod = (): MethodDecorator => {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const functionName = propertyKey.toString();
      logger.info(`Invoking method ${functionName} with arguments:`, args);

      const start = Date.now();

      try {
        const result = originalMethod.apply(this, args);

        // Check if the result is a Promise (i.e., the method is async)
        if (result instanceof Promise) {
          return result
            .then((res) => {
              const duration = Date.now() - start;
              logger.info(`Method ${functionName} completed in ${duration}ms`);
              return res;
            })
            .catch((error) => {
              const duration = Date.now() - start;
              logger.error(
                `Error in async method ${functionName} after ${duration}ms:`,
                error
              );
              throw error;
            });
        } else {
          // Method is synchronous
          const duration = Date.now() - start;
          logger.info(`Method ${functionName} completed in ${duration}ms`);
          return result;
        }
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(
          `Error in method ${functionName} after ${duration}ms:`,
          error
        );
        throw error;
      }
    };
  };
};
