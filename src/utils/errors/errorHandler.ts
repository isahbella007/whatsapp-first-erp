import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ValidationError } from 'express-validator';
import AppError from './AppError';
import logger from '../logger';

/**
 * Convert Mongoose validation error to AppError
 */
const handleMongooseValidationError = (err: mongoose.Error.ValidationError): AppError => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, err.errors);
};

/**
 * Convert MongoDB duplicate key error to AppError
 */
const handleDuplicateFieldsError = (err: any): AppError => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Convert MongoDB cast error to AppError
 */
const handleCastError = (err: mongoose.Error.CastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Convert JWT error to AppError
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Convert JWT expired error to AppError
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Convert Express Validator errors to AppError
 */
const handleExpressValidationError = (errors: ValidationError[]): AppError => {
  const formattedErrors = errors.reduce((acc: Record<string, string>, error) => {
    acc[error.type === 'field' ? error.path : error.type] = error.msg;
    return acc;
  }, {});

  return new AppError('Validation error', 400, formattedErrors);
};

/**
 * Send error response in development environment
 */
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  logger.error(`ERROR 💥: ${err.message}`, { 
    stack: err.stack,
    statusCode: err.statusCode 
  });
  
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Send error response in production environment
 */
const sendErrorProd = (err: AppError, req: Request, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.error(`ERROR 💥: ${err.message}`);
    
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }
  
  // Programming or other unknown error: don't leak error details
  logger.error('ERROR 💥:', err);
  
  // Send generic message
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default to 500 if status code not set
  let error = err instanceof AppError 
    ? err 
    : new AppError(err.message || 'Something went wrong', 500);

  // Check for known error types and transform them
  if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err);
  }
  if (err instanceof mongoose.Error.CastError) {
    error = handleCastError(err);
  }
  if ((err as any).code === 11000) {
    error = handleDuplicateFieldsError(err);
  }
  if ((err as any).name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if ((err as any).name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send appropriate error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Express validator middleware error handler
 */
export const validationErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
  errors: ValidationError[]
): void => {
  if (errors.length > 0) {
    const error = handleExpressValidationError(errors);
    return errorHandler(error, req, res, next);
  }
  next();
};

/**
 * Catch async errors in route handlers
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 