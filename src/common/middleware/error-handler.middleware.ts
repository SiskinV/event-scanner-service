// src/middleware/error-handler.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../errors/index';
import status from 'http-status';

// Request validation middleware
export const validateRequest = (validationRules: any[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log('Entered validateRequest with', validationRules);

    const errors: string[] = [];

    validationRules.forEach(rule => {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
      }

      if (value !== undefined && rule.type && typeof value !== rule.type) {
        errors.push(`${rule.field} must be of type ${rule.type}`);
      }

      if (value !== undefined && rule.min && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }

      if (value !== undefined && rule.max && value > rule.max) {
        errors.push(`${rule.field} must be at most ${rule.max}`);
      }
    });

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        statusCode: status.BAD_REQUEST,
        code: ErrorCode.VALIDATION_ERROR,
        errors,
      });
      return;
    }

    next();
  };
};

// Async wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = { ...error } as any;
  err.message = error.message;

  // Log error details
  // console.error('Error Details:', {
  //   message: error.message,
  //   stack: error.stack,
  //   url: req.originalUrl,
  //   method: req.method,
  //   body: req.body,
  //   params: req.params,
  //   query: req.query,
  //   timestamp: new Date().toISOString(),
  // });

  if (error instanceof AppError && error.isOperational) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    // err = handleValidationError(error);
  } else if (error.name === 'CastError') {
    err = handleCastError(error);
  } else if ((error as any).code === 11000) {
    err = handleDuplicateFieldError(error);
  } else if (error.message.includes('ECONNREFUSED')) {
    err = handleConnectionError(error);
  } else if (error.message.includes('timeout')) {
    err = handleTimeoutError(error);
  }

  // Handle operational vs programming errors
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return; // Return void
  }

  // Programming errors - don't leak details in production
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : error.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      code: ErrorCode.GENERAL_ERROR,
      statusCode: status.INTERNAL_SERVER_ERROR,
    }),
  });
};

// Specific error handlers
const handleValidationError = (error: any): AppError => {
  const errors = Object.values(error.errors).map((val: any) => val.message);
  return new AppError(
    `Invalid input data: ${errors.join('. ')}`,
    status.BAD_REQUEST,
    false,
    ErrorCode.VALIDATION_ERROR
  );
};

const handleCastError = (error: any): AppError => {
  return new AppError(`Invalid ${error.path}: ${error.value}`, status.BAD_REQUEST);
};

const handleDuplicateFieldError = (error: any): AppError => {
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  return new AppError(`Duplicate field value: ${value}`, status.BAD_REQUEST);
};

const handleConnectionError = (error: Error): AppError => {
  return new AppError(
    'Database connection failed',
    ErrorCode.CONNECTION_ERROR,
    true,
    status.SERVICE_UNAVAILABLE
  );
};

const handleTimeoutError = (error: Error): AppError => {
  return new AppError('Request timeout', ErrorCode.TIMEOUT_ERROR, true, status.REQUEST_TIMEOUT);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
