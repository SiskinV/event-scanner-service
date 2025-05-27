import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class BlockchainDisabled extends AppError {
  constructor(id: string) {
    super(
      `Blockchain ${id} is currently disabled`,
      status.BAD_REQUEST,
      true,
      ErrorCode.BLOCKCHAIN_DISABLED
    );

    this.name = 'BlockchainDisabledError';
  }
}
