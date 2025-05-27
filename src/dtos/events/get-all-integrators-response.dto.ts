import { PaginationDto } from './common.dto';
import { EventResponseDto } from './event.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     GetEventsByIntegratorResponseDto:
 *       type: object
 *       required:
 *         - events
 *         - pagination
 *       properties:
 *         events:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventResponseDto'
 *           description: Array of events for the integrator
 *         pagination:
 *           $ref: '#/components/schemas/PaginationDto'
 */
export interface GetEventsByIntegratorResponseDto {
  events: EventResponseDto[];
  pagination: PaginationDto;
}
