/**
 * Generates a unique ID for new entities using crypto.randomUUID().
 */
export const generateId = (): string => crypto.randomUUID();
