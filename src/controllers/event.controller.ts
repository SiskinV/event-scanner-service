import { Request, Response, NextFunction } from 'express';
import { EventsService } from '../services/event.service';
import { EventsNotFound, ValidationError } from '../common/errors';
import { isValidEthereumAddress } from '../common/utils/evm-utils';
import { GetEventsQueryParamsRequestDto, mapEventResponse } from '../dtos/events';

export class EventsController {
  async getAllIntegrators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const integrators = await EventsService.getAllIntegrators();

      console.log(`Debug - Found ${integrators.length} unique integrators`);

      res.json({
        success: true,
        message: 'Integrators retrieved successfully',
        data: {
          integrators,
          total: integrators.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventsByIntegrator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { integrator } = req.params;
      const queryParams: GetEventsQueryParamsRequestDto = req.query;

      console.log('Query params are', queryParams);

      this.validateIntegrator(integrator);

      this.validateQueryParams(queryParams);

      console.log(`Fetching events for integrator: ${integrator}`);

      const result = await EventsService.getEventsByIntegrator(integrator, queryParams);

      if (result.pagination.total === 0) {
        throw new EventsNotFound(integrator);
      }

      console.log(`Found ${result.pagination.total} events for integrator: ${integrator}`);

      res.json({
        success: true,
        message: 'Events retrieved successfully',
        data: {
          events: result.events.map(event => mapEventResponse(event)),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private validateIntegrator(integrator: string): void {
    if (!integrator) {
      throw new ValidationError('Integrator address is required');
    }

    if (!isValidEthereumAddress(integrator)) {
      throw new ValidationError('Invalid integrator address format');
    }
  }

  private validateQueryParams(queryParams: GetEventsQueryParamsRequestDto): void {
    if (queryParams.page) {
      const page = parseInt(queryParams.page);
      if (isNaN(page) || page < 1) {
        throw new ValidationError('Page must be a positive integer');
      }
    }

    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit);
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        throw new ValidationError('Limit must be between 1 and 1000');
      }
    }

    if (queryParams.chainId) {
      const chainId = parseInt(queryParams.chainId);
      if (isNaN(chainId)) {
        throw new ValidationError('ChainId must be a valid number');
      }
    }

    if (queryParams.token && !isValidEthereumAddress(queryParams.token)) {
      throw new ValidationError('Invalid token address format');
    }

    if (queryParams.fromBlock) {
      const fromBlock = parseInt(queryParams.fromBlock);
      if (isNaN(fromBlock) || fromBlock < 0) {
        throw new ValidationError('FromBlock must be a non-negative integer');
      }
    }

    if (queryParams.toBlock) {
      const toBlock = parseInt(queryParams.toBlock);
      if (isNaN(toBlock) || toBlock < 0) {
        throw new ValidationError('ToBlock must be a non-negative integer');
      }
    }

    if (
      queryParams.sortBy &&
      !['blockNumber', 'blockTimestamp', 'createdAt'].includes(queryParams.sortBy)
    ) {
      throw new ValidationError('SortBy must be one of: blockNumber, blockTimestamp, createdAt');
    }

    if (queryParams.sortOrder && !['asc', 'desc'].includes(queryParams.sortOrder)) {
      throw new ValidationError('SortOrder must be either asc or desc');
    }
  }
}
