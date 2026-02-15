export class StandupError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'StandupError';
  }
}

export class ConfigError extends StandupError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class DeliveryError extends StandupError {
  constructor(message: string, public readonly destination: string) {
    super(message, 'DELIVERY_ERROR');
    this.name = 'DeliveryError';
  }
}

export class DMError extends StandupError {
  constructor(message: string, public readonly userId: string) {
    super(message, 'DM_ERROR');
    this.name = 'DMError';
  }
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  console.error(`[${context}] Error:`, message);
  if (isError(error) && error.stack) {
    console.error(error.stack);
  }
}
