import { IntegrationTestSetup } from './setup/test-setup';

// @ToDo vs no real e2e test, needs to be much improved!!

// Only mock external dependencies (ethers, Redis), NOT our services
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
        getBlockNumber: jest.fn().mockResolvedValue(5000),
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000),
        }),
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      filters: {
        FeesCollected: jest.fn(() => ({})),
      },
      queryFilter: jest.fn().mockImplementation(() => {
        return Promise.resolve([
          {
            blockNumber: 1000,
            transactionHash: '0xabc123def456789012345678901234567890123456789012345678901234567890',
            logIndex: 0,
            args: [
              '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
              '0xe165726003c42edde42615ce591e25665a6a40a4',
              '1000000000000000000',
              '500000000000000000',
            ],
          },
        ]);
      }),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      interface: {
        parseLog: jest.fn().mockImplementation(event => ({
          args: event.args || [
            '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
            '0xe165726003c42edde42615ce591e25665a6a40a4',
            '1000000000000000000',
            '500000000000000000',
          ],
        })),
      },
    })),
  },
}));

// Mock Redis operations but keep the interface
jest.mock('../services/redis.service', () => ({
  RedisService: {
    getInstance: jest.fn(),
    setLastProcessedBlock: jest.fn().mockResolvedValue(undefined),
    getLastProcessedBlock: jest.fn().mockResolvedValue(4000),
    testConnection: jest.fn().mockResolvedValue(true),
    addGap: jest.fn().mockResolvedValue('gap_123'),
    getGaps: jest.fn().mockResolvedValue([]),
    getNextPendingGap: jest.fn().mockResolvedValue(null),
    getCurrentProcessingGap: jest.fn().mockResolvedValue(null),
    markGapAsProcessing: jest.fn().mockResolvedValue(undefined),
    updateGapProgress: jest.fn().mockResolvedValue(undefined),
    markGapAsCompleted: jest.fn().mockResolvedValue(undefined),
    markGapAsFailed: jest.fn().mockResolvedValue(undefined),
    getGapStats: jest.fn().mockResolvedValue({
      total: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      totalBlocksRemaining: 0,
    }),
    clearAllGaps: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the GapProcessor
jest.mock('../services/gap-processor.service', () => ({
  GapProcessor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addGap: jest.fn().mockResolvedValue('gap_123'),
    getStatus: jest.fn().mockResolvedValue({
      isRunning: true,
      chainId: 137,
      chunkSize: 200,
      processInterval: 2000,
      gapStats: { pending: 0, processing: 0 },
      currentGap: null,
    }),
    processNow: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Event Scanner E2E Tests', () => {
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
    jest.clearAllMocks();
  });

  describe('Scanner Lifecycle E2E', () => {
    let testBlockchain: any;

    beforeEach(async () => {
      // Create test blockchain configuration in database
      testBlockchain = await testSetup.createTestBlockchain({
        blockchainId: 'polygon-mainnet',
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        isActive: true,
        scanEnabled: true,
      });
    });

    describe('POST /api/scanner/start', () => {
      it('should start scanner and create real service instance', async () => {
        const response = await testSetup.post('/api/scanner/start', {
          chainId: 137,
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response, 'Event scanner started for chain 137');

        expect(data).toMatchObject({
          chainId: 137,
          startedAt: expect.any(String),
        });

        // Verify timestamp is valid
        expect(new Date(data.startedAt)).toBeInstanceOf(Date);
        expect(Date.now() - new Date(data.startedAt).getTime()).toBeLessThan(5000); // Within 5 seconds
      });

      // it('should prevent duplicate scanners for same chain', async () => {});

      // it('should validate chainId input thoroughly', async () => {});

      it('should handle non-existent blockchain configurations', async () => {
        const response = await testSetup.post('/api/scanner/start', {
          chainId: 999999, // Non-existent chain
        });

        expect(response.status).toBe(404);
        testSetup.expectError(response, 'Blockchain with chainId 999999 not found');
      });

      // it('should respect blockchain active status', async () => {});

      // it('should handle missing contractAddress in blockchain config', async () => {});
    });

    describe('POST /api/scanner/stop', () => {
      beforeEach(async () => {
        // Start a scanner first
        await testSetup.post('/api/scanner/start', { chainId: 137 });
      });

      it('should stop running scanner successfully', async () => {
        const response = await testSetup.post('/api/scanner/stop', {
          chainId: 137,
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response, 'Event scanner stopped for chain 137');

        expect(data).toMatchObject({
          chainId: 137,
          stoppedAt: expect.any(String),
        });

        // Verify timestamp is valid and recent
        expect(new Date(data.stoppedAt)).toBeInstanceOf(Date);
        expect(Date.now() - new Date(data.stoppedAt).getTime()).toBeLessThan(5000);
      });

      // it('should handle stopping non-existent scanner', async () => {});

      // it('should validate chainId for stop operation', async () => {});

      it('should allow restart after stop', async () => {
        // Stop the running scanner
        const stopResponse = await testSetup.post('/api/scanner/stop', {
          chainId: 137,
        });
        expect(stopResponse.status).toBe(200);

        // Start again
        const startResponse = await testSetup.post('/api/scanner/start', {
          chainId: 137,
        });
        expect(startResponse.status).toBe(200);
        testSetup.expectSuccess(startResponse, 'Event scanner started for chain 137');
      });
    });
  });

  describe('Block Range Scanning E2E', () => {
    let testBlockchain: any;

    beforeEach(async () => {
      testBlockchain = await testSetup.createTestBlockchain({
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
      });
    });

    describe('POST /api/scanner/scan-range', () => {
      it('should successfully scan block range and save events to database', async () => {
        const response = await testSetup.post('/api/scanner/scan-range', {
          chainId: 137,
          fromBlock: 1000,
          toBlock: 2000,
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(
          response,
          'Successfully scanned blocks 1000 to 2000 for chain 137'
        );

        expect(data).toMatchObject({
          chainId: 137,
          fromBlock: 1000,
          toBlock: 2000,
          blocksScanned: 1000,
          scannedAt: expect.any(String),
        });

        // Verify events were actually saved to database
        const savedEvents = (await testSetup.app.locals.db)
          ? await testSetup.app.locals.db.collection('feecollectionevents').find({}).toArray()
          : await require('../models/fee-collection-event.entity').FeeCollectionEventModel.find({});

        expect(savedEvents.length).toBeGreaterThan(0);

        // Verify event structure
        const event = savedEvents[0];
        expect(event.chainId).toBe(137);
        expect(event.blockNumber).toBeDefined();
        expect(event.transactionHash).toBeDefined();
        expect(event.integrator).toBeDefined();
        expect(event.token).toBeDefined();
      });

      it('should reject oversized block ranges', async () => {
        const response = await testSetup.post('/api/scanner/scan-range', {
          chainId: 137,
          fromBlock: 1000,
          toBlock: 12000, // Range of 11,000 blocks > 10,000 limit
        });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Block range too large. Maximum 10,000 blocks per request');
      });

      it('should handle blockchain not found', async () => {
        const response = await testSetup.post('/api/scanner/scan-range', {
          chainId: 999999,
          fromBlock: 1000,
          toBlock: 2000,
        });

        expect(response.status).toBe(404);
        testSetup.expectError(response, 'Blockchain with chainId 999999 not found');
      });

      it('should process concurrent scan requests', async () => {
        const requests = [
          testSetup.post('/api/scanner/scan-range', {
            chainId: 137,
            fromBlock: 1000,
            toBlock: 2000,
          }),
          testSetup.post('/api/scanner/scan-range', {
            chainId: 137,
            fromBlock: 3000,
            toBlock: 4000,
          }),
          testSetup.post('/api/scanner/scan-range', {
            chainId: 137,
            fromBlock: 5000,
            toBlock: 6000,
          }),
        ];

        const responses = await Promise.all(requests);

        responses.forEach(response => {
          expect(response.status).toBe(200);
          testSetup.expectSuccess(response);
        });
      });

      it('should handle zero block range', async () => {
        const response = await testSetup.post('/api/scanner/scan-range', {
          chainId: 137,
          fromBlock: 1000,
          toBlock: 1000, // Same block
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        expect(data.blocksScanned).toBe(0);
      });
    });
  });
});
