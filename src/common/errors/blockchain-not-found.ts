import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class BlockchainNotFound extends AppError {
  // @ToDo vs think about this, don't like it
  constructor(blockchainId?: string, chainId?: number) {
    super(
      chainId
        ? `Blockchain with chainId ${chainId} not found`
        : `Blockchain with ID ${blockchainId} not found`,
      status.NOT_FOUND,
      true,
      ErrorCode.BLOCKCHAIN_NOT_FOUND
    );

    this.name = 'BlockchainNotFoundError';
  }
}
