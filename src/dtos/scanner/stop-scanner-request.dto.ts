/**
 * @swagger
 * components:
 *   schemas:
 *     StopScannerRequestDto:
 *       type: object
 *       required:
 *         - chainId
 *       properties:
 *         chainId:
 *           type: integer
 *           minimum: 1
 *           description: Blockchain chain ID to stop scanning
 *           example: 137
 */
export interface StopScannerRequestDto {
  chainId: number;
}
