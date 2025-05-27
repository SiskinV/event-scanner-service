import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class ScannerAlreadyRunningError extends AppError {
  constructor(chainId: number) {
    super(
      `Scanner already running for chain ${chainId}`,
      status.BAD_REQUEST,
      true,
      ErrorCode.SCANNER_ALREADY_RUNNING
    );

    this.name = 'ScannerAlreadyRunningError';
  }
}
