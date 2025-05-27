import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class ScanEnabledError extends AppError {
  constructor() {
    super(
      `Cannot delete blockchain with scanning enabled. Disable scanning first`,
      status.BAD_REQUEST,
      true,
      ErrorCode.SCAN_ENABLED
    );

    this.name = 'ScannerAlreadyRunningError';
  }
}
