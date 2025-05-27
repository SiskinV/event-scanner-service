import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class ScannerError extends AppError {
  constructor(message: string, chainId?: number) {
    super(
      chainId ? `Scanner error on chain ${chainId}: ${message}` : message,
      status.INTERNAL_SERVER_ERROR,
      true,
      ErrorCode.SCANNER_ERROR
    );

    this.name = 'ScannerError';
  }
}
