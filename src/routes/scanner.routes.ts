import { Router } from 'express';
import { EventScannerController } from '../controllers/event-scanner.controller';
import { asyncHandler, validateRequest } from '../common/middleware/error-handler.middleware';

const router = Router();
const scannerController = new EventScannerController();

// Validation rules
const chainIdValidation = [{ field: 'chainId', type: 'number', required: false, min: 1 }];

const blockRangeValidation = [
  { field: 'chainId', type: 'number', required: false, min: 1 },
  { field: 'fromBlock', type: 'number', required: true, min: 0 },
  { field: 'toBlock', type: 'number', required: true, min: 0 },
];

/**
 * @swagger
 * /api/scanner/start:
 *   post:
 *     summary: Start event scanner for a blockchain
 *     description: Starts real-time event scanning for the specified blockchain chain ID. Creates a new scanner instance that listens for FeesCollected events and processes them in real-time with gap detection and processing.
 *     tags: [Scanner]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartScannerRequestDto'
 *           example:
 *             chainId: 137
 *     responses:
 *       200:
 *         description: Event scanner started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StartScannerResponseDto'
 *             example:
 *               success: true
 *               message: "Event scanner started for chain 137"
 *               data:
 *                 chainId: 137
 *                 startedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Validation error - invalid chain ID or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "ChainId must be a positive number"
 *               statusCode: 400
 *               code: 1001
 *       404:
 *         description: Blockchain configuration not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain with chainId 999 not found"
 *               statusCode: 404
 *               code: 2001
 *       500:
 *         description: Internal server error or blockchain connection failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Failed to connect to blockchain: Connection timeout"
 *               statusCode: 500
 *               code: 5001
 */
router.post(
  '/start',
  validateRequest(chainIdValidation),
  asyncHandler(scannerController.startScanner.bind(scannerController))
);

/**
 * @swagger
 * /api/scanner/stop:
 *   post:
 *     summary: Stop event scanner for a blockchain
 *     description: Stops the running event scanner for the specified blockchain chain ID. Gracefully shuts down the scanner, saves current state to Redis, and cleans up all resources.
 *     tags: [Scanner]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StopScannerRequestDto'
 *           example:
 *             chainId: 137
 *     responses:
 *       200:
 *         description: Event scanner stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StopScannerResponseDto'
 *             example:
 *               success: true
 *               message: "Event scanner stopped for chain 137"
 *               data:
 *                 chainId: 137
 *                 stoppedAt: "2024-01-15T11:30:00.000Z"
 *       400:
 *         description: Validation error - invalid chain ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "ChainId must be a positive number"
 *               statusCode: 400
 *               code: 1001
 *       404:
 *         description: Scanner not found or not running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Scanner for chain 137 not found or not running"
 *               statusCode: 404
 *               code: 3002
 *       500:
 *         description: Internal server error during scanner shutdown
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Failed to stop scanner: Resource cleanup error"
 *               statusCode: 500
 *               code: 5002
 */
router.post(
  '/stop',
  validateRequest(chainIdValidation),
  asyncHandler(scannerController.stopScanner.bind(scannerController))
);

/**
 * @swagger
 * /api/scanner/scan-range:
 *   post:
 *     summary: Manually scan a specific block range
 *     description: Performs a one-time scan of the specified block range for FeesCollected events.
 *     tags: [Scanner]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScanBlockRangeRequestDto'
 *           example:
 *             chainId: 137
 *             fromBlock: 45000000
 *             toBlock: 45001000
 *     responses:
 *       200:
 *         description: Block range scanned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ScanBlockRangeResponseDto'
 *             example:
 *               success: true
 *               message: "Successfully scanned blocks 45000000 to 45001000 for chain 137"
 *               data:
 *                 chainId: 137
 *                 fromBlock: 45000000
 *                 toBlock: 45001000
 *                 blocksScanned: 1000
 *                 scannedAt: "2024-01-15T10:35:00.000Z"
 *       400:
 *         description: Validation error - invalid parameters or block range too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: Invalid parameters
 *                 value:
 *                   success: false
 *                   message: "FromBlock must be a non-negative integer"
 *                   statusCode: 400
 *                   code: 1002
 *               range_too_large:
 *                 summary: Block range exceeds limit
 *                 value:
 *                   success: false
 *                   message: "Block range too large. Maximum 10,000 blocks per request"
 *                   statusCode: 400
 *                   code: 1003
 *       404:
 *         description: Blockchain configuration not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain with chainId 999 not found"
 *               statusCode: 404
 *               code: 2001
 *       500:
 *         description: Internal server error or blockchain scanning failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               timeout_error:
 *                 summary: Blockchain request timeout
 *                 value:
 *                   success: false
 *                   message: "Blockchain request timeout"
 *                   statusCode: 500
 *                   code: 5004
 *               rate_limit_error:
 *                 summary: Rate limit exceeded
 *                 value:
 *                   success: false
 *                   message: "Rate limit exceeded"
 *                   statusCode: 500
 *                   code: 5005
 *               scanning_error:
 *                 summary: Generic scanning error
 *                 value:
 *                   success: false
 *                   message: "Block scanning failed"
 *                   statusCode: 500
 *                   code: 5006
 */
router.post(
  '/scan-range',
  validateRequest(blockRangeValidation),
  asyncHandler(scannerController.scanBlockRange.bind(scannerController))
);

// Graceful shutdown handlers
let shutdownHandlerAdded = false;

if (!shutdownHandlerAdded) {
  const gracefulShutdown = async (signal: string) => {
    // console.log(`\n🔄 Received ${signal}, initiating graceful shutdown...`);

    try {
      await scannerController.stopAllScanners();
      // console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      // console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  shutdownHandlerAdded = true;
}

export default router;
