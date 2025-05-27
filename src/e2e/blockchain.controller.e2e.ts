import status from 'http-status';
import { IntegrationTestSetup } from './setup/test-setup';
import { ErrorCode } from '../common/errors/error-code';

describe('BlockchainController E2E Tests', () => {
  let testSetup: IntegrationTestSetup;

  beforeAll(async () => {
    testSetup = new IntegrationTestSetup();
    await testSetup.setupDatabase();
  });

  afterAll(async () => {
    await testSetup.teardownDatabase();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();
  });

  describe('GET /api/blockchains/all', () => {
    it('should return empty array when no blockchains exist', async () => {
      const response = await testSetup.get('/api/blockchains/all');

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response, 'All blockchains retrieved successfully');

      expect(data.blockchains).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return all active blockchains', async () => {
      await testSetup.createTestBlockchain({
        name: 'Ethereum',
        isActive: true,
        chainId: 1,
      });
      await testSetup.createTestBlockchain({
        name: 'Polygon',
        isActive: true,
        chainId: 137,
      });
      await testSetup.createTestBlockchain({
        name: 'Inactive Chain',
        isActive: false,
        chainId: 999,
      });

      const response = await testSetup.get('/api/blockchains/all');

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response);

      expect(data.blockchains).toHaveLength(2);
      expect(data.total).toBe(2);

      data.blockchains.forEach((blockchain: any) => {
        expect(blockchain.isActive).toBe(true);
        testSetup.expectValidBlockchain(blockchain);
      });
    });

    it('should return blockchains sorted by name', async () => {
      await testSetup.createTestBlockchain({ name: 'Zebra Chain', chainId: 1 });
      await testSetup.createTestBlockchain({ name: 'Alpha Chain', chainId: 2 });
      await testSetup.createTestBlockchain({ name: 'Beta Chain', chainId: 3 });

      const response = await testSetup.get('/api/blockchains/all');

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response);

      expect(data.blockchains[0].name).toBe('Alpha Chain');
      expect(data.blockchains[1].name).toBe('Beta Chain');
      expect(data.blockchains[2].name).toBe('Zebra Chain');
    });
  });

  describe('GET /api/blockchains/:id', () => {
    it('should return 404 for missing blockchain ID', async () => {
      await testSetup
        .get(`/api/blockchains/`)
        .expect(status.NOT_FOUND)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Route /api/blockchains/ not found`,
              statusCode: status.NOT_FOUND,
            })
          );
        });
    });

    it('should return 404 for non-existent blockchain', async () => {
      const blockchainId = 'non-existent-id';

      await testSetup
        .get(`/api/blockchains/${blockchainId}`)
        .expect(status.NOT_FOUND)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Blockchain with ID ${blockchainId} not found`,
              statusCode: status.NOT_FOUND,
              code: ErrorCode.BLOCKCHAIN_NOT_FOUND,
            })
          );
        });
    });

    it('should return 400 for inactive blockchain', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        name: 'Inactive Chain',
        isActive: false,
        chainId: 1,
      });

      await testSetup
        .get(`/api/blockchains/${blockchain.blockchainId}`)
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Blockchain ${blockchain.blockchainId} is currently disabled`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.BLOCKCHAIN_DISABLED,
            })
          );
        });
    });

    it('should return blockchain details for valid ID', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        name: 'Test Chain',
        chainId: 1,
      });

      const response = await testSetup.get(`/api/blockchains/${blockchain.blockchainId}`);

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response, 'Blockchain retrieved successfully');

      testSetup.expectValidBlockchainDetail(data);
      expect(data.name).toBe('Test Chain');
      expect(data.blockchainId).toBe(blockchain.blockchainId);
    });
  });

  describe('POST /api/blockchains', () => {
    const validBlockchainData = {
      blockchainId: 'test-chain',
      name: 'Test Blockchain',
      chainId: 12345,
      rpcUrl: 'https://test-rpc.com',
      blockExplorer: 'https://test-explorer.com',
      nativeCurrency: 'TEST',
      symbol: 'TEST',
      decimals: 18,
    };

    it('should return 400 for missing required fields', async () => {
      const invalidData = { name: 'Test Chain' }; // Missing required fields

      await testSetup
        .post(`/api/blockchains`)
        .send(invalidData)
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Validation failed`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
              errors: [
                'blockchainId is required',
                'chainId is required',
                'rpcUrl is required',
                'blockExplorer is required',
                'nativeCurrency is required',
                'symbol is required',
                'decimals is required',
              ],
            })
          );
        });
    });

    it('should return 400 for invalid decimals', async () => {
      const invalidData = {
        ...validBlockchainData,
        decimals: 25, // Too high
      };

      await testSetup
        .post(`/api/blockchains`)
        .send(invalidData)
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Validation failed`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
              errors: ['decimals must be at most 18'],
            })
          );
        });
    });

    it('should return 400 for duplicate chainId', async () => {
      // Create first blockchain
      await testSetup.createTestBlockchain({ chainId: 12345 });

      // Try to create another with same chainId
      const duplicateData = {
        ...validBlockchainData,
        blockchainId: 'different-id',
        chainId: 12345,
      };

      await testSetup
        .post(`/api/blockchains`)
        .send(duplicateData)
        .expect(400)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.BLOCKHCHAIN_ALREADY_EXISTS,
              success: false,
              message: 'Blockchain with chainId 12345 already exists',
            })
          );
        });
    });

    it('should create new blockchain with valid data', async () => {
      const response = await testSetup.post('/api/blockchains', validBlockchainData);

      expect(response.status).toBe(201);
      const data = testSetup.expectSuccess(response);

      testSetup.expectValidBlockchainDetail(data);
      expect(data.name).toBe(validBlockchainData.name);
      expect(data.blockchainId).toBe(validBlockchainData.blockchainId.toLowerCase());
      expect(data.symbol).toBe(validBlockchainData.symbol.toUpperCase());
    });
  });

  describe('PATCH /api/blockchains/:id/toggle', () => {
    it('should return 400 for missing isActive field', async () => {
      const blockchain = await testSetup.createTestBlockchain({ chainId: 1 });

      await testSetup
        .patch(`/api/blockchains/${blockchain.blockchainId}/toggle`)
        .send({})
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Validation failed`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
              errors: ['isActive is required'],
            })
          );
        });
    });

    it('should return 400 for invalid isActive type', async () => {
      const blockchain = await testSetup.createTestBlockchain({ chainId: 1 });

      await testSetup
        .patch(`/api/blockchains/${blockchain.blockchainId}/toggle`)
        .send({ isActive: 'true' })
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Validation failed`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
              errors: ['isActive must be of type boolean'],
            })
          );
        });
    });

    it('should toggle blockchain active status', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        name: 'Test Chain',
        isActive: true,
        chainId: 1,
      });

      const response = await testSetup.patch(`/api/blockchains/${blockchain.blockchainId}/toggle`, {
        isActive: false,
      });

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response, 'Blockchain disabled successfully');

      expect(data.isActive).toBe(false);
      expect(data.blockchainId).toBe(blockchain.blockchainId);
    });
  });

  describe('PATCH /api/blockchains/:id/scanning', () => {
    it('should return 400 for invalid scanEnabled type', async () => {
      const blockchain = await testSetup.createTestBlockchain({ chainId: 1 });

      await testSetup
        .patch(`/api/blockchains/${blockchain.blockchainId}/scanning`)
        .send({ scanEnabled: 'true' })
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Validation failed`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
              errors: ['scanEnabled must be of type boolean'],
            })
          );
        });
    });

    it('should return 404 when blockchain is not found', async () => {
      const blockchainId = 'non-existent-blockchain';

      await testSetup
        .patch(`/api/blockchains/${blockchainId}/scanning`)
        .send({ scanEnabled: true })
        .expect(status.NOT_FOUND)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Blockchain with ID ${blockchainId} not found`,
              statusCode: status.NOT_FOUND,
              code: ErrorCode.BLOCKCHAIN_NOT_FOUND,
            })
          );
        });
    });

    it('should return 400 when blockchain is disabled', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        contractAddress: undefined, // No contract address
        isActive: false,
        chainId: 1,
      });

      await testSetup
        .patch(`/api/blockchains/${blockchain.blockchainId}/scanning`)
        .send({ scanEnabled: true })
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Blockchain ${blockchain.blockchainId} is currently disabled`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.BLOCKCHAIN_DISABLED,
            })
          );
        });
    });

    it('should return error when enabling scan without contract address', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        contractAddress: undefined, // No contract address
        isActive: true,
        chainId: 1,
      });

      await testSetup
        .patch(`/api/blockchains/${blockchain.blockchainId}/scanning`)
        .send({ scanEnabled: true })
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Cannot enable scanning: contract address is required for EVM blockchains`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.VALIDATION_ERROR,
            })
          );
        });
    });

    it('should toggle scanning for blockchain with contract address', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        name: 'Test Chain',
        contractAddress: '0x1234567890123456789012345678901234567890',
        isActive: true,
        scanEnabled: false,
        chainId: 1,
      });

      const response = await testSetup.patch(
        `/api/blockchains/${blockchain.blockchainId}/scanning`,
        {
          scanEnabled: true,
        }
      );

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response);

      expect(data.scanEnabled).toBe(true);
      expect(data.blockchainId).toBe(blockchain.blockchainId);
    });
  });

  describe('DELETE /api/blockchains/:id', () => {
    it('should return 404 when blockchain is not found', async () => {
      const blockchainId = 'non-existent-blockchain';

      await testSetup
        .delete(`/api/blockchains/${blockchainId}`)
        .expect(status.NOT_FOUND)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Blockchain with ID ${blockchainId} not found`,
              statusCode: status.NOT_FOUND,
              code: ErrorCode.BLOCKCHAIN_NOT_FOUND,
            })
          );
        });
    });

    it('should return error when deleting blockchain with scanning enabled', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        scanEnabled: true,
        contractAddress: 'testtest',
        chainId: 1,
      });

      await testSetup
        .delete(`/api/blockchains/${blockchain.blockchainId}`)
        .expect(status.BAD_REQUEST)
        .expect(res => {
          expect(res.body).toEqual(
            expect.objectContaining({
              success: false,
              message: `Cannot delete blockchain with scanning enabled. Disable scanning first`,
              statusCode: status.BAD_REQUEST,
              code: ErrorCode.SCAN_ENABLED,
            })
          );
        });
    });

    it('should delete blockchain successfully', async () => {
      const blockchain = await testSetup.createTestBlockchain({
        name: 'Test Chain',
        scanEnabled: false, // Not scanning
        chainId: 1,
      });

      const response = await testSetup.delete(`/api/blockchains/${blockchain.blockchainId}`);

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response);

      expect(data.name).toBe('Test Chain');
      expect(data.blockchainId).toBe(blockchain.blockchainId);
    });
  });
});
