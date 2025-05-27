import { EventScannerService } from '../services/event-scanner.service';
import { RedisService } from '../services/redis.service';
import { GapProcessor } from '../services/gap-processor.service';
import { FeeCollectionEventModel } from '../models/fee-collection-event.entity';

// Mock dependencies
jest.mock('../services/redis.service');
jest.mock('../services/gap-processor.service');
jest.mock('../models/fee-collection-event.entity');
jest.mock('ethers', () => ({
  BigNumber: {
    from: jest.fn(val => ({
      toString: () => val.toString(),
      toHexString: () => `0x${val.toString(16)}`,
    })),
  },
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBlockNumber: jest.fn(),
        getBlock: jest.fn(),
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      filters: {
        FeesCollected: jest.fn(() => ({})),
      },
      queryFilter: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      interface: {
        parseLog: jest.fn(),
      },
    })),
  },
}));

describe('EventScannerService', () => {
  let service: EventScannerService;
  let mockProvider: any;
  let mockContract: any;
  let mockGapProcessor: jest.Mocked<GapProcessor>;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const { ethers } = require('ethers');
    mockProvider = new ethers.providers.JsonRpcProvider();
    mockContract = new ethers.Contract();

    mockGapProcessor = {
      addGap: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any;

    (GapProcessor as jest.Mock).mockImplementation(() => mockGapProcessor);

    service = new EventScannerService(137, 'https://polygon-rpc.com', '0x123');

    // Set up the provider and contract on the service instance
    service['provider'] = mockProvider;
    service['contract'] = mockContract;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(service['chainId']).toBe(137);
      expect(service['isRunning']).toBe(false);
    });
  });

  describe('scanBlockRange', () => {
    it('should handle scanning errors', async () => {
      const error = new Error('RPC error');
      mockContract.queryFilter.mockRejectedValue(error);

      await expect(service.scanBlockRange(1000, 2000)).rejects.toThrow('RPC error');
    });

    it('should handle empty events array', async () => {
      mockContract.queryFilter.mockResolvedValue([]);
      jest.spyOn(service as any, 'processEvent').mockResolvedValue(undefined);

      await service.scanBlockRange(1000, 2000);

      expect(mockContract.queryFilter).toHaveBeenCalledWith({}, 1000, 2000);
      expect(service['processEvent']).not.toHaveBeenCalled();
    });

    it('should scan blocks and process events successfully', async () => {
      const mockEvents = [
        { blockNumber: 1000, transactionHash: '0xabc', logIndex: 1 },
        { blockNumber: 1001, transactionHash: '0xdef', logIndex: 2 },
      ];

      mockContract.queryFilter.mockResolvedValue(mockEvents);
      jest.spyOn(service as any, 'processEvent').mockResolvedValue(undefined);

      await service.scanBlockRange(1000, 2000);

      expect(mockContract.queryFilter).toHaveBeenCalledWith({}, 1000, 2000);
      expect(service['processEvent']).toHaveBeenCalledTimes(2);
    });
  });

  describe('startRealTimeListener', () => {
    beforeEach(() => {
      mockProvider.getBlockNumber.mockResolvedValue(5000);
      (RedisService.getLastProcessedBlock as jest.Mock).mockResolvedValue(4000);
      (RedisService.setLastProcessedBlock as jest.Mock).mockResolvedValue(undefined);
      jest.spyOn(service as any, 'detectAndCreateGaps').mockResolvedValue(undefined);
    });

    it('should not start if already running', async () => {
      service['isRunning'] = true;

      await service.startRealTimeListener();

      expect(GapProcessor).not.toHaveBeenCalled();
    });

    it('should create gap processor and detect gaps', async () => {
      await service.startRealTimeListener();

      expect(GapProcessor).toHaveBeenCalledWith({
        chainId: 137,
        chunkSize: 100,
        processInterval: 10000,
        onScanBlocks: expect.any(Function),
      });
      expect(service['detectAndCreateGaps']).toHaveBeenCalled();
      expect(mockGapProcessor.start).toHaveBeenCalled();
    });

    it('should set up event listener', async () => {
      await service.startRealTimeListener();

      expect(mockContract.on).toHaveBeenCalledWith('FeesCollected', expect.any(Function));
      expect(service['isRunning']).toBe(true);
    });

    it('should handle gap processor callback', async () => {
      jest.spyOn(service, 'scanBlockRange').mockResolvedValue(undefined);

      await service.startRealTimeListener();

      const gapProcessorConfig = (GapProcessor as jest.Mock).mock.calls[0][0];
      const onScanBlocks = gapProcessorConfig.onScanBlocks;

      await onScanBlocks(1000, 2000);

      expect(service.scanBlockRange).toHaveBeenCalledWith(1000, 2000);
    });

    it('should handle real-time event callback', async () => {
      jest.spyOn(service as any, 'processEvent').mockResolvedValue(undefined);

      await service.startRealTimeListener();

      // Get the event listener callback
      const eventCallback = mockContract.on.mock.calls[0][1];
      const mockEvent = { blockNumber: 5001 };

      await eventCallback('token', 'integrator', 'integratorFee', 'lifiFee', mockEvent);

      expect(service['processEvent']).toHaveBeenCalledWith(mockEvent);
      expect(RedisService.setLastProcessedBlock).toHaveBeenCalledWith(137, 5001);
    });
  });

  describe('detectAndCreateGaps', () => {
    beforeEach(() => {
      service['gapProcessor'] = mockGapProcessor;
      mockProvider.getBlockNumber.mockResolvedValue(5000);
    });

    it('should handle no Redis state and check database', async () => {
      (RedisService.getLastProcessedBlock as jest.Mock).mockResolvedValue(null);
      (FeeCollectionEventModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ blockNumber: 3000 }),
      });

      await service['detectAndCreateGaps']();

      expect(mockGapProcessor.addGap).toHaveBeenCalledWith(3001, 5000);
      expect(RedisService.setLastProcessedBlock).toHaveBeenCalledWith(137, 5000);
    });

    it('should handle no database state', async () => {
      (RedisService.getLastProcessedBlock as jest.Mock).mockResolvedValue(null);
      (FeeCollectionEventModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await service['detectAndCreateGaps']();

      expect(mockGapProcessor.addGap).toHaveBeenCalledWith(4901, 5000);
    });

    it('should handle no gaps needed', async () => {
      (RedisService.getLastProcessedBlock as jest.Mock).mockResolvedValue(5000);

      await service['detectAndCreateGaps']();

      expect(mockGapProcessor.addGap).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockProvider.getBlockNumber.mockRejectedValue(new Error('Provider error'));

      await service['detectAndCreateGaps']();

      expect(mockGapProcessor.addGap).not.toHaveBeenCalled();
    });

    it('should detect gap from Redis state', async () => {
      (RedisService.getLastProcessedBlock as jest.Mock).mockResolvedValue(4000);

      await service['detectAndCreateGaps']();

      expect(mockGapProcessor.addGap).toHaveBeenCalledWith(4001, 5000);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      service['isRunning'] = true;
      service['gapProcessor'] = mockGapProcessor;
      mockProvider.getBlockNumber.mockResolvedValue(6000);
      (RedisService.setLastProcessedBlock as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle Redis save error gracefully', async () => {
      (RedisService.setLastProcessedBlock as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await service.stop();

      expect(service['isRunning']).toBe(false);
      expect(mockGapProcessor.stop).toHaveBeenCalled();
    });

    it('should handle missing gap processor', async () => {
      service['gapProcessor'] = null;

      await service.stop();

      expect(service['isRunning']).toBe(false);
      expect(mockGapProcessor.stop).not.toHaveBeenCalled();
    });

    it('should stop successfully and save state', async () => {
      await service.stop();

      expect(service['isRunning']).toBe(false);
      expect(RedisService.setLastProcessedBlock).toHaveBeenCalledWith(137, 6000);
      expect(mockGapProcessor.stop).toHaveBeenCalled();
      expect(service['gapProcessor']).toBeNull();
      expect(mockContract.removeAllListeners).toHaveBeenCalledWith('FeesCollected');
    });
  });

  describe('processEvent', () => {
    it('should process event successfully', async () => {
      const mockEvent = {
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      };

      const mockParsedEvent = {
        token: '0xtoken',
        integrator: '0xintegrator',
      };

      jest.spyOn(service as any, 'parseEvent').mockReturnValue(mockParsedEvent);
      jest.spyOn(service as any, 'saveEvent').mockResolvedValue(undefined);

      await service['processEvent'](mockEvent as any);

      expect(service['parseEvent']).toHaveBeenCalledWith(mockEvent);
      expect(service['saveEvent']).toHaveBeenCalledWith(mockParsedEvent);
    });

    it('should handle processing errors', async () => {
      const mockEvent = { transactionHash: '0xabc', logIndex: 1 };
      jest.spyOn(service as any, 'parseEvent').mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Should not throw, just log error
      await service['processEvent'](mockEvent as any);

      expect(service['parseEvent']).toHaveBeenCalled();
    });
  });

  describe('parseEvent', () => {
    it('should handle parseLog errors', () => {
      const mockEvent = {
        blockNumber: 1000,
        transactionHash: '0xABC123',
        logIndex: 1,
      };

      mockContract.interface.parseLog.mockImplementation(() => {
        throw new Error('Parse log error');
      });

      expect(() => service['parseEvent'](mockEvent as any)).toThrow('Parse log error');
    });

    it('should parse event correctly', () => {
      const mockEvent = {
        blockNumber: 1000,
        transactionHash: '0xABC123',
        logIndex: 1,
      };

      mockContract.interface.parseLog.mockReturnValue({
        args: ['0xTOKEN', '0xINTEGRATOR', '1000000', '500000'],
      });

      const result = service['parseEvent'](mockEvent as any);

      expect(result).toEqual({
        token: '0xtoken',
        integrator: '0xintegrator',
        integratorFee: { toString: expect.any(Function), toHexString: expect.any(Function) },
        lifiFee: { toString: expect.any(Function), toHexString: expect.any(Function) },
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      });
    });
  });

  describe('saveEvent', () => {
    beforeEach(() => {
      mockProvider.getBlock.mockResolvedValue({ timestamp: 1640995200 });
    });

    it('should handle duplicate key error', async () => {
      const mockParsedEvent = {
        token: '0xtoken',
        integrator: '0xintegrator',
        integratorFee: { toString: () => '1000', toHexString: () => '0x3e8' },
        lifiFee: { toString: () => '500', toHexString: () => '0x1f4' },
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      };

      const duplicateError = new Error('Duplicate key');
      (duplicateError as any).code = 11000;

      const mockSave = jest.fn().mockRejectedValue(duplicateError);
      (FeeCollectionEventModel as any).mockImplementation(() => ({
        save: mockSave,
      }));

      // Should not throw
      await service['saveEvent'](mockParsedEvent as any);

      expect(mockSave).toHaveBeenCalled();
    });

    it('should rethrow non-duplicate errors', async () => {
      const mockParsedEvent = {
        token: '0xtoken',
        integrator: '0xintegrator',
        integratorFee: { toString: () => '1000', toHexString: () => '0x3e8' },
        lifiFee: { toString: () => '500', toHexString: () => '0x1f4' },
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      };

      const otherError = new Error('Database error');
      const mockSave = jest.fn().mockRejectedValue(otherError);
      (FeeCollectionEventModel as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(service['saveEvent'](mockParsedEvent as any)).rejects.toThrow('Database error');
    });

    it('should handle getBlock errors', async () => {
      const mockParsedEvent = {
        token: '0xtoken',
        integrator: '0xintegrator',
        integratorFee: { toString: () => '1000', toHexString: () => '0x3e8' },
        lifiFee: { toString: () => '500', toHexString: () => '0x1f4' },
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      };

      mockProvider.getBlock.mockRejectedValue(new Error('Block fetch error'));

      await expect(service['saveEvent'](mockParsedEvent as any)).rejects.toThrow(
        'Block fetch error'
      );
    });

    it('should save event successfully', async () => {
      const mockParsedEvent = {
        token: '0xtoken',
        integrator: '0xintegrator',
        integratorFee: { toString: () => '1000', toHexString: () => '0x3e8' },
        lifiFee: { toString: () => '500', toHexString: () => '0x1f4' },
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
      };

      const mockSave = jest.fn().mockResolvedValue({});
      (FeeCollectionEventModel as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await service['saveEvent'](mockParsedEvent as any);

      expect(FeeCollectionEventModel).toHaveBeenCalledWith({
        integrator: '0xintegrator',
        token: '0xtoken',
        integratorFee: '1000',
        lifiFee: '500',
        integratorFeeHex: '0x3e8',
        lifiFeeHex: '0x1f4',
        blockNumber: 1000,
        transactionHash: '0xabc123',
        logIndex: 1,
        chainId: 137,
        blockTimestamp: new Date(1640995200000),
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should call stop method', async () => {
      jest.spyOn(service, 'stop').mockResolvedValue(undefined);

      await service.cleanup();

      expect(service.stop).toHaveBeenCalled();
    });
  });
});
