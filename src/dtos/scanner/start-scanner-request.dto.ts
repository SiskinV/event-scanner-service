/**
 * @swagger
 * components:
 *   schemas:
 *     StartScannerRequestDto:
 *       type: object
 *       required:
 *         - chainId
 *       properties:
 *         chainId:
 *           type: integer
 *           minimum: 1
 *           description: Blockchain chain ID to start scanning
 *           example: 137
 */
export interface StartScannerRequestDto {
  chainId: number;
}
