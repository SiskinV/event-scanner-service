/**
 * @swagger
 * components:
 *   schemas:
 *     BlockchainDetailResponse:
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
 *         name:
 *           type: string
 *           description: Blockchain name
 *           example: "Avalanche C-Chain"
 *         chainId:
 *           type: number
 *           description: Chain ID
 *           example: 43114
 *         rpcUrl:
 *           type: string
 *           description: RPC endpoint URL
 *           example: "https://api.avax.network/ext/bc/C/rpc"
 *         contractAddress:
 *           type: string
 *           nullable: true
 *           description: Smart contract address
 *           example: "0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9"
 *         blockExplorer:
 *           type: string
 *           description: Block explorer URL
 *           example: "https://snowtrace.io"
 *         nativeCurrency:
 *           type: string
 *           description: Native currency name
 *           example: "Avalanche"
 *         symbol:
 *           type: string
 *           description: Currency symbol
 *           example: "AVAX"
 *         decimals:
 *           type: number
 *           description: Token decimals
 *           example: 18
 *         isActive:
 *           type: boolean
 *           description: Whether blockchain is active
 *           example: true
 *         scanEnabled:
 *           type: boolean
 *           description: Whether scanning is enabled
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 */
export interface BlockchainDetailResponseDto {
  id: string;
  blockchainId: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  contractAddress?: string;
  blockExplorer: string;
  nativeCurrency: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  scanEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
