import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class ScannerNotFoundError extends AppError {
  constructor(chainId: number) {
    super(
      `No running scanner found for chain ${chainId}`,
      status.NOT_FOUND,
      true,
      ErrorCode.SCANNER_NOT_FOUND
    );

    this.name = 'ScannerNotFoundError';
  }
}
