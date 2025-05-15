/**
 * Custom error class for application errors
 * Contains additional properties for HTTP status code and operational status
 */
class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  errors?: any;

  /**
   * @param message Error message
   * @param statusCode HTTP status code
   * @param errors Additional error details (optional)
   */
  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Indicates errors we're expecting and can handle
    this.errors = errors;

    // Capture stack trace, excluding the constructor call from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError; 