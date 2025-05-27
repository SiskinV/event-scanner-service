import { GapProcessor } from '../services/gap-processor.service';
import { RedisService } from '../services/redis.service';

jest.mock('../services/redis.service');

describe('GapProcessor', () => {
  let processor: GapProcessor;
  let mockScanBlocks: jest.Mock;
  const chainId = 137;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockScanBlocks = jest.fn().mockResolvedValue(undefined);

    processor = new GapProcessor({
      chainId,
      chunkSize: 100,
      processInterval: 1000,
      onScanBlocks: mockScanBlocks,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use provided options', () => {
      expect(processor['chainId']).toBe(chainId);
      expect(processor['chunkSize']).toBe(100);
      expect(processor['processInterval']).toBe(1000);
    });

    it('should use defaults when not provided', () => {
      const defaultProcessor = new GapProcessor({ chainId });
      expect(defaultProcessor['chunkSize']).toBe(200);
      expect(defaultProcessor['processInterval']).toBe(2000);
    });
  });

  describe('start/stop', () => {
    it('should stop and clear state', () => {
      processor.start();
      processor.stop();
      expect(processor['isRunning']).toBe(false);
      expect(processor['intervalId']).toBeNull();
    });

    it('should not start twice', () => {
      processor.start();
      const firstInterval = processor['intervalId'];
      processor.start();
      expect(processor['intervalId']).toBe(firstInterval);
    });

    it('should start and set running state', () => {
      processor.start();
      expect(processor['isRunning']).toBe(true);
      expect(processor['intervalId']).not.toBeNull();
    });
  });

  describe('addGap', () => {
    it('should delegate to RedisService', async () => {
      (RedisService.addGap as jest.Mock).mockResolvedValue('gap_123');

      const result = await processor.addGap(1000, 2000);

      expect(result).toBe('gap_123');
      expect(RedisService.addGap).toHaveBeenCalledWith(chainId, 1000, 2000);
    });
  });

  describe('getStatus', () => {
    it('should return complete status', async () => {
      const mockStats = { pending: 1, processing: 0, total: 1 };
      const mockGap = { id: 'gap_1', status: 'pending' };

      (RedisService.getGapStats as jest.Mock).mockResolvedValue(mockStats);
      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(mockGap);

      const status = await processor.getStatus();

      expect(status).toMatchObject({
        isRunning: false,
        chainId,
        chunkSize: 100,
        processInterval: 1000,
        gapStats: mockStats,
        currentGap: mockGap,
      });
    });
  });

  describe('processGapChunk', () => {
    it('should start processing pending gap', async () => {
      const mockGap = {
        id: 'gap_1',
        startBlock: 1000,
        endBlock: 2000,
        currentProgress: 1000,
      };

      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(null);
      (RedisService.getNextPendingGap as jest.Mock).mockResolvedValue(mockGap);
      (RedisService.markGapAsProcessing as jest.Mock).mockResolvedValue(undefined);
      (RedisService.updateGapProgress as jest.Mock).mockResolvedValue(undefined);

      await processor.processNow();

      expect(RedisService.markGapAsProcessing).toHaveBeenCalledWith(chainId, 'gap_1');
      expect(mockScanBlocks).toHaveBeenCalledWith(1000, 1099);
      expect(RedisService.updateGapProgress).toHaveBeenCalledWith(chainId, 'gap_1', 1099);
    });

    it('should continue current gap', async () => {
      const mockGap = {
        id: 'gap_2',
        startBlock: 1000,
        endBlock: 2000,
        currentProgress: 1500,
      };

      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(mockGap);
      (RedisService.updateGapProgress as jest.Mock).mockResolvedValue(undefined);

      await processor.processNow();

      expect(mockScanBlocks).toHaveBeenCalledWith(1500, 1599);
      expect(RedisService.updateGapProgress).toHaveBeenCalledWith(chainId, 'gap_2', 1599);
    });

    it('should complete gap at end block', async () => {
      const mockGap = {
        id: 'gap_3',
        startBlock: 1000,
        endBlock: 1050,
        currentProgress: 1000,
      };

      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(mockGap);
      (RedisService.updateGapProgress as jest.Mock).mockResolvedValue(undefined);
      (RedisService.markGapAsCompleted as jest.Mock).mockResolvedValue(undefined);
      (RedisService.getGapStats as jest.Mock).mockResolvedValue({ pending: 0 });

      await processor.processNow();

      expect(mockScanBlocks).toHaveBeenCalledWith(1000, 1050);
      expect(RedisService.markGapAsCompleted).toHaveBeenCalledWith(chainId, 'gap_3');
    });

    it('should do nothing when no gaps exist', async () => {
      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(null);
      (RedisService.getNextPendingGap as jest.Mock).mockResolvedValue(null);

      await processor.processNow();

      expect(mockScanBlocks).not.toHaveBeenCalled();
    });

    it('should handle scan errors', async () => {
      const mockGap = { id: 'gap_error', startBlock: 1000, currentProgress: 1000 };
      const error = new Error('Scan failed');

      (RedisService.getCurrentProcessingGap as jest.Mock).mockResolvedValue(mockGap);
      mockScanBlocks.mockRejectedValue(error);
      (RedisService.markGapAsFailed as jest.Mock).mockResolvedValue(undefined);

      await processor.processNow();

      expect(RedisService.markGapAsFailed).toHaveBeenCalledWith(
        chainId,
        'gap_error',
        'Scan failed'
      );
    });
  });
});
