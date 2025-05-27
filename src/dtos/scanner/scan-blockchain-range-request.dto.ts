/**
 * @swagger
 * components:
 *   schemas:
 *     ScanBlockRangeRequestDto:
 *       type: object
 *       required:
 *         - chainId
 *         - fromBlock
 *         - toBlock
 *       properties:
 *         chainId:
 *           type: integer
 *           minimum: 1
 *           description: Blockchain chain ID to scan
 *           example: 137
 *         fromBlock:
 *           type: integer
 *           minimum: 0
 *           description: Starting block number (inclusive)
 *           example: 45000000
 *         toBlock:
 *           type: integer
 *           minimum: 0
 *           description: Ending block number (inclusive)
 *           example: 45001000
 */
export interface ScanBlockRangeRequestDto {
  chainId: number;
  fromBlock: number;
  toBlock: number;
}
