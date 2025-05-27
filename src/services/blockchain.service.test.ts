import { BlockchainService } from '../services/blockchain.service';
import { BlockchainModel } from '../models/blockchain.entity';
import {
  BlockchainAlreadyExists,
  BlockchainDisabled,
  BlockchainNotFound,
  ScanEnabledError,
  ValidationError,
} from '../common/errors';

// Mock the BlockchainModel
jest.mock('../models/blockchain.entity', () => ({
  BlockchainModel: jest.fn(),
}));

describe('BlockchainService Unit Tests', () => {
  let mockBlockchainModel: jest.MockedClass<any>;

  // Mock blockchain data
  const mockBlockchain = {
    id: 'blockchain-id-123',
    blockchainId: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.alchemyapi.io',
    contractAddress: '0x1234567890123456789012345678901234567890',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    isActive: true,
    scanEnabled: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockInactiveBlockchain = {
    ...mockBlockchain,
    blockchainId: 'inactive-chain',
    name: 'Inactive Chain',
    isActive: false,
  };

  const mockPolygonBlockchain = {
    ...mockBlockchain,
    id: 'blockchain-id-456',
    blockchainId: 'polygon',
    name: 'Polygon Mainnet',
    chainId: 137,
    symbol: 'POL',
  };

  beforeEach(() => {
    mockBlockchainModel = BlockchainModel as jest.MockedClass<any>;

    // Setup static methods
    mockBlockchainModel.find = jest.fn();
    mockBlockchainModel.findOne = jest.fn();
    mockBlockchainModel.deleteOne = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Clear cache before each test
    BlockchainService.clearCache();

    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Clear cache after each test
    BlockchainService.clearCache();

    // Restore console.log
    jest.restoreAllMocks();
  });

  describe('Cache Management', () => {
    it('should load cache when cache is empty', async () => {
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain, mockPolygonBlockchain] as any);

      await BlockchainService.getAll();

      expect(mockBlockchainModel.find).toHaveBeenCalledWith({});
      expect(console.log).toHaveBeenCalledWith('📦 Loaded 2 blockchains into cache');
    });

    it('should not reload cache if still valid', async () => {
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);

      await BlockchainService.getAll();
      await BlockchainService.getAll();

      expect(mockBlockchainModel.find).toHaveBeenCalledTimes(1);
    });

    it('should clear cache correctly', () => {
      BlockchainService.clearCache();

      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);

      // This should trigger a cache reload
      BlockchainService.getAll();
      expect(mockBlockchainModel.find).toHaveBeenCalled();
    });
  });

  describe('getByBlockchainId', () => {
    beforeEach(() => {
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain, mockInactiveBlockchain] as any);
    });

    it('should throw BlockchainNotFound when blockchain does not exist', async () => {
      await expect(BlockchainService.getByBlockchainId('non-existent')).rejects.toThrow(
        BlockchainNotFound
      );
    });

    it('should throw BlockchainDisabled when blockchain is inactive', async () => {
      await expect(BlockchainService.getByBlockchainId('inactive-chain')).rejects.toThrow(
        BlockchainDisabled
      );
    });

    it('should return blockchain when found and active', async () => {
      const result = await BlockchainService.getByBlockchainId('ethereum');

      expect(result).toEqual(mockBlockchain);
    });
  });

  describe('getByChainId', () => {
    beforeEach(() => {
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain, mockPolygonBlockchain] as any);
    });

    it('should throw BlockchainNotFound when chainId does not exist', async () => {
      await expect(BlockchainService.getByChainId(999)).rejects.toThrow(BlockchainNotFound);
    });

    it('should throw BlockchainDisabled when blockchain with chainId is inactive', async () => {
      const inactiveWithChainId = { ...mockInactiveBlockchain, chainId: 999 };
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain, inactiveWithChainId] as any);

      await expect(BlockchainService.getByChainId(999)).rejects.toThrow(BlockchainDisabled);
    });

    it('should return blockchain when found by chainId', async () => {
      const result = await BlockchainService.getByChainId(1);

      expect(result).toEqual(mockBlockchain);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no active blockchains exist', async () => {
      mockBlockchainModel.find.mockResolvedValue([mockInactiveBlockchain] as any);

      const result = await BlockchainService.getAll();

      expect(result).toEqual([]);
    });

    it('should return all active blockchains sorted by name', async () => {
      const zebraChain = { ...mockBlockchain, blockchainId: 'zebra', name: 'Zebra Chain' };
      const alphaChain = { ...mockBlockchain, blockchainId: 'alpha', name: 'Alpha Chain' };

      mockBlockchainModel.find.mockResolvedValue([
        zebraChain,
        alphaChain,
        mockInactiveBlockchain,
      ] as any);

      const result = await BlockchainService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alpha Chain');
      expect(result[1].name).toBe('Zebra Chain');
      // Should not include inactive blockchain
      expect(result.some(b => b.blockchainId === 'inactive-chain')).toBe(false);
    });
  });

  describe('getScanEnabled', () => {
    it('should return empty array when no blockchains have scanning enabled', async () => {
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any); // scanEnabled: false

      const result = await BlockchainService.getScanEnabled();

      expect(result).toEqual([]);
    });

    it('should return only blockchains with scanning enabled', async () => {
      const scanEnabledChain = { ...mockBlockchain, scanEnabled: true };
      const scanDisabledChain = { ...mockPolygonBlockchain, scanEnabled: false };

      mockBlockchainModel.find.mockResolvedValue([scanEnabledChain, scanDisabledChain] as any);

      const result = await BlockchainService.getScanEnabled();

      expect(result).toHaveLength(1);
      expect(result[0].scanEnabled).toBe(true);
    });
  });

  describe('toggleActive', () => {
    it('should disable blockchain successfully', async () => {
      const activeBlockchain = { ...mockBlockchain, isActive: true, save: jest.fn() };
      mockBlockchainModel.findOne.mockResolvedValue(activeBlockchain as any);

      const result = await BlockchainService.toggleActive('ethereum', false);

      expect(activeBlockchain.isActive).toBe(false);
      expect(activeBlockchain.save).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('should throw BlockchainNotFound when blockchain does not exist', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(null);

      await expect(BlockchainService.toggleActive('non-existent', true)).rejects.toThrow(
        BlockchainNotFound
      );
    });

    it('should clear cache after toggle', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(mockBlockchain as any);

      // Pre-load cache
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);
      await BlockchainService.getAll();

      await BlockchainService.toggleActive('ethereum', false);

      // Reset mock to verify cache is cleared
      mockBlockchainModel.find.mockClear();
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);

      // This should reload cache
      await BlockchainService.getAll();

      expect(mockBlockchainModel.find).toHaveBeenCalled();
    });

    it('should enable blockchain successfully', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(mockBlockchain as any);

      const result = await BlockchainService.toggleActive('ethereum', true);

      expect(mockBlockchainModel.findOne).toHaveBeenCalledWith({ blockchainId: 'ethereum' });
      expect(mockBlockchain.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });
  });

  describe('toggleScanning', () => {
    it('should disable scanning successfully', async () => {
      const scanningBlockchain = {
        ...mockBlockchain,
        scanEnabled: true,
        isActive: true,
        save: jest.fn(),
      };
      mockBlockchainModel.findOne.mockResolvedValue(scanningBlockchain as any);

      const result = await BlockchainService.toggleScanning('ethereum', false);

      expect(scanningBlockchain.scanEnabled).toBe(false);
      expect(scanningBlockchain.save).toHaveBeenCalled();
      expect(result.scanEnabled).toBe(false);
    });

    it('should throw BlockchainNotFound when blockchain does not exist', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(null);

      await expect(BlockchainService.toggleScanning('non-existent', true)).rejects.toThrow(
        BlockchainNotFound
      );
    });

    it('should throw BlockchainDisabled when trying to enable scanning for inactive blockchain', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(mockInactiveBlockchain as any);

      await expect(BlockchainService.toggleScanning('inactive-chain', true)).rejects.toThrow(
        BlockchainDisabled
      );
    });

    it('should throw ValidationError when trying to enable scanning without contract address', async () => {
      const blockchainWithoutContract = {
        ...mockBlockchain,
        isActive: true,
        contractAddress: undefined,
      };
      mockBlockchainModel.findOne.mockResolvedValue(blockchainWithoutContract as any);

      await expect(BlockchainService.toggleScanning('ethereum', true)).rejects.toThrow(
        ValidationError
      );
    });

    it('should allow disabling scanning even without contract address', async () => {
      const blockchainWithoutContract = {
        ...mockBlockchain,
        contractAddress: undefined,
        scanEnabled: true,
        save: jest.fn(),
      };
      mockBlockchainModel.findOne.mockResolvedValue(blockchainWithoutContract as any);

      const result = await BlockchainService.toggleScanning('ethereum', false);

      expect(result.scanEnabled).toBe(false);
      expect(blockchainWithoutContract.save).toHaveBeenCalled();
    });

    it('should enable scanning for active blockchain with contract address', async () => {
      const blockchainWithContract = {
        ...mockBlockchain,
        contractAddress: '0x1234567890123456789012345678901234567890',
        isActive: true,
        save: jest.fn(),
      };
      mockBlockchainModel.findOne.mockResolvedValue(blockchainWithContract as any);

      const result = await BlockchainService.toggleScanning('ethereum', true);

      expect(blockchainWithContract.scanEnabled).toBe(true);
      expect(blockchainWithContract.save).toHaveBeenCalled();
      expect(result.scanEnabled).toBe(true);
    });
  });

  describe('create', () => {
    const validBlockchainData = {
      blockchainId: 'avalanche',
      name: 'Avalanche C-Chain',
      chainId: 43114,
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      blockExplorer: 'https://snowtrace.io',
      nativeCurrency: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    };

    it('should throw BlockchainAlreadyExists when chainId already exists', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(mockBlockchain as any);

      await expect(BlockchainService.create(validBlockchainData)).rejects.toThrow(
        BlockchainAlreadyExists
      );
    });

    it('should create blockchain without chainId validation when chainId is not provided', async () => {
      const dataWithoutChainId = { ...validBlockchainData, chainId: undefined };
      const createdBlockchain = {
        ...dataWithoutChainId,
        save: jest.fn().mockResolvedValue(dataWithoutChainId),
      };

      mockBlockchainModel.mockImplementation(() => createdBlockchain);

      const result = await BlockchainService.create(dataWithoutChainId);

      expect(mockBlockchainModel.findOne).not.toHaveBeenCalled();
      expect(createdBlockchain.save).toHaveBeenCalled();
      expect(result).toBe(createdBlockchain);
    });

    it('should clear cache after creation', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(null);
      const createdBlockchain = {
        ...validBlockchainData,
        save: jest.fn().mockResolvedValue(validBlockchainData),
      };
      mockBlockchainModel.mockImplementation(() => createdBlockchain);

      // Pre-load cache
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);
      await BlockchainService.getAll();

      await BlockchainService.create(validBlockchainData);

      // Reset mock to verify cache is cleared
      mockBlockchainModel.find.mockClear();
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);

      // This should reload cache
      await BlockchainService.getAll();

      expect(mockBlockchainModel.find).toHaveBeenCalled();
    });

    it('should create blockchain successfully', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(null); // No existing blockchain

      const createdBlockchain = {
        ...validBlockchainData,
        save: jest.fn().mockResolvedValue(validBlockchainData),
      };

      // Mock the constructor
      mockBlockchainModel.mockImplementation(() => createdBlockchain);

      const result = await BlockchainService.create(validBlockchainData);

      expect(mockBlockchainModel.findOne).toHaveBeenCalledWith({ chainId: 43114 });
      expect(mockBlockchainModel).toHaveBeenCalledWith(validBlockchainData);
      expect(createdBlockchain.save).toHaveBeenCalled();
      expect(result).toBe(createdBlockchain);
    });
  });

  describe('deleteById', () => {
    it('should throw BlockchainNotFound when blockchain does not exist', async () => {
      mockBlockchainModel.findOne.mockResolvedValue(null);

      await expect(BlockchainService.deleteById('non-existent')).rejects.toThrow(
        BlockchainNotFound
      );

      expect(mockBlockchainModel.deleteOne).not.toHaveBeenCalled();
    });

    it('should throw ScanEnabledError when trying to delete blockchain with scanning enabled', async () => {
      const scanningBlockchain = { ...mockBlockchain, scanEnabled: true };
      mockBlockchainModel.findOne.mockResolvedValue(scanningBlockchain as any);

      await expect(BlockchainService.deleteById('ethereum')).rejects.toThrow(ScanEnabledError);

      expect(mockBlockchainModel.deleteOne).not.toHaveBeenCalled();
    });

    it('should clear cache after deletion', async () => {
      const deletableBlockchain = { ...mockBlockchain, scanEnabled: false };
      mockBlockchainModel.findOne.mockResolvedValue(deletableBlockchain as any);
      mockBlockchainModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      // Pre-load cache
      mockBlockchainModel.find.mockResolvedValue([mockBlockchain] as any);
      await BlockchainService.getAll();

      await BlockchainService.deleteById('ethereum');

      // Reset mock to verify cache is cleared
      mockBlockchainModel.find.mockClear();
      mockBlockchainModel.find.mockResolvedValue([]) as any;

      // This should reload cache
      await BlockchainService.getAll();

      expect(mockBlockchainModel.find).toHaveBeenCalled();
    });

    it('should delete blockchain successfully', async () => {
      const deletableBlockchain = { ...mockBlockchain, scanEnabled: false };
      mockBlockchainModel.findOne.mockResolvedValue(deletableBlockchain as any);
      mockBlockchainModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const result = await BlockchainService.deleteById('ethereum');

      expect(mockBlockchainModel.findOne).toHaveBeenCalledWith({ blockchainId: 'ethereum' });
      expect(mockBlockchainModel.deleteOne).toHaveBeenCalledWith({ blockchainId: 'ethereum' });
      expect(result).toEqual(deletableBlockchain);
    });
  });
});
