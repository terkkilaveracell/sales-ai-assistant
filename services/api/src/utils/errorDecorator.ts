import { logger } from "../utils/logger";

export function handleErrors(rethrow: boolean = true): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // Call the original method
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(`Error in method ${String(propertyKey)}:`, error);

        if (rethrow) {
          throw error; // Rethrow error if configured to do so
        }
      }
    };
  };
}
