import { RedisService } from '../services/redis.service';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),
    del: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

describe('RedisService', () => {
  let mockRedisInstance: any;
  const testChainId = 137;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const Redis = require('ioredis');
    mockRedisInstance = new Redis();
    jest.spyOn(RedisService, 'getInstance').mockReturnValue(mockRedisInstance);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('testConnection', () => {
    it('should return false when ping fails', async () => {
      const error = new Error('Connection failed');
      mockRedisInstance.ping.mockRejectedValue(error);

      const result = await RedisService.testConnection();

      expect(result).toBe(false);
    });

    it('should return true when ping succeeds', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const result = await RedisService.testConnection();

      expect(result).toBe(true);
      expect(mockRedisInstance.ping).toHaveBeenCalledTimes(1);
    });
  });

  describe('setLastProcessedBlock', () => {
    it('should call Redis set with correct parameters', async () => {
      const blockNumber = 12345;
      mockRedisInstance.set.mockResolvedValue('OK');

      await RedisService.setLastProcessedBlock(testChainId, blockNumber);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        `scanner:lastBlock:${testChainId}`,
        blockNumber.toString()
      );
    });
  });

  describe('getLastProcessedBlock', () => {
    it('should return null when block does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await RedisService.getLastProcessedBlock(testChainId);

      expect(result).toBeNull();
    });

    it('should return parsed block number', async () => {
      mockRedisInstance.get.mockResolvedValue('12345');

      const result = await RedisService.getLastProcessedBlock(testChainId);

      expect(result).toBe(12345);
      expect(mockRedisInstance.get).toHaveBeenCalledWith(`scanner:lastBlock:${testChainId}`);
    });
  });

  describe('addGap', () => {
    it('should create gap with correct structure', async () => {
      const startBlock = 1000;
      const endBlock = 2000;
      mockRedisInstance.hset.mockResolvedValue(1);

      const gapId = await RedisService.addGap(testChainId, startBlock, endBlock);

      expect(gapId).toMatch(/^gap_\d+_[a-z0-9]+$/);
      expect(mockRedisInstance.hset).toHaveBeenCalledWith(
        `scanner:gaps:${testChainId}`,
        gapId,
        expect.stringContaining(`"startBlock":${startBlock}`)
      );
    });

    it('should set correct gap properties', async () => {
      mockRedisInstance.hset.mockResolvedValue(1);

      await RedisService.addGap(testChainId, 1000, 2000);

      const hsetCall = mockRedisInstance.hset.mock.calls[0];
      const gapJson = hsetCall[2];
      const gap = JSON.parse(gapJson);

      expect(gap).toMatchObject({
        startBlock: 1000,
        endBlock: 2000,
        currentProgress: 1000,
        status: 'pending',
        totalBlocks: 1001,
        processedBlocks: 0,
      });
      expect(gap.createdAt).toBeDefined();
      expect(gap.updatedAt).toBeDefined();
    });
  });

  describe('getGaps', () => {
    it('should return empty array when no gaps exist', async () => {
      mockRedisInstance.hgetall.mockResolvedValue({});

      const result = await RedisService.getGaps(testChainId);

      expect(result).toEqual([]);
      expect(mockRedisInstance.hgetall).toHaveBeenCalledWith(`scanner:gaps:${testChainId}`);
    });

    it('should return parsed gaps array', async () => {
      const mockGaps = {
        gap_123: JSON.stringify({ id: 'gap_123', startBlock: 1000, status: 'pending' }),
        gap_456: JSON.stringify({ id: 'gap_456', startBlock: 2000, status: 'processing' }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.getGaps(testChainId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'gap_123', status: 'pending' });
      expect(result[1]).toMatchObject({ id: 'gap_456', status: 'processing' });
    });
  });

  describe('getNextPendingGap', () => {
    it('should return null when no pending gaps exist', async () => {
      mockRedisInstance.hgetall.mockResolvedValue({});

      const result = await RedisService.getNextPendingGap(testChainId);

      expect(result).toBeNull();
    });

    it('should return oldest pending gap', async () => {
      const earlier = new Date('2024-01-01T09:00:00Z');
      const later = new Date('2024-01-01T10:00:00Z');

      const mockGaps = {
        gap_new: JSON.stringify({
          id: 'gap_new',
          status: 'pending',
          createdAt: later.toISOString(),
        }),
        gap_old: JSON.stringify({
          id: 'gap_old',
          status: 'pending',
          createdAt: earlier.toISOString(),
        }),
        gap_processing: JSON.stringify({
          id: 'gap_processing',
          status: 'processing',
          createdAt: earlier.toISOString(),
        }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.getNextPendingGap(testChainId);

      expect(result.id).toBe('gap_old');
    });
  });

  describe('markGapAsProcessing', () => {
    it('should update gap status to processing', async () => {
      const gapId = 'gap_123';
      const existingGap = { id: gapId, status: 'pending' };

      mockRedisInstance.hget.mockResolvedValue(JSON.stringify(existingGap));
      mockRedisInstance.hset.mockResolvedValue(1);

      await RedisService.markGapAsProcessing(testChainId, gapId);

      expect(mockRedisInstance.hget).toHaveBeenCalledWith(`scanner:gaps:${testChainId}`, gapId);
      expect(mockRedisInstance.hset).toHaveBeenCalledWith(
        `scanner:gaps:${testChainId}`,
        gapId,
        expect.stringContaining('"status":"processing"')
      );
    });
  });

  describe('markGapAsCompleted', () => {
    it('should remove completed gap from Redis', async () => {
      const gapId = 'gap_123';
      mockRedisInstance.hdel.mockResolvedValue(1);

      await RedisService.markGapAsCompleted(testChainId, gapId);

      expect(mockRedisInstance.hdel).toHaveBeenCalledWith(`scanner:gaps:${testChainId}`, gapId);
    });
  });

  describe('markGapAsFailed', () => {
    it('should update gap status to failed with error message', async () => {
      const gapId = 'gap_123';
      const errorMessage = 'Test error';
      const existingGap = { id: gapId, status: 'processing' };

      mockRedisInstance.hget.mockResolvedValue(JSON.stringify(existingGap));
      mockRedisInstance.hset.mockResolvedValue(1);

      await RedisService.markGapAsFailed(testChainId, gapId, errorMessage);

      expect(mockRedisInstance.hset).toHaveBeenCalledWith(
        `scanner:gaps:${testChainId}`,
        gapId,
        expect.stringContaining('"status":"failed"')
      );
      expect(mockRedisInstance.hset).toHaveBeenCalledWith(
        `scanner:gaps:${testChainId}`,
        gapId,
        expect.stringContaining(`"error":"${errorMessage}"`)
      );
    });
  });

  describe('updateGapProgress', () => {
    it('should update progress and calculate processed blocks', async () => {
      const gapId = 'gap_123';
      const currentProgress = 1500;
      const existingGap = {
        id: gapId,
        startBlock: 1000,
        endBlock: 2000,
        status: 'processing',
      };

      mockRedisInstance.hget.mockResolvedValue(JSON.stringify(existingGap));
      mockRedisInstance.hset.mockResolvedValue(1);

      await RedisService.updateGapProgress(testChainId, gapId, currentProgress);

      const hsetCall = mockRedisInstance.hset.mock.calls[0];
      const updatedGap = JSON.parse(hsetCall[2]);

      expect(updatedGap.currentProgress).toBe(1500);
      expect(updatedGap.processedBlocks).toBe(500); // 1500 - 1000
      expect(updatedGap.updatedAt).toBeDefined();
    });

    it('should not update non-existent gap', async () => {
      mockRedisInstance.hget.mockResolvedValue(null);

      await RedisService.updateGapProgress(testChainId, 'non-existent', 1500);

      expect(mockRedisInstance.hset).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentProcessingGap', () => {
    it('should return processing gap when exists', async () => {
      const mockGaps = {
        gap_1: JSON.stringify({ id: 'gap_1', status: 'pending' }),
        gap_2: JSON.stringify({ id: 'gap_2', status: 'processing' }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.getCurrentProcessingGap(testChainId);

      expect(result.id).toBe('gap_2');
      expect(result.status).toBe('processing');
    });

    it('should return null when no processing gap exists', async () => {
      const mockGaps = {
        gap_1: JSON.stringify({ id: 'gap_1', status: 'pending' }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.getCurrentProcessingGap(testChainId);

      expect(result).toBeNull();
    });
  });

  describe('hasGapInProgress', () => {
    it('should return true when processing gap exists', async () => {
      const mockGaps = {
        gap_1: JSON.stringify({ status: 'processing' }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.hasGapInProgress(testChainId);

      expect(result).toBe(true);
    });

    it('should return false when no processing gaps exist', async () => {
      const mockGaps = {
        gap_1: JSON.stringify({ status: 'pending' }),
        gap_2: JSON.stringify({ status: 'failed' }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const result = await RedisService.hasGapInProgress(testChainId);

      expect(result).toBe(false);
    });
  });

  describe('getGapStats', () => {
    it('should calculate correct statistics', async () => {
      const mockGaps = {
        gap_1: JSON.stringify({
          status: 'pending',
          totalBlocks: 1000,
          processedBlocks: 0,
        }),
        gap_2: JSON.stringify({
          status: 'processing',
          totalBlocks: 2000,
          processedBlocks: 500,
        }),
        gap_3: JSON.stringify({
          status: 'failed',
          totalBlocks: 1500,
          processedBlocks: 0,
        }),
      };
      mockRedisInstance.hgetall.mockResolvedValue(mockGaps);

      const stats = await RedisService.getGapStats(testChainId);

      expect(stats).toEqual({
        total: 3,
        pending: 1,
        processing: 1,
        failed: 1,
        totalBlocksRemaining: 2500, // 1000 + (2000-500)
      });
    });
  });

  describe('clearAllGaps', () => {
    it('should delete gaps hash for chain', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await RedisService.clearAllGaps(testChainId);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(`scanner:gaps:${testChainId}`);
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect when no instance exists', async () => {
      (RedisService as any).instance = undefined;

      await RedisService.disconnect();

      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });
});
