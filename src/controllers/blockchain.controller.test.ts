import { Request, Response, NextFunction } from 'express';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from '../services/blockchain.service';
import { BlockchainNotFound, BlockchainDisabled } from '../common/errors';
import { mapBlockchainResponse } from '../dtos/blockchains/blockchain-response.mapper';
import { mapBlockchainDetailResponse } from '../dtos/blockchains/blockchain-details-response.mapper';

// Mock the BlockchainService
jest.mock('../services/blockchain.service');

// Mock the mapper functions
jest.mock('../dtos/blockchains/blockchain-response.mapper');
jest.mock('../dtos/blockchains/blockchain-details-response.mapper');

describe('BlockchainController Unit Tests', () => {
  let controller: BlockchainController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockBlockchainService: jest.Mocked<typeof BlockchainService>;
  let mockMapBlockchainResponse: jest.MockedFunction<typeof mapBlockchainResponse>;
  let mockMapBlockchainDetailResponse: jest.MockedFunction<typeof mapBlockchainDetailResponse>;

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
  };

  // Mock mapped responses
  const mockMappedResponse = {
    id: 'blockchain-id-123',
    blockchainId: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    symbol: 'ETH',
    isActive: true,
    scanEnabled: false,
  };

  const mockMappedDetailResponse = {
    ...mockMappedResponse,
    rpcUrl: 'https://eth-mainnet.alchemyapi.io',
    contractAddress: '0x1234567890123456789012345678901234567890',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: 'Ethereum',
    decimals: 18,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    controller = new BlockchainController();
    mockBlockchainService = BlockchainService as jest.Mocked<typeof BlockchainService>;
    mockMapBlockchainResponse = mapBlockchainResponse as jest.MockedFunction<
      typeof mapBlockchainResponse
    >;
    mockMapBlockchainDetailResponse = mapBlockchainDetailResponse as jest.MockedFunction<
      typeof mapBlockchainDetailResponse
    >;

    mockRequest = {};
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup default mock returns
    mockMapBlockchainResponse.mockReturnValue(mockMappedResponse as any);
    mockMapBlockchainDetailResponse.mockReturnValue(mockMappedDetailResponse);
  });

  describe('getAllBlockchains', () => {
    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockBlockchainService.getAll.mockRejectedValue(error);

      await controller.getAllBlockchains(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockBlockchainService.getAll).toHaveBeenCalledTimes(1);
      expect(mockMapBlockchainResponse).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should return empty array when no blockchains exist', async () => {
      mockBlockchainService.getAll.mockResolvedValue([]);

      await controller.getAllBlockchains(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All blockchains retrieved successfully',
        data: {
          blockchains: [],
          total: 0,
        },
      });
      expect(mockMapBlockchainResponse).not.toHaveBeenCalled();
    });

    it('should return all blockchains successfully', async () => {
      const mockBlockchains = [mockBlockchain];
      mockBlockchainService.getAll.mockResolvedValue(mockBlockchains as any);

      await controller.getAllBlockchains(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockBlockchainService.getAll).toHaveBeenCalledTimes(1);
      expect(mockMapBlockchainResponse).toHaveBeenCalledWith(mockBlockchain);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All blockchains retrieved successfully',
        data: {
          blockchains: [mockMappedResponse],
          total: 1,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('getBlockchainById', () => {
    it('should throw ValidationError when ID is missing', async () => {
      mockRequest.params = {}; // No ID

      await controller.getBlockchainById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Blockchain ID is required',
        })
      );
      expect(mockBlockchainService.getByBlockchainId).not.toHaveBeenCalled();
      expect(mockMapBlockchainDetailResponse).not.toHaveBeenCalled();
    });

    it('should handle BlockchainNotFound error', async () => {
      mockRequest.params = { id: 'non-existent' };
      const error = new BlockchainNotFound('non-existent');
      mockBlockchainService.getByBlockchainId.mockRejectedValue(error);

      await controller.getBlockchainById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockMapBlockchainDetailResponse).not.toHaveBeenCalled();
    });

    it('should handle BlockchainDisabled error', async () => {
      mockRequest.params = { id: 'disabled-chain' };
      const error = new BlockchainDisabled('disabled-chain');
      mockBlockchainService.getByBlockchainId.mockRejectedValue(error);

      await controller.getBlockchainById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should return blockchain by ID successfully', async () => {
      mockRequest.params = { id: 'ethereum' };
      mockBlockchainService.getByBlockchainId.mockResolvedValue(mockBlockchain as any);

      await controller.getBlockchainById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockBlockchainService.getByBlockchainId).toHaveBeenCalledWith('ethereum');
      expect(mockMapBlockchainDetailResponse).toHaveBeenCalledWith(mockBlockchain);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Blockchain retrieved successfully',
        data: mockMappedDetailResponse,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('addBlockchain', () => {
    const validBlockchainData = {
      blockchainId: '  AVALANCHE  ',
      name: '  Avalanche C-Chain  ',
      chainId: 43114,
      rpcUrl: '  https://api.avax.network/ext/bc/C/rpc  ',
      contractAddress: '  0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9  ',
      blockExplorer: '  https://snowtrace.io  ',
      nativeCurrency: '  Avalanche  ',
      symbol: '  avax  ',
      decimals: 18,
      isActive: true,
      scanEnabled: false,
    };

    it('should throw ValidationError for missing required fields', async () => {
      mockRequest.body = { name: 'Incomplete Chain', chainId: 137 }; // Missing required fields

      await controller.addBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Missing required fields: blockchainId, name, rpcUrl, blockExplorer, nativeCurrency, symbol, chainId',
        })
      );
      expect(mockBlockchainService.create).not.toHaveBeenCalled();
      expect(mockMapBlockchainDetailResponse).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      const minimalData = {
        blockchainId: 'test-chain',
        name: 'Test Chain',
        chainId: 137,
        rpcUrl: 'https://test-rpc.com',
        blockExplorer: 'https://test-explorer.com',
        nativeCurrency: 'Test',
        symbol: 'TEST',
        decimals: 18,
      };
      mockRequest.body = minimalData;
      mockBlockchainService.create.mockResolvedValue(mockBlockchain as any);

      await controller.addBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true, // Default value
          scanEnabled: false, // Default value
        })
      );
    });

    it('should handle service creation errors', async () => {
      mockRequest.body = validBlockchainData;
      const error = new Error('Duplicate blockchain ID');
      mockBlockchainService.create.mockRejectedValue(error);

      await controller.addBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockMapBlockchainDetailResponse).not.toHaveBeenCalled();
    });

    it('should create blockchain with valid data', async () => {
      mockRequest.body = validBlockchainData;
      mockBlockchainService.create.mockResolvedValue(mockBlockchain as any);

      await controller.addBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.create).toHaveBeenCalledWith({
        blockchainId: 'avalanche',
        name: 'Avalanche C-Chain',
        chainId: 43114,
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        contractAddress: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
        blockExplorer: 'https://snowtrace.io',
        nativeCurrency: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
        isActive: true,
        scanEnabled: false,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockMapBlockchainDetailResponse).toHaveBeenCalledWith(mockBlockchain);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: `Blockchain ${mockBlockchain.name} added successfully`,
        data: mockMappedDetailResponse,
      });
    });
  });

  describe('toggleBlockchain', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'ethereum' };
    });

    it('should enable blockchain successfully', async () => {
      mockRequest.body = { isActive: true };
      const updatedBlockchain = { ...mockBlockchain, isActive: true };
      mockBlockchainService.toggleActive.mockResolvedValue(updatedBlockchain as any);

      await controller.toggleBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.toggleActive).toHaveBeenCalledWith('ethereum', true);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Blockchain enabled successfully',
        data: expect.objectContaining({
          isActive: true,
          blockchainId: 'ethereum',
        }),
      });
    });

    it('should disable blockchain successfully', async () => {
      mockRequest.body = { isActive: false };
      const updatedBlockchain = { ...mockBlockchain, isActive: false };
      mockBlockchainService.toggleActive.mockResolvedValue(updatedBlockchain as any);

      await controller.toggleBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.toggleActive).toHaveBeenCalledWith('ethereum', false);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Blockchain disabled successfully',
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should handle service errors', async () => {
      mockRequest.body = { isActive: true };
      const error = new BlockchainNotFound('ethereum');
      mockBlockchainService.toggleActive.mockRejectedValue(error);

      await controller.toggleBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('toggleScanning', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'ethereum' };
    });

    it('should handle service errors', async () => {
      mockRequest.body = { scanEnabled: true };
      const error = new Error(
        'Cannot enable scanning: contract address is required for EVM blockchains'
      );
      mockBlockchainService.toggleScanning.mockRejectedValue(error);

      await controller.toggleScanning(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should enable scanning successfully', async () => {
      mockRequest.body = { scanEnabled: true };
      const updatedBlockchain = { ...mockBlockchain, scanEnabled: true };
      mockBlockchainService.toggleScanning.mockResolvedValue(updatedBlockchain as any);

      await controller.toggleScanning(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.toggleScanning).toHaveBeenCalledWith('ethereum', true);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: `Scanning enabled for ${mockBlockchain.name}`,
        data: expect.objectContaining({
          scanEnabled: true,
          blockchainId: 'ethereum',
        }),
      });
    });

    it('should disable scanning successfully', async () => {
      mockRequest.body = { scanEnabled: false };
      const updatedBlockchain = { ...mockBlockchain, scanEnabled: false };
      mockBlockchainService.toggleScanning.mockResolvedValue(updatedBlockchain as any);

      await controller.toggleScanning(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: `Scanning disabled for ${mockBlockchain.name}`,
        data: expect.objectContaining({
          scanEnabled: false,
        }),
      });
    });
  });

  describe('deleteBlockchain', () => {
    it('should throw ValidationError when ID is missing', async () => {
      mockRequest.params = {}; // No ID

      await controller.deleteBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Blockchain ID is required',
        })
      );
      expect(mockBlockchainService.deleteById).not.toHaveBeenCalled();
    });

    it('should handle service errors (scanning enabled)', async () => {
      mockRequest.params = { id: 'ethereum' };
      const error = new Error(
        'Cannot delete blockchain with scanning enabled. Disable scanning first'
      );
      mockBlockchainService.deleteById.mockRejectedValue(error);

      await controller.deleteBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should delete blockchain successfully', async () => {
      mockRequest.params = { id: 'ethereum' };
      mockBlockchainService.deleteById.mockResolvedValue(mockBlockchain as any);

      await controller.deleteBlockchain(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockBlockchainService.deleteById).toHaveBeenCalledWith('ethereum');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: `Blockchain ${mockBlockchain.name} deleted successfully`,
        data: expect.objectContaining({
          id: mockBlockchain.id,
          blockchainId: mockBlockchain.blockchainId,
          name: mockBlockchain.name,
          deletedAt: expect.any(Date),
        }),
      });
    });
  });
});
