import { EventsService } from './event.service';
import { FeeCollectionEventModel } from '../models/fee-collection-event.entity';
import { GetEventsQueryParamsRequestDto } from '../dtos/events/event.dto';

jest.mock('../models/fee-collection-event.entity');

describe('EventsService', () => {
  // Mock data that matches your actual data structure
  const mockEvents = [
    {
      _id: '507f1f77bcf86cd799439011',
      integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
      token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
      integratorFee: '1000000000000000000',
      lifiFee: '500000000000000000',
      integratorFeeHex: '0xde0b6b3a7640000',
      lifiFeeHex: '0x6f05b59d3b20000',
      blockNumber: 45123456,
      transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
      logIndex: 2,
      chainId: 137,
      blockTimestamp: new Date('2024-01-15T10:30:00.000Z'),
      createdAt: new Date('2024-01-15T10:31:00.000Z'),
      updatedAt: new Date('2024-01-15T10:31:00.000Z'),
    },
    {
      _id: '507f1f77bcf86cd799439012',
      integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
      token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
      integratorFee: '2000000000000000000',
      lifiFee: '750000000000000000',
      blockNumber: 45123457,
      transactionHash: '0xdef456abc789012345678901234567890abcdef123456789012345678901234abc',
      logIndex: 1,
      chainId: 137,
      blockTimestamp: new Date('2024-01-15T10:35:00.000Z'),
      createdAt: new Date('2024-01-15T10:36:00.000Z'),
      updatedAt: new Date('2024-01-15T10:36:00.000Z'),
    },
  ];

  const mockIntegrators = [
    '0xe165726003c42edde42615ce591e25665a6a40a4',
    '0x742d35Cc6634C0532925a3b8D4D1c8e1b89ba1b1',
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
  ];

  let consoleLogSpy: jest.SpyInstance;

  // Helper function to create mock chain
  const createMockChain = (events: any[]) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(events),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('getAllIntegrators', () => {
    beforeEach(() => {
      (FeeCollectionEventModel.distinct as jest.Mock).mockResolvedValue(mockIntegrators);
    });

    it('should return all unique integrators', async () => {
      const result = await EventsService.getAllIntegrators();

      expect(result).toEqual(mockIntegrators);
      expect(FeeCollectionEventModel.distinct).toHaveBeenCalledWith('integrator');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      (FeeCollectionEventModel.distinct as jest.Mock).mockRejectedValue(dbError);

      await expect(EventsService.getAllIntegrators()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getEventsByIntegrator', () => {
    const integrator = '0xe165726003c42edde42615ce591e25665a6a40a4';
    let mockChain: any;

    beforeEach(() => {
      mockChain = createMockChain(mockEvents);
      (FeeCollectionEventModel.find as jest.Mock).mockReturnValue(mockChain);
      (FeeCollectionEventModel.countDocuments as jest.Mock).mockResolvedValue(2);
    });

    describe('basic functionality', () => {
      it('should return paginated events with default parameters', async () => {
        const queryParams: GetEventsQueryParamsRequestDto = {};

        const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

        expect(result).toEqual({
          events: mockEvents,
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });

        expect(FeeCollectionEventModel.find).toHaveBeenCalledWith({
          integrator: integrator.toLowerCase(),
        });
        expect(mockChain.sort).toHaveBeenCalledWith({ blockNumber: -1 });
        expect(mockChain.skip).toHaveBeenCalledWith(0);
        expect(mockChain.limit).toHaveBeenCalledWith(50);
        expect(mockChain.lean).toHaveBeenCalled();
        expect(mockChain.exec).toHaveBeenCalled();
      });

      it('should handle empty results', async () => {
        const queryParams: GetEventsQueryParamsRequestDto = {};

        const emptyMockChain = createMockChain([]);
        (FeeCollectionEventModel.find as jest.Mock).mockReturnValue(emptyMockChain);
        (FeeCollectionEventModel.countDocuments as jest.Mock).mockResolvedValue(0);

        const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

        expect(result).toEqual({
          events: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      });
    });

    describe('pagination', () => {
      beforeEach(() => {
        (FeeCollectionEventModel.countDocuments as jest.Mock).mockResolvedValue(100);
      });

      it.each([
        ['2', '10', 2, 10, 10, 25, 3, true, true],
        ['1', '25', 1, 25, 0, 50, 2, true, false],
        ['3', '20', 3, 20, 40, 60, 3, false, true],
        ['1', '100', 1, 100, 0, 50, 1, false, false],
      ])(
        'should handle pagination correctly for page=%s, limit=%s',
        async (
          page,
          limit,
          expectedPage,
          expectedLimit,
          expectedSkip,
          total,
          expectedTotalPages,
          expectedHasNext,
          expectedHasPrev
        ) => {
          const queryParams: GetEventsQueryParamsRequestDto = { page, limit };
          (FeeCollectionEventModel.countDocuments as jest.Mock).mockResolvedValue(total);

          const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

          expect(result.pagination).toEqual({
            page: expectedPage,
            limit: expectedLimit,
            total,
            totalPages: expectedTotalPages,
            hasNext: expectedHasNext,
            hasPrev: expectedHasPrev,
          });
          expect(mockChain.skip).toHaveBeenCalledWith(expectedSkip);
          expect(mockChain.limit).toHaveBeenCalledWith(expectedLimit);
        }
      );

      it.each([
        ['5000', 1000],
        ['0', 1],
        ['-5', 1],
      ])('should enforce limits: limit=%s should become %s', async (inputLimit, expectedLimit) => {
        const queryParams: GetEventsQueryParamsRequestDto = { limit: inputLimit };

        const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

        expect(result.pagination.limit).toBe(expectedLimit);
        expect(mockChain.limit).toHaveBeenCalledWith(expectedLimit);
      });

      it.each([
        ['0', 1],
        ['-1', 1],
      ])(
        'should enforce minimum page: page=%s should become %s',
        async (inputPage, expectedPage) => {
          const queryParams: GetEventsQueryParamsRequestDto = { page: inputPage };

          const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

          expect(result.pagination.page).toBe(expectedPage);
          expect(mockChain.skip).toHaveBeenCalledWith(0);
        }
      );
    });

    describe('filtering', () => {
      beforeEach(() => {
        mockChain = createMockChain(mockEvents);
        (FeeCollectionEventModel.find as jest.Mock).mockReturnValue(mockChain);
        (FeeCollectionEventModel.countDocuments as jest.Mock).mockResolvedValue(2);
      });

      it.each([
        [
          'chainId filter',
          { chainId: '137' },
          { integrator: integrator.toLowerCase(), chainId: 137 },
        ],
        [
          'token filter with case normalization',
          { token: '0xA0B86A33E6770C4C8ABF8A8C0B55E0D1E0F0C0B0' },
          {
            integrator: integrator.toLowerCase(),
            token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
          },
        ],
        [
          'fromBlock only',
          { fromBlock: '45000000' },
          { integrator: integrator.toLowerCase(), blockNumber: { $gte: 45000000 } },
        ],
        [
          'toBlock only',
          { toBlock: '45200000' },
          { integrator: integrator.toLowerCase(), blockNumber: { $lte: 45200000 } },
        ],
        [
          'block range filter',
          { fromBlock: '45000000', toBlock: '45200000' },
          { integrator: integrator.toLowerCase(), blockNumber: { $gte: 45000000, $lte: 45200000 } },
        ],
        [
          'multiple filters combined',
          {
            chainId: '137',
            token: '0xA0B86A33E6770C4C8ABF8A8C0B55E0D1E0F0C0B0',
            fromBlock: '45000000',
          },
          {
            integrator: integrator.toLowerCase(),
            chainId: 137,
            token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
            blockNumber: { $gte: 45000000 },
          },
        ],
      ])('should apply %s', async (description, queryParams, expectedFilter) => {
        await EventsService.getEventsByIntegrator(integrator, queryParams);

        expect(FeeCollectionEventModel.find).toHaveBeenCalledWith(expectedFilter);
      });
    });

    describe('sorting', () => {
      beforeEach(() => {
        mockChain = createMockChain(mockEvents);
        (FeeCollectionEventModel.find as jest.Mock).mockReturnValue(mockChain);
      });

      it.each([
        ['blockNumber', 'desc', { blockNumber: -1 }],
        ['blockNumber', 'asc', { blockNumber: 1 }],
        ['blockTimestamp', 'asc', { blockTimestamp: 1 }],
        ['blockTimestamp', 'desc', { blockTimestamp: -1 }],
        ['createdAt', 'asc', { createdAt: 1 }],
        ['createdAt', 'desc', { createdAt: -1 }],
      ])(
        'should apply sorting: sortBy=%s, sortOrder=%s',
        async (sortBy, sortOrder, expectedSortCriteria) => {
          const queryParams: GetEventsQueryParamsRequestDto = {
            sortBy: sortBy as any,
            sortOrder: sortOrder as any,
          };

          await EventsService.getEventsByIntegrator(integrator, queryParams);

          expect(mockChain.sort).toHaveBeenCalledWith(expectedSortCriteria);
        }
      );
    });

    describe('error handling', () => {
      it('should handle database errors', async () => {
        const queryParams: GetEventsQueryParamsRequestDto = {};
        const dbError = new Error('Database connection failed');
        (FeeCollectionEventModel.find as jest.Mock).mockImplementation(() => {
          throw dbError;
        });

        await expect(EventsService.getEventsByIntegrator(integrator, queryParams)).rejects.toThrow(
          'Database connection failed'
        );
      });
    });
  });
});
