import Redis from 'ioredis';

export class RedisService {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // Log connection events
      this.instance.on('connect', () => {
        console.log('Connected to Redis');
      });

      this.instance.on('error', error => {
        console.error('Redis connection error:', error);
      });

      this.instance.on('close', () => {
        console.log('Redis connection closed');
      });
    }

    return this.instance;
  }

  static async setLastProcessedBlock(chainId: number, blockNumber: number): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:lastBlock:${chainId}`;
    await redis.set(key, blockNumber.toString());
    console.log(`Saved last block for chain ${chainId}: ${blockNumber} in redis`);
  }

  static async getLastProcessedBlock(chainId: number): Promise<number | null> {
    console.log(`Getting last block for chain ${chainId} from redis`);
    const redis = this.getInstance();
    const key = `scanner:lastBlock:${chainId}`;
    const result = await redis.get(key);
    return result ? parseInt(result) : null;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const redis = this.getInstance();
      await redis.ping();
      console.log('Redis connection test successful');
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  // ===== GAP MANAGEMENT =====

  static async addGap(chainId: number, startBlock: number, endBlock: number): Promise<string> {
    const redis = this.getInstance();
    const gapId = `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const gap = {
      id: gapId,
      startBlock,
      endBlock,
      currentProgress: startBlock,
      status: 'pending', // pending | processing | completed | failed
      totalBlocks: endBlock - startBlock + 1,
      processedBlocks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const key = `scanner:gaps:${chainId}`;
    await redis.hset(key, gapId, JSON.stringify(gap));

    console.log(
      `Added gap for chain ${chainId}: blocks ${startBlock}-${endBlock} (${gap.totalBlocks} blocks to redis)`
    );
    return gapId;
  }

  static async getGaps(chainId: number): Promise<any[]> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    const gapsData = await redis.hgetall(key);

    return Object.values(gapsData).map(gapStr => JSON.parse(gapStr as string));
  }

  static async getNextPendingGap(chainId: number): Promise<any | null> {
    const gaps = await this.getGaps(chainId);
    const pendingGaps = gaps.filter(gap => gap.status === 'pending');

    if (pendingGaps.length === 0) return null;

    // Just get the first one (oldest created)
    const nextGap = pendingGaps.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    console.log(`Next gap: ${nextGap.id} - blocks ${nextGap.startBlock}-${nextGap.endBlock}`);
    return nextGap;
  }

  static async hasGapInProgress(chainId: number): Promise<boolean> {
    const gaps = await this.getGaps(chainId);
    return gaps.some(gap => gap.status === 'processing');
  }

  static async getCurrentProcessingGap(chainId: number): Promise<any | null> {
    const gaps = await this.getGaps(chainId);
    const processingGaps = gaps.filter(gap => gap.status === 'processing');
    return processingGaps[0] || null;
  }

  static async updateGapProgress(
    chainId: number,
    gapId: string,
    currentProgress: number
  ): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    const gapStr = await redis.hget(key, gapId);

    if (gapStr) {
      const gap = JSON.parse(gapStr);
      gap.currentProgress = currentProgress;
      gap.processedBlocks = currentProgress - gap.startBlock;
      gap.updatedAt = new Date().toISOString();

      await redis.hset(key, gapId, JSON.stringify(gap));

      const progress = ((gap.processedBlocks / gap.totalBlocks) * 100).toFixed(1);
      console.log(`Gap ${gapId} progress: ${progress}% (${currentProgress}/${gap.endBlock})`);
    }
  }

  static async markGapAsProcessing(chainId: number, gapId: string): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    const gapStr = await redis.hget(key, gapId);

    if (gapStr) {
      const gap = JSON.parse(gapStr);
      gap.status = 'processing';
      gap.updatedAt = new Date().toISOString();
      await redis.hset(key, gapId, JSON.stringify(gap));
      console.log(`Gap ${gapId} marked as processing`);
    }
  }

  static async markGapAsCompleted(chainId: number, gapId: string): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    await redis.hdel(key, gapId);
    console.log(`Gap ${gapId} completed and removed`);
  }

  static async markGapAsFailed(chainId: number, gapId: string, error: string): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    const gapStr = await redis.hget(key, gapId);

    if (gapStr) {
      const gap = JSON.parse(gapStr);
      gap.status = 'failed';
      gap.error = error;
      gap.updatedAt = new Date().toISOString();
      await redis.hset(key, gapId, JSON.stringify(gap));
      console.log(`Gap ${gapId} marked as failed: ${error}`);
    }
  }

  static async getGapStats(chainId: number): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
    totalBlocksRemaining: number;
  }> {
    const gaps = await this.getGaps(chainId);

    const stats = {
      total: gaps.length,
      pending: gaps.filter(g => g.status === 'pending').length,
      processing: gaps.filter(g => g.status === 'processing').length,
      failed: gaps.filter(g => g.status === 'failed').length,
      totalBlocksRemaining: gaps
        .filter(g => g.status === 'pending' || g.status === 'processing')
        .reduce((sum, gap) => sum + (gap.totalBlocks - gap.processedBlocks), 0),
    };

    return stats;
  }

  static async clearAllGaps(chainId: number): Promise<void> {
    const redis = this.getInstance();
    const key = `scanner:gaps:${chainId}`;
    await redis.del(key);
    console.log(`Cleared all gaps for chain ${chainId}`);
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      console.log('Redis disconnected');
    }
  }
}
