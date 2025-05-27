import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class BlockchainAlreadyExists extends AppError {
  constructor(chainId: number) {
    super(
      `Blockchain with chainId ${chainId} already exists`,
      status.BAD_REQUEST,
      true,
      ErrorCode.BLOCKHCHAIN_ALREADY_EXISTS
    );

    this.name = 'EventsNotFoundError';
  }
}
