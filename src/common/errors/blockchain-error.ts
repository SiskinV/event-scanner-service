import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class BlockchainError extends AppError {
  constructor(message: string, chainId?: number) {
    super(
      chainId ? `Blockchain error on chain ${chainId}: ${message}` : message,
      status.BAD_GATEWAY,
      true,
      ErrorCode.BLOCKCHAIN_ERROR
    );

    this.name = 'BlockchainError';
  }
}
