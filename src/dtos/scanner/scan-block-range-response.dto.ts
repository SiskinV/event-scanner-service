/**
 * @swagger
 * components:
 *   schemas:
 *     ScanBlockRangeResponseDto:
 *       type: object
 *       properties:
 *         chainId:
 *           type: integer
 *           description: Chain ID that was scanned
 *           example: 137
 *         fromBlock:
 *           type: integer
 *           description: Starting block number that was scanned
 *           example: 45000000
 *         toBlock:
 *           type: integer
 *           description: Ending block number that was scanned
 *           example: 45001000
 *         blocksScanned:
 *           type: integer
 *           description: Total number of blocks scanned
 *           example: 1000
 *         scannedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when scan completed
 *           example: "2024-01-15T10:35:00.000Z"
 */
export interface ScanBlockRangeResponseDto {
  chainId: number;
  fromBlock: number;
  toBlock: number;
  blocksScanned: number;
  scannedAt: Date;
}
