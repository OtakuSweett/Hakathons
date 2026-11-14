/**
 * Canonical Error Envelope and Application Error Class.
 * Strict adherence to: { "error": { "code": "ERROR_CODE", "message": "...", "details": {} } }
 */

export interface CanonicalError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  public toJSON(): CanonicalError {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details || {}
      }
    };
  }
}
