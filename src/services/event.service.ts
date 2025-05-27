import { FeeCollectionEventModel, FeeCollectionEvent } from '../models/fee-collection-event.entity';
import { GetEventsQueryParamsRequestDto } from '../dtos/events';

export interface PaginatedEventsResult {
  // @ToDo vs fix types
  // events: FeeCollectionEvent[];
  events: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface MongoEventFilterDto {
  integrator: string;
  chainId?: number;
  token?: string;
  blockNumber?: {
    $gte?: number;
    $lte?: number;
  };
  blockTimestamp?: {
    $gte?: Date;
    $lte?: Date;
  };
}

interface ParsedQueryParams {
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
  sorting: {
    sortBy: 'blockNumber' | 'blockTimestamp' | 'createdAt';
    sortOrder: 'asc' | 'desc';
    sortCriteria: Record<string, 1 | -1>;
  };
}

interface QueryParams {
  page?: string;
  limit?: string;
  sortBy?: 'blockNumber' | 'blockTimestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class EventsService {
  /**
   * Debug: Get all unique integrators
   */
  static async getAllIntegrators(): Promise<string[]> {
    const integrators = await FeeCollectionEventModel.distinct('integrator');
    return integrators;
  }

  /**
   * Get paginated events for a specific integrator with filters
   */
  static async getEventsByIntegrator(
    integrator: string,
    queryParams: GetEventsQueryParamsRequestDto
  ): Promise<PaginatedEventsResult> {
    const { pagination, sorting } = this.parseQueryParams({
      page: queryParams.page,
      limit: queryParams.limit,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });

    // Build query filter
    const filter = this.buildEventFilter(integrator, queryParams);

    const [events, total] = await Promise.all([
      FeeCollectionEventModel.find(filter)
        .sort(sorting.sortCriteria)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean()
        .exec(),
      FeeCollectionEventModel.countDocuments(filter),
    ]);

    console.log('Debug - Found events count:', events.length);
    console.log('Debug - Total count:', total);

    // Log first event if any
    if (events.length > 0) {
      console.log('Debug - First event integrator:', events[0].integrator);
    }

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      events,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  }

  private static parseQueryParams(
    queryParams: QueryParams,
    defaultLimit: number = 50,
    maxLimit: number = 1000
  ): ParsedQueryParams {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(queryParams.page || '1'));
    const limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(queryParams.limit || defaultLimit.toString()))
    );
    const skip = (page - 1) * limit;

    // Parse sort parameters
    const sortBy = queryParams.sortBy || 'blockNumber';
    const sortOrder = queryParams.sortOrder || 'desc';

    // Build MongoDB sort criteria
    const sortCriteria: Record<string, 1 | -1> = {};
    sortCriteria[sortBy] = sortOrder === 'asc' ? 1 : -1;

    return {
      pagination: {
        page,
        limit,
        skip,
      },
      sorting: {
        sortBy,
        sortOrder,
        sortCriteria,
      },
    };
  }

  private static buildEventFilter(
    integrator: string,
    queryParams: GetEventsQueryParamsRequestDto
  ): MongoEventFilterDto {
    const filter: any = {
      integrator: integrator.toLowerCase(),
    };

    if (queryParams.chainId) {
      filter.chainId = parseInt(queryParams.chainId);
    }

    if (queryParams.token) {
      filter.token = queryParams.token.toLowerCase();
    }

    if (queryParams.fromBlock || queryParams.toBlock) {
      filter.blockNumber = {};
      if (queryParams.fromBlock) filter.blockNumber.$gte = parseInt(queryParams.fromBlock);
      if (queryParams.toBlock) filter.blockNumber.$lte = parseInt(queryParams.toBlock);
    }

    return filter;
  }
}
