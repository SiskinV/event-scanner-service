import { RedisService } from './redis.service';

interface GapProcessorOptions {
  chainId: number;
  chunkSize?: number;
  processInterval?: number;
  onScanBlocks?: (fromBlock: number, toBlock: number) => Promise<void>;
}

export class GapProcessor {
  private chainId: number;
  private chunkSize: number;
  private processInterval: number;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private onScanBlocks: (fromBlock: number, toBlock: number) => Promise<void>;

  constructor(options: GapProcessorOptions) {
    this.chainId = options.chainId;
    this.chunkSize = options.chunkSize || 200;
    this.processInterval = options.processInterval || 2000; // 2 seconds
    this.onScanBlocks = options.onScanBlocks || this.defaultScanBlocks;
  }

  start(): void {
    if (this.isRunning) {
      console.log(`Gap processor already running for chain ${this.chainId}`);
      return;
    }

    console.log(`Starting gap processor for chain ${this.chainId}`);
    console.log(`Chunk size: ${this.chunkSize} blocks`);
    console.log(`Process interval: ${this.processInterval}ms`);

    this.isRunning = true;

    // Process gaps every X seconds
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.processGapChunk();
      }
    }, this.processInterval);
  }

  stop(): void {
    console.log(`Stopping gap processor for chain ${this.chainId}`);
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async processGapChunk(): Promise<void> {
    try {
      // Check if we have a gap being processed
      let currentGap = await RedisService.getCurrentProcessingGap(this.chainId);

      // If no gap in progress, get next pending gap
      if (!currentGap) {
        currentGap = await RedisService.getNextPendingGap(this.chainId);

        if (!currentGap) {
          return;
        }

        // Mark gap as processing
        await RedisService.markGapAsProcessing(this.chainId, currentGap.id);
        console.log(
          `Started processing gap ${currentGap.id}: blocks ${currentGap.startBlock}-${currentGap.endBlock}`
        );
      }

      // Calculate next chunk to process
      const chunkStart = currentGap.currentProgress;
      const chunkEnd = Math.min(chunkStart + this.chunkSize - 1, currentGap.endBlock);

      console.log(`Scanning chunk: ${chunkStart}-${chunkEnd} (gap: ${currentGap.id})`);

      // Scan the blocks
      await this.onScanBlocks(chunkStart, chunkEnd);

      // Update progress in Redis
      await RedisService.updateGapProgress(this.chainId, currentGap.id, chunkEnd);

      // Check if gap is complete
      if (chunkEnd >= currentGap.endBlock) {
        await RedisService.markGapAsCompleted(this.chainId, currentGap.id);
        console.log(`Completed gap ${currentGap.id}`);

        // Show remaining work
        const stats = await RedisService.getGapStats(this.chainId);
        if (stats.pending > 0) {
          console.log(`${stats.pending} gaps remaining (${stats.totalBlocksRemaining} blocks)`);
        } else {
          console.log(`All gaps processed for chain ${this.chainId}!`);
        }
      }
    } catch (error) {
      console.error(`Error processing gap chunk:`, error);

      // Mark current gap as failed
      try {
        const currentGap = await RedisService.getCurrentProcessingGap(this.chainId);
        if (currentGap) {
          await RedisService.markGapAsFailed(
            this.chainId,
            currentGap.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
          console.log(`Marked gap ${currentGap.id} as failed, will try next gap`);
        }
      } catch (redisError) {
        console.error('Error marking gap as failed:', redisError);
      }
    }
  }

  private async defaultScanBlocks(fromBlock: number, toBlock: number): Promise<void> {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Mock scan: blocks ${fromBlock}-${toBlock}`);
  }

  async addGap(startBlock: number, endBlock: number): Promise<string> {
    const gapId = await RedisService.addGap(this.chainId, startBlock, endBlock);
    console.log(`Added gap: ${startBlock}-${endBlock} (${endBlock - startBlock + 1} blocks)`);
    return gapId;
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    chainId: number;
    chunkSize: number;
    processInterval: number;
    gapStats: any;
    currentGap: any;
  }> {
    const gapStats = await RedisService.getGapStats(this.chainId);
    const currentGap = await RedisService.getCurrentProcessingGap(this.chainId);

    return {
      isRunning: this.isRunning,
      chainId: this.chainId,
      chunkSize: this.chunkSize,
      processInterval: this.processInterval,
      gapStats,
      currentGap,
    };
  }

  async processNow(): Promise<void> {
    await this.processGapChunk();
  }
}
