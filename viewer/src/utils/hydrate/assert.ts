/**
 * Asserts that a condition is true, throwing an error with the given message if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
} 