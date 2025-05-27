/**
 * @swagger
 * components:
 *   schemas:
 *     StartScannerResponseDto:
 *       type: object
 *       properties:
 *         chainId:
 *           type: integer
 *           description: Chain ID of the started scanner
 *           example: 137
 *         startedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when scanner was started
 *           example: "2024-01-15T10:30:00.000Z"
 */
export interface StartScannerResponseDto {
  chainId: number;
  startedAt: Date;
}
