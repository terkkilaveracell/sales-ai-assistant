import { logger } from "./logger";

export const logMethod = (): MethodDecorator => {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const functionName = propertyKey.toString();

      logger.info(`Invoking method ${functionName} with arguments:`, args);

      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        logger.info(`Method ${functionName} completed in ${duration}ms`);
        return result;
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
