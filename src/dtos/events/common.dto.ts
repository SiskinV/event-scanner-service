/**
 * @swagger
 * components:
 *   schemas:
 *     PaginationDto:
 *       type: object
 *       required:
 *         - page
 *         - limit
 *         - total
 *         - totalPages
 *         - hasNext
 *         - hasPrev
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *           example: 50
 *         total:
 *           type: integer
 *           description: Total number of items
 *           example: 1523
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 31
 *         hasNext:
 *           type: boolean
 *           description: Whether there are more pages
 *           example: true
 *         hasPrev:
 *           type: boolean
 *           description: Whether there are previous pages
 *           example: false
 */
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
