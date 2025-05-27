/**
 * @swagger
 * components:
 *   schemas:
 *     StopScannerResponseDto:
 *       type: object
 *       properties:
 *         chainId:
 *           type: integer
 *           description: Chain ID of the stopped scanner
 *           example: 137
 *         stoppedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when scanner was stopped
 *           example: "2024-01-15T11:30:00.000Z"
 */
export interface StopScannerResponseDto {
  chainId: number;
  stoppedAt: Date;
}
