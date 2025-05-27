import { AppError } from './app-error';
import { ErrorCode } from './error-code';
import status from 'http-status';

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, status.BAD_REQUEST, true, ErrorCode.VALIDATION_ERROR);

    this.name = 'ValidationError';
  }
}
