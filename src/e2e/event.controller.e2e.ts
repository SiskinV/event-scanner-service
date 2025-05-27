import { IntegrationTestSetup } from './setup/test-setup';

describe('EventsController Integration Tests', () => {
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

  describe('GET /api/events/debug/integrators', () => {
    it('should return empty array when no events exist', async () => {
      const response = await testSetup.getIntegrators();

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response, 'Integrators retrieved successfully');

      expect(data.integrators).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return unique integrators when events exist', async () => {
      const integrator1 = '0xe165726003c42edde42615ce591e25665a6a40a4';
      const integrator2 = '0xf165726003c42edde42615ce591e25665a6a40b5';

      // Create events for different integrators
      await testSetup.createTestEvent({ integrator: integrator1 });
      await testSetup.createTestEvent({ integrator: integrator1 }); // Duplicate
      await testSetup.createTestEvent({ integrator: integrator2 });

      const response = await testSetup.getIntegrators();

      expect(response.status).toBe(200);
      const data = testSetup.expectSuccess(response, 'Integrators retrieved successfully');

      expect(data.integrators).toHaveLength(2);
      expect(data.integrators).toContain(integrator1);
      expect(data.integrators).toContain(integrator2);
      expect(data.total).toBe(2);
    });
  });

  describe('GET /api/events/:integrator', () => {
    const validIntegrator = '0xe165726003c42edde42615ce591e25665a6a40a4';
    const invalidIntegrator = 'invalid-address';

    describe('Input Validation', () => {
      it('should return 400 for invalid integrator address', async () => {
        const response = await testSetup.getEvents(invalidIntegrator);

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Invalid integrator address format');
      });

      it('should return 400 for invalid page parameter', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { page: '-1' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Page must be a positive integer');
      });

      it('should return 400 for invalid limit parameter', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { limit: '0' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Limit must be between 1 and 1000');
      });

      it('should return 400 for limit exceeding maximum', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { limit: '1001' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Limit must be between 1 and 1000');
      });

      it('should return 400 for invalid chainId parameter', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { chainId: 'invalid' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'ChainId must be a valid number');
      });

      it('should return 400 for invalid token address', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { token: 'invalid-token' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'Invalid token address format');
      });

      it('should return 400 for negative fromBlock', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { fromBlock: '-1' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'FromBlock must be a non-negative integer');
      });

      it('should return 400 for negative toBlock', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { toBlock: '-1' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'ToBlock must be a non-negative integer');
      });

      it('should return 400 for invalid sortBy parameter', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { sortBy: 'invalidField' });

        expect(response.status).toBe(400);
        testSetup.expectError(
          response,
          'SortBy must be one of: blockNumber, blockTimestamp, createdAt'
        );
      });

      it('should return 400 for invalid sortOrder parameter', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, { sortOrder: 'invalid' });

        expect(response.status).toBe(400);
        testSetup.expectError(response, 'SortOrder must be either asc or desc');
      });
    });

    describe('Event Retrieval', () => {
      it('should return 404 when no events found for integrator', async () => {
        const response = await testSetup.getEvents(validIntegrator);

        expect(response.status).toBe(404);
        testSetup.expectError(response);
      });

      it('should return events for valid integrator', async () => {
        const event = await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator);

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response, 'Events retrieved successfully');

        const { events, pagination } = testSetup.expectPaginatedResponse(data, 1);

        expect(events).toHaveLength(1);
        testSetup.expectValidEvent(events[0]);
        expect(events[0].integrator).toBe(validIntegrator);
      });
    });

    describe('Pagination', () => {
      beforeEach(async () => {
        // Create 15 events for testing pagination
        await testSetup.createMultipleEvents(validIntegrator, 15);
      });

      it('should return default pagination (page 1, limit 50)', async () => {
        const response = await testSetup.getEvents(validIntegrator);

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events, pagination } = testSetup.expectPaginatedResponse(data, 15);

        expect(events).toHaveLength(15);
        expect(pagination.page).toBe(1);
        expect(pagination.limit).toBe(50);
        expect(pagination.totalPages).toBe(1);
        expect(pagination.hasNext).toBe(false);
        expect(pagination.hasPrev).toBe(false);
      });

      it('should handle custom page size', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          page: '1',
          limit: '5',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events, pagination } = testSetup.expectPaginatedResponse(data, 15);

        expect(events).toHaveLength(5);
        expect(pagination.page).toBe(1);
        expect(pagination.limit).toBe(5);
        expect(pagination.totalPages).toBe(3);
        expect(pagination.hasNext).toBe(true);
        expect(pagination.hasPrev).toBe(false);
      });

      it('should handle second page correctly', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          page: '2',
          limit: '5',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events, pagination } = testSetup.expectPaginatedResponse(data, 15);

        expect(events).toHaveLength(5);
        expect(pagination.page).toBe(2);
        expect(pagination.hasNext).toBe(true);
        expect(pagination.hasPrev).toBe(true);
      });

      it('should handle last page correctly', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          page: '3',
          limit: '5',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events, pagination } = testSetup.expectPaginatedResponse(data, 15);

        expect(events).toHaveLength(5);
        expect(pagination.page).toBe(3);
        expect(pagination.hasNext).toBe(false);
        expect(pagination.hasPrev).toBe(true);
      });
    });

    // @ToDo vs maybe not needed
    describe('Filtering', () => {
      beforeEach(async () => {
        // Create events with different properties for filtering
        await testSetup.createTestEvent({
          integrator: validIntegrator,
          chainId: 1,
          token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
          blockNumber: 1000,
        });

        await testSetup.createTestEvent({
          integrator: validIntegrator,
          chainId: 137,
          token: '0xb0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b1',
          blockNumber: 2000,
        });

        await testSetup.createTestEvent({
          integrator: validIntegrator,
          chainId: 137,
          token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
          blockNumber: 3000,
        });
      });

      it('should filter by chainId', async () => {
        const response = await testSetup.getEvents(validIntegrator, { chainId: '1' });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 1);

        expect(events).toHaveLength(1);
        expect(events[0].chainId).toBe(1);
      });

      it('should filter by token address', async () => {
        const tokenAddress = '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0';
        const response = await testSetup.getEvents(validIntegrator, { token: tokenAddress });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 2);

        expect(events).toHaveLength(2);
        events.forEach((event: any) => {
          expect(event.token.toLowerCase()).toBe(tokenAddress.toLowerCase());
        });
      });

      it('should filter by block range', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          fromBlock: '1500',
          toBlock: '2500',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 1);

        expect(events).toHaveLength(1);
        expect(events[0].blockNumber).toBe(2000);
      });

      it('should combine multiple filters', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          chainId: '137',
          token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 1);

        expect(events).toHaveLength(1);
        expect(events[0].chainId).toBe(137);
        expect(events[0].token.toLowerCase()).toBe('0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0');
        expect(events[0].blockNumber).toBe(3000);
      });
    });

    describe('Sorting', () => {
      beforeEach(async () => {
        // Create events with different timestamps and block numbers
        const baseTime = new Date('2024-01-01T00:00:00Z');

        await testSetup.createTestEvent({
          integrator: validIntegrator,
          blockNumber: 3000,
          blockTimestamp: new Date(baseTime.getTime() + 3000),
        });

        await testSetup.createTestEvent({
          integrator: validIntegrator,
          blockNumber: 1000,
          blockTimestamp: new Date(baseTime.getTime() + 1000),
        });

        await testSetup.createTestEvent({
          integrator: validIntegrator,
          blockNumber: 2000,
          blockTimestamp: new Date(baseTime.getTime() + 2000),
        });
      });

      it('should sort by blockNumber descending by default', async () => {
        const response = await testSetup.getEvents(validIntegrator);

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 3);

        expect(events[0].blockNumber).toBe(3000);
        expect(events[1].blockNumber).toBe(2000);
        expect(events[2].blockNumber).toBe(1000);
      });

      it('should sort by blockNumber ascending', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          sortBy: 'blockNumber',
          sortOrder: 'asc',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 3);

        expect(events[0].blockNumber).toBe(1000);
        expect(events[1].blockNumber).toBe(2000);
        expect(events[2].blockNumber).toBe(3000);
      });

      it('should sort by blockTimestamp descending', async () => {
        const response = await testSetup.getEvents(validIntegrator, {
          sortBy: 'blockTimestamp',
          sortOrder: 'desc',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events } = testSetup.expectPaginatedResponse(data, 3);

        // Most recent timestamp first
        expect(new Date(events[0].blockTimestamp).getTime()).toBeGreaterThan(
          new Date(events[1].blockTimestamp).getTime()
        );
        expect(new Date(events[1].blockTimestamp).getTime()).toBeGreaterThan(
          new Date(events[2].blockTimestamp).getTime()
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large page numbers gracefully', async () => {
        await testSetup.createTestEvent({ integrator: validIntegrator });

        const response = await testSetup.getEvents(validIntegrator, {
          page: '999999',
          limit: '10',
        });

        expect(response.status).toBe(200);
        const data = testSetup.expectSuccess(response);
        const { events, pagination } = testSetup.expectPaginatedResponse(data, 1);

        expect(events).toHaveLength(0);
        expect(pagination.page).toBe(999999);
        expect(pagination.hasNext).toBe(false);
        expect(pagination.hasPrev).toBe(true);
      });

      it('should handle empty result sets with proper pagination', async () => {
        await testSetup.createTestEvent({
          integrator: validIntegrator,
          chainId: 1,
        });

        const response = await testSetup.getEvents(validIntegrator, { chainId: '999' });

        expect(response.status).toBe(404);
        testSetup.expectError(response);
      });
    });
  });
});
