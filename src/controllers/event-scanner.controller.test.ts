import { EventScannerController } from '../controllers/event-scanner.controller';
import { EventScannerService } from '../services/event-scanner.service';
import { BlockchainService } from '../services/blockchain.service';
import {
  ValidationError,
  ScannerAlreadyRunningError,
  BlockchainNotFound,
  BlockchainError,
  ScannerNotFoundError,
  ScannerError,
} from '../common/errors';

// Mock dependencies
jest.mock('../services/event-scanner.service');
jest.mock('../services/blockchain.service');

describe('EventScannerController', () => {
  let controller: EventScannerController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockScannerService: jest.Mocked<EventScannerService>;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new EventScannerController();

    mockReq = {
      body: {},
    };

    mockRes = {
      json: jest.fn(),
    };

    mockNext = jest.fn();

    mockScannerService = {
      startRealTimeListener: jest.fn(),
      stop: jest.fn(),
      cleanup: jest.fn(),
      scanBlockRange: jest.fn(),
    } as any;

    (EventScannerService as jest.Mock).mockImplementation(() => mockScannerService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('startScanner', () => {
    beforeEach(() => {
      mockReq.body = { chainId: 137 };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
    });

    it('should validate chainId is a positive number', async () => {
      mockReq.body.chainId = -1;

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate chainId is a number', async () => {
      mockReq.body.chainId = 'invalid';

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should prevent starting already running scanner', async () => {
      await controller.startScanner(mockReq, mockRes, mockNext);
      jest.clearAllMocks();

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ScannerAlreadyRunningError));
    });

    it('should handle blockchain not found', async () => {
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue(null);

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BlockchainNotFound));
    });

    it('should handle scanner startup failure', async () => {
      const error = new Error('Connection failed');
      mockScannerService.startRealTimeListener.mockRejectedValue(error);

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BlockchainError));
    });

    it('should start scanner successfully', async () => {
      mockScannerService.startRealTimeListener.mockResolvedValue(undefined);

      await controller.startScanner(mockReq, mockRes, mockNext);

      expect(EventScannerService).toHaveBeenCalledWith(137, 'https://polygon-rpc.com', '0x123');
      expect(mockScannerService.startRealTimeListener).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event scanner started for chain 137',
        data: {
          chainId: 137,
          startedAt: expect.any(Date),
        },
      });
    });
  });

  describe('stopScanner', () => {
    beforeEach(() => {
      mockReq.body = { chainId: 137 };
    });

    it('should validate chainId is a positive number', async () => {
      mockReq.body.chainId = 0;

      await controller.stopScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle scanner not found', async () => {
      mockReq.body.chainId = 999; // Non-existent scanner

      await controller.stopScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ScannerNotFoundError));
    });

    it('should handle scanner stop failure', async () => {
      mockReq.body = { chainId: 137 };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
      await controller.startScanner(mockReq, mockRes, mockNext);
      jest.clearAllMocks();

      const error = new Error('Stop failed');
      mockScannerService.stop.mockImplementation(() => {
        throw error;
      });

      await controller.stopScanner(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ScannerError));
    });

    it('should stop scanner successfully', async () => {
      mockReq.body = { chainId: 137 };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
      await controller.startScanner(mockReq, mockRes, mockNext);
      jest.clearAllMocks();

      mockScannerService.stop.mockResolvedValue(undefined);

      await controller.stopScanner(mockReq, mockRes, mockNext);

      expect(mockScannerService.stop).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event scanner stopped for chain 137',
        data: {
          chainId: 137,
          stoppedAt: expect.any(Date),
        },
      });
    });
  });

  describe('scanBlockRange', () => {
    beforeEach(() => {
      mockReq.body = {
        chainId: 137,
        fromBlock: 1000,
        toBlock: 2000,
      };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
    });

    it('should reject large block ranges', async () => {
      mockReq.body.toBlock = 20000; // Range of 19000 blocks

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockScannerService.scanBlockRange).not.toHaveBeenCalled();
    });

    it('should handle blockchain not found', async () => {
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue(null);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BlockchainNotFound));
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout occurred');
      mockScannerService.scanBlockRange.mockRejectedValue(error);
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockScannerService.cleanup).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(BlockchainError));
    });

    it('should handle general scanning errors', async () => {
      const error = new Error('Scan failed');
      mockScannerService.scanBlockRange.mockRejectedValue(error);
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ScannerError));
    });

    it('should handle unknown error types', async () => {
      mockScannerService.scanBlockRange.mockRejectedValue('String error');
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ScannerError));
    });

    it('should cleanup even when scan fails', async () => {
      const error = new Error('Scan failed');
      mockScannerService.scanBlockRange.mockRejectedValue(error);
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockScannerService.cleanup).toHaveBeenCalled();
    });

    it('should scan block range successfully', async () => {
      mockScannerService.scanBlockRange.mockResolvedValue(undefined);
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.scanBlockRange(mockReq, mockRes, mockNext);

      expect(mockScannerService.scanBlockRange).toHaveBeenCalledWith(1000, 2000);
      expect(mockScannerService.cleanup).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully scanned blocks 1000 to 2000 for chain 137',
        data: {
          chainId: 137,
          fromBlock: 1000,
          toBlock: 2000,
          blocksScanned: 1000,
          scannedAt: expect.any(Date),
        },
      });
    });
  });

  describe('stopAllScanners', () => {
    it('should handle errors when stopping individual scanners', async () => {
      mockReq.body = { chainId: 137 };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
      await controller.startScanner(mockReq, mockRes, mockNext);
      jest.clearAllMocks();

      mockScannerService.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      await expect(controller.stopAllScanners()).resolves.not.toThrow();
    });

    it('should clear scanners map after stopping all', async () => {
      mockReq.body = { chainId: 137 };
      (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x123',
      });
      await controller.startScanner(mockReq, mockRes, mockNext);

      expect((controller as any).scanners.size).toBe(1);

      await controller.stopAllScanners();

      expect((controller as any).scanners.size).toBe(0);
    });

    it('should handle empty scanners map', async () => {
      await expect(controller.stopAllScanners()).resolves.not.toThrow();
    });

    it('should stop all running scanners', async () => {
      const chainIds = [137, 1, 56];
      for (const chainId of chainIds) {
        mockReq.body = { chainId };
        (BlockchainService.getByChainId as jest.Mock).mockResolvedValue({
          chainId,
          rpcUrl: `https://rpc-${chainId}.com`,
          contractAddress: '0x123',
        });
        await controller.startScanner(mockReq, mockRes, mockNext);
      }
      jest.clearAllMocks();

      mockScannerService.stop.mockResolvedValue(undefined);
      mockScannerService.cleanup.mockResolvedValue(undefined);

      await controller.stopAllScanners();

      expect(mockScannerService.stop).toHaveBeenCalledTimes(3);
      expect(mockScannerService.cleanup).toHaveBeenCalledTimes(3);
    });
  });
});
