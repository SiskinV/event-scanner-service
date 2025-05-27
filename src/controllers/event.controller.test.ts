import { Request, Response, NextFunction } from 'express';
import { EventsController } from './event.controller';
import { EventsService } from '../services/event.service';
import { EventsNotFound, ValidationError } from '../common/errors';
import { isValidEthereumAddress } from '../common/utils/evm-utils';
import { mapEventResponse } from '../dtos/events/event-response.mapper';
import { GetEventsQueryParamsRequestDto } from '../dtos/events/event.dto';

// Mock dependencies
jest.mock('../services/event.service');
jest.mock('../common/utils/evm-utils');
jest.mock('../dtos/events/event-response.mapper');

describe('EventsController', () => {
  let controller: EventsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleLogSpy: jest.SpyInstance;

  const mockServiceResult = {
    events: [
      {
        _id: '507f1f77bcf86cd799439011',
        integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
        token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        blockNumber: 45123456,
        transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        logIndex: 2,
        chainId: 137,
        blockTimestamp: new Date('2024-01-15T10:30:00.000Z'),
      },
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockMappedEvent = {
    integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
    token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
    integratorFee: '1000000000000000000',
    lifiFee: '500000000000000000',
    blockNumber: 45123456,
    transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
    logIndex: 2,
    chainId: 137,
    blockTimestamp: new Date('2024-01-15T10:30:00.000Z'),
  };

  const mockIntegrators = [
    '0xe165726003c42edde42615ce591e25665a6a40a4',
    '0x742d35Cc6634C0532925a3b8D4D1c8e1b89ba1b1',
  ];

  beforeEach(() => {
    controller = new EventsController();
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Suppress console logs in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('getAllIntegrators', () => {
    beforeEach(() => {
      (EventsService.getAllIntegrators as jest.Mock).mockResolvedValue(mockIntegrators);
    });

    it('should return all integrators successfully', async () => {
      mockRequest.query = {};

      await controller.getAllIntegrators(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(EventsService.getAllIntegrators).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Integrators retrieved successfully',
        data: {
          integrators: mockIntegrators,
          total: mockIntegrators.length,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty integrators list', async () => {
      (EventsService.getAllIntegrators as jest.Mock).mockResolvedValue([]);

      await controller.getAllIntegrators(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Integrators retrieved successfully',
        data: {
          integrators: [],
          total: 0,
        },
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      (EventsService.getAllIntegrators as jest.Mock).mockRejectedValue(error);

      await controller.getAllIntegrators(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getEventsByIntegrator', () => {
    const validIntegrator = '0xe165726003c42edde42615ce591e25665a6a40a4';

    beforeEach(() => {
      // Setup for getEventsByIntegrator tests
      (isValidEthereumAddress as jest.Mock).mockReturnValue(true);
      (EventsService.getEventsByIntegrator as jest.Mock).mockResolvedValue(mockServiceResult);
      (mapEventResponse as jest.Mock).mockReturnValue(mockMappedEvent);
    });

    describe('successful requests', () => {
      it('should return events for valid integrator with default parameters', async () => {
        mockRequest.params = { integrator: validIntegrator };
        mockRequest.query = {};

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(isValidEthereumAddress).toHaveBeenCalledWith(validIntegrator);
        expect(EventsService.getEventsByIntegrator).toHaveBeenCalledWith(
          validIntegrator,
          mockRequest.query
        );
        expect(mapEventResponse).toHaveBeenCalledWith(mockServiceResult.events[0]);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Events retrieved successfully',
          data: {
            events: [mockMappedEvent],
            pagination: mockServiceResult.pagination,
          },
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return events with query parameters', async () => {
        const queryParams: GetEventsQueryParamsRequestDto = {
          page: '2',
          limit: '25',
          chainId: '137',
          sortBy: 'blockTimestamp',
          sortOrder: 'asc',
        };
        mockRequest.params = { integrator: validIntegrator };
        mockRequest.query = queryParams as any;

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(EventsService.getEventsByIntegrator).toHaveBeenCalledWith(
          validIntegrator,
          queryParams
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Events retrieved successfully',
          })
        );
      });
    });

    describe('integrator validation', () => {
      it.each([
        [undefined, 'Integrator address is required'],
        ['', 'Integrator address is required'],
        [null, 'Integrator address is required'],
      ])(
        'should throw ValidationError when integrator is %s',
        async (integrator, expectedMessage) => {
          mockRequest.params = { integrator } as any;
          mockRequest.query = {};

          await controller.getEventsByIntegrator(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
          );

          expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
              message: expectedMessage,
            })
          );
          expect(mockResponse.json).not.toHaveBeenCalled();
        }
      );

      it('should throw ValidationError for invalid integrator address format', async () => {
        const invalidIntegrator = 'invalid-address';
        mockRequest.params = { integrator: invalidIntegrator };
        mockRequest.query = {};
        (isValidEthereumAddress as jest.Mock).mockReturnValue(false);

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(isValidEthereumAddress).toHaveBeenCalledWith(invalidIntegrator);
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid integrator address format',
          })
        );
      });
    });

    describe('query parameter validation', () => {
      beforeEach(() => {
        mockRequest.params = { integrator: validIntegrator };
      });

      it.each([
        // [queryParams, expectedErrorMessage]
        [{ page: '-1' }, 'Page must be a positive integer'],
        [{ page: '0' }, 'Page must be a positive integer'],
        [{ page: 'abc' }, 'Page must be a positive integer'],
        [{ limit: '0' }, 'Limit must be between 1 and 1000'],
        [{ limit: '1001' }, 'Limit must be between 1 and 1000'],
        [{ limit: 'xyz' }, 'Limit must be between 1 and 1000'],
        [{ chainId: 'not-a-number' }, 'ChainId must be a valid number'],
        [{ fromBlock: '-1' }, 'FromBlock must be a non-negative integer'],
        [{ fromBlock: 'abc' }, 'FromBlock must be a non-negative integer'],
        [{ toBlock: '-1' }, 'ToBlock must be a non-negative integer'],
        [{ toBlock: 'abc' }, 'ToBlock must be a non-negative integer'],
        [
          { sortBy: 'invalidField' },
          'SortBy must be one of: blockNumber, blockTimestamp, createdAt',
        ],
        [{ sortOrder: 'invalid' }, 'SortOrder must be either asc or desc'],
      ])(
        'should validate query parameters: %o should throw "%s"',
        async (queryParams, expectedMessage) => {
          mockRequest.query = queryParams;

          await controller.getEventsByIntegrator(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
          );

          expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
              message: expectedMessage,
            })
          );
          expect(mockResponse.json).not.toHaveBeenCalled();
        }
      );

      it('should validate token address format', async () => {
        mockRequest.query = { token: 'invalid-token-address' };
        (isValidEthereumAddress as jest.Mock)
          .mockReturnValueOnce(true) // For integrator
          .mockReturnValueOnce(false); // For token

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(isValidEthereumAddress).toHaveBeenCalledWith('invalid-token-address');
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid token address format',
          })
        );
      });

      it.each([
        // [validQueryParams]
        [{ page: '1', limit: '50' }],
        [{ chainId: '137' }],
        [{ token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0' }],
        [{ fromBlock: '45000000', toBlock: '45100000' }],
        [{ sortBy: 'blockNumber', sortOrder: 'desc' }],
        [{ sortBy: 'blockTimestamp', sortOrder: 'asc' }],
        [{ sortBy: 'createdAt', sortOrder: 'desc' }],
      ])('should pass validation for valid query parameters: %o', async queryParams => {
        mockRequest.query = queryParams;
        (isValidEthereumAddress as jest.Mock).mockReturnValue(true);

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockRequest.params = { integrator: validIntegrator };
        mockRequest.query = {};
      });

      it('should throw EventsNotFound when no events found for integrator', async () => {
        const emptyResult = {
          events: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
        (EventsService.getEventsByIntegrator as jest.Mock).mockResolvedValue(emptyResult);

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(EventsNotFound));
        expect(mockResponse.json).not.toHaveBeenCalled();
      });

      it('should handle service errors', async () => {
        const serviceError = new Error('Database connection failed');
        (EventsService.getEventsByIntegrator as jest.Mock).mockRejectedValue(serviceError);

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(serviceError);
        expect(mockResponse.json).not.toHaveBeenCalled();
      });

      it('should handle formatter errors', async () => {
        const formatterError = new Error('Formatter failed');
        (mapEventResponse as jest.Mock).mockImplementation(() => {
          throw formatterError;
        });

        await controller.getEventsByIntegrator(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(formatterError);
        expect(mockResponse.json).not.toHaveBeenCalled();
      });
    });
  });
});
