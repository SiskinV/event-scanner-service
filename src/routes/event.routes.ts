import { Router } from 'express';
import { EventsController } from '../controllers/event.controller';
import { asyncHandler } from '../common/middleware/error-handler.middleware';

const router = Router();
const eventsController = new EventsController();

/**
 * @swagger
 * /api/events/debug/integrators:
 *   get:
 *     summary: Get all unique integrators (debug endpoint)
 *     description: Development endpoint to list all unique integrator addresses in the database
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: List of all integrators in database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Integrators retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     integrators:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "0x1bcc58d165e5374d7b492b21c0a572fd61c0c2a0"
 *                       description: List of integrator addresses
 *                     total:
 *                       type: integer
 *                       description: Total number of unique integrators
 *                       example: 1
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/debug/integrators',
  asyncHandler(eventsController.getAllIntegrators.bind(eventsController))
);

/**
 * @swagger
 * /api/events/{integrator}:
 *   get:
 *     summary: Get all events for a specific integrator
 *     description: Retrieve paginated events for a specific integrator address with optional filtering and sorting
 *     tags: [Events]
 *     parameters:
 *       - name: integrator
 *         in: path
 *         required: true
 *         description: Integrator wallet address
 *         schema:
 *           type: string
 *           example: "0xe165726003c42edde42615ce591e25665a6a40a4"
 *       - name: chainId
 *         in: query
 *         description: Filter by specific blockchain chain ID
 *         schema:
 *           type: integer
 *           example: 137
 *       - name: token
 *         in: query
 *         description: Filter by specific token contract address
 *         schema:
 *           type: string
 *           example: "0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0"
 *       - name: fromBlock
 *         in: query
 *         description: Start from this block number (inclusive)
 *         schema:
 *           type: integer
 *           minimum: 0
 *           example: 45000000
 *       - name: toBlock
 *         in: query
 *         description: End at this block number (inclusive)
 *         schema:
 *           type: integer
 *           minimum: 0
 *           example: 45100000
 *       - name: sortBy
 *         in: query
 *         description: Field to sort results by
 *         schema:
 *           type: string
 *           enum: [blockNumber, blockTimestamp, createdAt]
 *           default: blockNumber
 *           example: "blockNumber"
 *       - name: sortOrder
 *         in: query
 *         description: Sort order for results
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           example: "desc"
 *       - name: page
 *         in: query
 *         description: Page number (default 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of events per page (default 50, max 1000)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           example: 50
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Events retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/GetEventsByIntegratorResponseDto'
 *             example:
 *               success: true
 *               message: "Events retrieved successfully"
 *               data:
 *                 events:
 *                   - integrator: "0xe165726003c42edde42615ce591e25665a6a40a4"
 *                     token: "0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0"
 *                     integratorFee: "1000000000000000000"
 *                     lifiFee: "500000000000000000"
 *                     blockNumber: 45123456
 *                     transactionHash: "0xabc123def456789012345678901234567890abcdef123456789012345678901234"
 *                     logIndex: 2
 *                     chainId: 137
 *                     blockTimestamp: "2024-01-15T10:30:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 50
 *                   total: 1523
 *                   totalPages: 31
 *                   hasNext: true
 *                   hasPrev: false
 *                 filters:
 *                   chainId: 137
 *                   sortBy: "blockNumber"
 *                   sortOrder: "desc"
 *       400:
 *         description: Validation error - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: No events found for the specified integrator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/:integrator',
  asyncHandler(eventsController.getEventsByIntegrator.bind(eventsController))
);

export default router;
