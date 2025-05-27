/**
 * @swagger
 * components:
 *   schemas:
 *     BlockchainResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique blockchain UUID
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         blockchainId:
 *           type: string
 *           description: Blockchain identifier
 *           example: "avalanche"
 *         rpcUrl:
 *           type: string
 *           description: RPC endpoint URL
 *           example: "https://api.avax.network/ext/bc/C/rpc"
 *         name:
 *           type: string
 *           description: Blockchain name
 *           example: "Avalanche C-Chain"
 *         chainId:
 *           type: number
 *           description: Chain ID
 *           example: 43114
 *         symbol:
 *           type: string
 *           description: Currency symbol
 *           example: "AVAX"
 *         nativeCurrency:
 *           type: string
 *           description: Native currency name
 *           example: "Avalanche"
 *         blockExplorer:
 *           type: string
 *           description: Block explorer URL
 *           example: "https://snowtrace.io"
 *         isActive:
 *           type: boolean
 *           description: Whether blockchain is active
 *           example: true
 *         scanEnabled:
 *           type: boolean
 *           description: Whether scanning is enabled
 *           example: false
 */
export interface BlockchainResponseDto {
  id: string;
  blockchainId: string;
  rpcUrl: string;
  name: string;
  chainId: number;
  symbol: string;
  nativeCurrency: string;
  blockExplorer: string;
  isActive: boolean;
  scanEnabled: boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetAllBlockchainsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiSuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 blockchains:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BlockchainResponse'
 *                 total:
 *                   type: number
 *                   description: Total number of blockchains
 *                   example: 5
 */
export interface GetAllBlockchainsResponseDto {
  blockchains: BlockchainResponseDto[];
  total: number;
}
