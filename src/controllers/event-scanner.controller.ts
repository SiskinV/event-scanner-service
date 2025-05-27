import { Request, Response, NextFunction } from 'express';
import { EventScannerService } from '../services/event-scanner.service';
import {
  BlockchainError,
  BlockchainNotFound,
  ScannerAlreadyRunningError,
  ScannerError,
  ScannerNotFoundError,
  ValidationError,
} from '../common/errors';
import { BlockchainService } from '../services/blockchain.service';
import {
  ScanBlockRangeRequestDto,
  StartScannerRequestDto,
  StopScannerRequestDto,
} from '../dtos/scanner';

interface ScannerInstance {
  scanner: EventScannerService;
  chainId: number;
  isRunning: boolean;
  startedAt?: Date;
}

export class EventScannerController {
  private scanners: Map<number, ScannerInstance> = new Map();

  async startScanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chainId }: StartScannerRequestDto = req.body;

      if (typeof chainId !== 'number' || chainId <= 0) {
        console.log('chainId must be a positive number');
        throw new ValidationError('ChainId must be a positive number');
      }

      const existingScanner = this.scanners.get(chainId);
      if (existingScanner?.isRunning) {
        console.log('This scanner is already running');
        throw new ScannerAlreadyRunningError(chainId);
      }

      const blockchain = await BlockchainService.getByChainId(chainId);

      if (!blockchain) {
        throw new BlockchainNotFound(undefined, chainId);
      }

      console.log(`Starting event scanner for chain ${chainId}...`);

      const scanner = new EventScannerService(
        blockchain.chainId,
        blockchain.rpcUrl,
        blockchain.contractAddress
      );

      try {
        await scanner.startRealTimeListener();
      } catch (error) {
        throw new BlockchainError(
          `Failed to connect to blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`,
          chainId
        );
      }

      this.scanners.set(chainId, {
        scanner,
        chainId,
        isRunning: true,
        startedAt: new Date(),
      });

      console.log(`Event scanner started successfully for chain ${chainId}`);

      res.json({
        success: true,
        message: `Event scanner started for chain ${chainId}`,
        data: {
          chainId,
          startedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async stopScanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chainId }: StopScannerRequestDto = req.body;

      if (typeof chainId !== 'number' || chainId <= 0) {
        console.log('Chaind ID must be positive number');
        throw new ValidationError('ChainId must be a positive number');
      }

      const scannerInstance = this.scanners.get(chainId);

      if (!scannerInstance || !scannerInstance.isRunning) {
        console.log('Scanner not found');
        throw new ScannerNotFoundError(chainId);
      }

      console.log(`Stopping event scanner for chain ${chainId}...`);

      try {
        scannerInstance.scanner.stop();
      } catch (error) {
        throw new ScannerError(
          `Failed to stop scanner: ${error instanceof Error ? error.message : 'Unknown error'}`,
          chainId
        );
      }

      scannerInstance.isRunning = false;

      this.scanners.delete(chainId);

      console.log(`Event scanner stopped successfully for chain ${chainId}`);

      res.json({
        success: true,
        message: `Event scanner stopped for chain ${chainId}`,
        data: {
          chainId,
          stoppedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async scanBlockRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chainId, fromBlock, toBlock }: ScanBlockRangeRequestDto = req.body;

      const blockRange = toBlock - fromBlock;
      if (blockRange > 10000) {
        throw new ValidationError('Block range too large. Maximum 10,000 blocks per request');
      }

      console.log(`Starting manual scan for chain ${chainId}, blocks ${fromBlock}-${toBlock}`);

      const blockchain = await BlockchainService.getByChainId(chainId);

      if (!blockchain) {
        throw new BlockchainNotFound(undefined, chainId);
      }

      const scanner = new EventScannerService(
        blockchain.chainId,
        blockchain.rpcUrl,
        blockchain.contractAddress
      );

      try {
        await scanner.scanBlockRange(fromBlock, toBlock);

        await scanner.cleanup();
      } catch (error) {
        await scanner.cleanup();

        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new BlockchainError('Blockchain request timeout', chainId);
          } else if (error.message.includes('rate limit')) {
            throw new BlockchainError('Rate limit exceeded', chainId);
          } else {
            throw new ScannerError(error.message, chainId);
          }
        }
        throw new ScannerError('Unknown scanning error', chainId);
      }

      console.log(`✅ Manual scan completed for chain ${chainId}, blocks ${fromBlock}-${toBlock}`);

      res.json({
        success: true,
        message: `Successfully scanned blocks ${fromBlock} to ${toBlock} for chain ${chainId}`,
        data: {
          chainId,
          fromBlock,
          toBlock,
          blocksScanned: blockRange,
          scannedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async stopAllScanners(): Promise<void> {
    console.log('Stopping all event scanners...');

    const stopPromises = Array.from(this.scanners.entries()).map(async ([chainId, instance]) => {
      if (instance.isRunning) {
        try {
          instance.scanner.stop();
          await instance.scanner.cleanup();
          console.log(`Stopped scanner for chain ${chainId}`);
        } catch (error) {
          console.error(`Error stopping scanner for chain ${chainId}:`, error);
        }
      }
    });

    await Promise.allSettled(stopPromises);

    this.scanners.clear();
    console.log('All scanners stopped and cleaned up');
  }
}
