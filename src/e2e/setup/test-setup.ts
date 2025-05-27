import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { FeeCollectionEventModel } from '../../models/fee-collection-event.entity';
import { BlockchainModel } from '../../models/blockchain.entity';
import { BlockchainService } from '../../services/blockchain.service';

// Import your existing app setup but modify for testing
import cors from 'cors';
import routes from '../../routes';
import {
  globalErrorHandler,
  notFoundHandler,
} from '../../common/middleware/error-handler.middleware';

export class IntegrationTestSetup {
  public app: express.Application;
  private mongoServer?: MongoMemoryServer;

  constructor() {
    this.app = this.createTestApp();
  }

  private createTestApp(): express.Application {
    const app = express();

    // Same middleware as your main app
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Same routes as your main app
    app.use('/api', routes);

    // Same error handling as your main app
    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    return app;
  }

  async setupDatabase(): Promise<void> {
    // Start in-memory MongoDB
    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri();

    // Connect mongoose to test database
    await mongoose.connect(mongoUri);

    console.log(`Test database connected: ${mongoUri}`);
  }

  async teardownDatabase(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (this.mongoServer) {
      await this.mongoServer.stop();
    }

    console.log('Test database disconnected');
  }

  async clearDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const result = await collections[key].deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${key}`);
    }

    // Clear the blockchain service cache too!
    BlockchainService.clearCache();
    console.log('Cleared BlockchainService cache');
  }

  // Helper methods for making requests
  get(path: string) {
    return request(this.app).get(path);
  }

  post(path: string, data: any = {}) {
    return request(this.app).post(path).send(data);
  }

  put(path: string, data: any = {}) {
    return request(this.app).put(path).send(data);
  }

  patch(path: string, data: any = {}) {
    return request(this.app).patch(path).send(data);
  }

  delete(path: string) {
    return request(this.app).delete(path);
  }

  // Events-specific helpers
  async getEvents(integrator: string, queryParams: Record<string, any> = {}) {
    const queryString = new URLSearchParams(queryParams).toString();
    const path = `/api/events/${integrator}${queryString ? `?${queryString}` : ''}`;
    return this.get(path);
  }

  async getIntegrators() {
    return this.get('/api/events/debug/integrators');
  }

  // Blockchain-specific helpers
  async getBlockchains() {
    return this.get('/api/blockchains/all');
  }

  async getBlockchainById(id: string) {
    return this.get(`/api/blockchains/${id}`);
  }

  async createBlockchain(data: any) {
    return this.post('/api/blockchains', data);
  }

  async toggleBlockchain(id: string, isActive: boolean) {
    return this.patch(`/api/blockchains/${id}/toggle`, { isActive });
  }

  async toggleScanning(id: string, scanEnabled: boolean) {
    return this.patch(`/api/blockchains/${id}/scanning`, { scanEnabled });
  }

  async deleteBlockchain(id: string) {
    return this.delete(`/api/blockchains/${id}`);
  }

  // Test data creation helpers
  async createTestEvent(overrides: any = {}) {
    const defaultEvent = {
      integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
      token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
      integratorFee: '1000000000000000000',
      lifiFee: '500000000000000000',
      integratorFeeHex: '0xde0b6b3a7640000',
      lifiFeeHex: '0x6f05b59d3b20000',
      blockNumber: 45123456,
      transactionHash: this.generateRandomTxHash(),
      logIndex: 0,
      chainId: 137,
      blockTimestamp: new Date('2024-01-15T10:30:00.000Z'),
      ...overrides,
    };

    return await FeeCollectionEventModel.create(defaultEvent);
  }

  async createMultipleEvents(integrator: string, count: number) {
    const events = [];

    for (let i = 0; i < count; i++) {
      const event = await this.createTestEvent({
        integrator,
        blockNumber: 45123456 + i,
        transactionHash: this.generateRandomTxHash(),
        logIndex: i,
        blockTimestamp: new Date(Date.now() + i * 1000),
      });
      events.push(event);
    }

    return events;
  }

  // Blockchain test data creation helpers
  async createTestBlockchain(overrides: any = {}) {
    const defaultBlockchain = {
      blockchainId: `test-chain-${Date.now()}`,
      name: 'Test Blockchain',
      chainId: Math.floor(Math.random() * 100000),
      rpcUrl: 'https://test-rpc.com',
      blockExplorer: 'https://test-explorer.com',
      nativeCurrency: 'TEST',
      symbol: 'TEST',
      decimals: 18,
      isActive: true,
      scanEnabled: false,
      ...overrides,
    };

    return await BlockchainModel.create(defaultBlockchain);
  }

  async createMultipleBlockchains(count: number) {
    const blockchains = [];

    for (let i = 0; i < count; i++) {
      const blockchain = await this.createTestBlockchain({
        blockchainId: `test-chain-${i}`,
        name: `Test Blockchain ${i}`,
        chainId: 1000 + i,
      });
      blockchains.push(blockchain);
    }

    return blockchains;
  }

  private generateRandomTxHash(): string {
    return (
      '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    );
  }

  // Assertion helpers
  expectSuccess(response: request.Response, expectedMessage?: string) {
    expect(response.body).toHaveProperty('success', true);
    if (expectedMessage) {
      expect(response.body).toHaveProperty('message', expectedMessage);
    }
    expect(response.body).toHaveProperty('data');
    return response.body.data;
  }

  expectError(response: request.Response, expectedMessage?: string) {
    expect(response.body).toHaveProperty('success', false);
    if (expectedMessage) {
      expect(response.body).toHaveProperty('message', expectedMessage);
    }
    return response.body;
  }

  expectPaginatedResponse(data: any, expectedTotal?: number) {
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.events)).toBe(true);

    const pagination = data.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('hasNext');
    expect(pagination).toHaveProperty('hasPrev');

    if (expectedTotal !== undefined) {
      expect(pagination.total).toBe(expectedTotal);
    }

    return { events: data.events, pagination };
  }

  expectValidEvent(event: any) {
    // Required fields
    expect(event).toHaveProperty('integrator');
    expect(event).toHaveProperty('token');
    expect(event).toHaveProperty('integratorFee');
    expect(event).toHaveProperty('lifiFee');
    expect(event).toHaveProperty('blockNumber');
    expect(event).toHaveProperty('transactionHash');
    expect(event).toHaveProperty('logIndex');
    expect(event).toHaveProperty('chainId');

    // Address format validation
    expect(event.integrator).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(event.token).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(event.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    return event;
  }

  expectValidBlockchain(blockchain: any) {
    // Required fields for blockchain list response
    expect(blockchain).toHaveProperty('id');
    expect(blockchain).toHaveProperty('blockchainId');
    expect(blockchain).toHaveProperty('name');
    expect(blockchain).toHaveProperty('chainId');
    expect(blockchain).toHaveProperty('rpcUrl');
    expect(blockchain).toHaveProperty('blockExplorer');
    expect(blockchain).toHaveProperty('nativeCurrency');
    expect(blockchain).toHaveProperty('symbol');
    expect(blockchain).toHaveProperty('isActive');
    expect(blockchain).toHaveProperty('scanEnabled');

    // Type validations
    expect(typeof blockchain.chainId).toBe('number');
    expect(typeof blockchain.isActive).toBe('boolean');
    expect(typeof blockchain.scanEnabled).toBe('boolean');

    return blockchain;
  }

  expectValidBlockchainDetail(blockchain: any) {
    // All fields from list response
    this.expectValidBlockchain(blockchain);

    // Additional fields for detail response
    expect(blockchain).toHaveProperty('decimals');
    expect(blockchain).toHaveProperty('createdAt');
    expect(blockchain).toHaveProperty('updatedAt');

    // Type validations for detail fields
    expect(typeof blockchain.decimals).toBe('number');
    expect(blockchain.decimals).toBeGreaterThanOrEqual(0);
    expect(blockchain.decimals).toBeLessThanOrEqual(18);

    return blockchain;
  }
}
