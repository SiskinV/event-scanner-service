import { BigNumber, ethers } from 'ethers';
import FeeCollectorABI from '../common/abis/FeeCollectorABI.json';
import { FeeCollectionEventModel } from '../models/fee-collection-event.entity';
import { RedisService } from './redis.service';
import { GapProcessor } from './gap-processor.service';

interface ParsedEvent {
  token: string;
  integrator: string;
  integratorFee: BigNumber;
  lifiFee: BigNumber;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  blockTimestamp?: Date;
}
export class EventScannerService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;
  private isRunning: boolean = false;
  private chainId: number = 0;

  private gapProcessor: GapProcessor | null = null;

  constructor(chainId: number, rpcUrl: string, contractAddress: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, FeeCollectorABI, this.provider);
    this.chainId = chainId;
  }

  /**
   * Scan events for a specific block range (UNCHANGED)
   */
  async scanBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

      const filter = this.contract.filters.FeesCollected();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

      console.log(`Found ${events.length} events`);

      for (const event of events) {
        await this.processEvent(event);
      }

      console.log(`Completed scanning blocks ${fromBlock} to ${toBlock}`);
    } catch (error) {
      console.error(`Error scanning blocks ${fromBlock}-${toBlock}:`, error);
      throw error;
    }
  }

  async startRealTimeListener(): Promise<void> {
    if (this.isRunning) {
      console.log('Real-time listener already running');
      return;
    }

    console.log(`Starting enhanced real-time event listener for chain ${this.chainId}...`);
    this.isRunning = true;

    this.gapProcessor = new GapProcessor({
      chainId: this.chainId,
      chunkSize: 100, // 100 blocks per chunk
      processInterval: 10000, // Every 10 seconds
      onScanBlocks: async (fromBlock: number, toBlock: number) => {
        // Use existing scanBlockRange method for gap processing
        await this.scanBlockRange(fromBlock, toBlock);
      },
    });

    // THEN detect and create gaps (now gapProcessor exists)
    await this.detectAndCreateGaps();

    // THEN start the gap processor
    this.gapProcessor.start();

    // Set up real-time event listener
    this.contract.on('FeesCollected', async (token, integrator, integratorFee, lifiFee, event) => {
      try {
        console.log(`New event detected in block ${event.blockNumber}`);
        await this.processEvent(event);

        // Update last processed block in Redis for real-time events
        await RedisService.setLastProcessedBlock(this.chainId, event.blockNumber);
      } catch (error) {
        console.error('Error processing real-time event:', error);
      }
    });

    console.log('Enhanced real-time listener started with gap processing');
  }

  /**
   * NEW: Detect gaps when scanner starts
   */
  private async detectAndCreateGaps(): Promise<void> {
    try {
      console.log('Detecting gaps...');

      const currentBlock = await this.provider.getBlockNumber();
      const lastProcessedBlock = await RedisService.getLastProcessedBlock(this.chainId);

      if (lastProcessedBlock && lastProcessedBlock < currentBlock) {
        // Found a gap!
        const gapSize = currentBlock - lastProcessedBlock;
        console.log(
          `Detected gap: blocks ${lastProcessedBlock + 1} to ${currentBlock} (${gapSize} blocks)`
        );

        if (this.gapProcessor) {
          await this.gapProcessor.addGap(lastProcessedBlock + 1, currentBlock);
        }
      } else if (!lastProcessedBlock) {
        // No previous state, check database
        console.log('No Redis state found, checking database...');
        const latestDbEvent = await FeeCollectionEventModel.findOne({ chainId: this.chainId })
          .sort({ blockNumber: -1 })
          .exec();

        const dbLastBlock = latestDbEvent ? latestDbEvent.blockNumber : currentBlock - 100;

        if (dbLastBlock < currentBlock) {
          console.log(
            `Creating initial gap from database: blocks ${dbLastBlock + 1} to ${currentBlock}`
          );
          if (this.gapProcessor) {
            await this.gapProcessor.addGap(dbLastBlock + 1, currentBlock);
          }
        }

        // Set initial Redis state
        await RedisService.setLastProcessedBlock(this.chainId, currentBlock);
      } else {
        console.log('No gaps detected - scanner is up to date');
      }
    } catch (error) {
      console.error('Error detecting gaps:', error);
    }
  }

  /**
   * Stop the listener and save state (ENHANCED with Redis + Gap Processing)
   */
  async stop(): Promise<void> {
    console.log(`Stopping enhanced event listener for chain ${this.chainId}...`);

    // Set running flag to false first
    this.isRunning = false;

    // Save current block state to Redis before stopping
    try {
      const currentBlock = await this.provider.getBlockNumber();
      await RedisService.setLastProcessedBlock(this.chainId, currentBlock);
      console.log(`Saved current block ${currentBlock} to Redis`);
    } catch (error) {
      console.error('Error saving current block to Redis:', error);
    }

    // Stop gap processor
    if (this.gapProcessor) {
      this.gapProcessor.stop();
      this.gapProcessor = null;
      console.log('Gap processor stopped');
    }

    // Remove all event listeners
    this.contract.removeAllListeners('FeesCollected');
    console.log('Event listeners removed');

    console.log('Enhanced event listener stopped completely');
  }

  private async processEvent(event: ethers.Event): Promise<void> {
    try {
      const parsedEvent = this.parseEvent(event);
      console.log('Parsed new event! ', parsedEvent);
      await this.saveEvent(parsedEvent);
    } catch (error) {
      console.error(`Error processing event ${event.transactionHash}:${event.logIndex}:`, error);
    }
  }

  private parseEvent(event: ethers.Event): ParsedEvent {
    const parsedLog = this.contract.interface.parseLog(event);

    return {
      token: parsedLog.args[0].toLowerCase(),
      integrator: parsedLog.args[1].toLowerCase(),
      integratorFee: BigNumber.from(parsedLog.args[2]),
      lifiFee: BigNumber.from(parsedLog.args[3]),
      blockNumber: event.blockNumber!,
      transactionHash: event.transactionHash!.toLowerCase(),
      logIndex: event.logIndex!,
    };
  }

  private async saveEvent(parsedEvent: ParsedEvent): Promise<void> {
    try {
      const block = await this.provider.getBlock(parsedEvent.blockNumber);

      const eventDoc = new FeeCollectionEventModel({
        integrator: parsedEvent.integrator,
        token: parsedEvent.token,
        integratorFee: parsedEvent.integratorFee.toString(),
        lifiFee: parsedEvent.lifiFee.toString(),
        integratorFeeHex: parsedEvent.integratorFee.toHexString(),
        lifiFeeHex: parsedEvent.lifiFee.toHexString(),
        blockNumber: parsedEvent.blockNumber,
        transactionHash: parsedEvent.transactionHash,
        logIndex: parsedEvent.logIndex,
        chainId: this.chainId,
        blockTimestamp: new Date(block.timestamp * 1000),
      });

      await eventDoc.save();
      console.log(`Saved: ${parsedEvent.transactionHash}:${parsedEvent.logIndex}`);
    } catch (error) {
      if (error instanceof Error && (error as any).code === 11000) {
        console.log(`Event already exists: ${parsedEvent.transactionHash}:${parsedEvent.logIndex}`);
      } else {
        throw error;
      }
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Enhanced EventScanner...');
    await this.stop();
    console.log('Enhanced EventScanner cleanup completed');
  }
}
