/**
 * @swagger
 * components:
 *   schemas:
 *     CreateBlockchainRequest:
 *       type: object
 *       required: [blockchainId, name, chainId, rpcUrl, blockExplorer, nativeCurrency, symbol, decimals]
 *       properties:
 *         blockchainId:
 *           type: string
 *           description: Unique blockchain identifier
 *           example: "avalanche"
 *         name:
 *           type: string
 *           description: Human readable name
 *           example: "Avalanche C-Chain"
 *         chainId:
 *           type: number
 *           description: Chain ID (required for EVM chains)
 *           example: 43114
 *         rpcUrl:
 *           type: string
 *           description: RPC endpoint URL
 *           example: "https://api.avax.network/ext/bc/C/rpc"
 *         contractAddress:
 *           type: string
 *           description: Contract address (required for EVM scanning)
 *           example: "0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9"
 *         blockExplorer:
 *           type: string
 *           description: Block explorer URL
 *           example: "https://snowtrace.io"
 *         nativeCurrency:
 *           type: string
 *           description: Full currency name
 *           example: "Avalanche"
 *         symbol:
 *           type: string
 *           description: Currency symbol
 *           example: "AVAX"
 *         decimals:
 *           type: number
 *           minimum: 0
 *           maximum: 18
 *           example: 18
 *         isActive:
 *           type: boolean
 *           default: true
 *           example: true
 *         scanEnabled:
 *           type: boolean
 *           default: false
 *           example: false
 *
 *     ToggleBlockchainRequest:
 *       type: object
 *       required: [isActive]
 *       properties:
 *         isActive:
 *           type: boolean
 *           description: Enable or disable the blockchain
 *           example: true
 *
 *     ToggleScanningRequest:
 *       type: object
 *       required: [scanEnabled]
 *       properties:
 *         scanEnabled:
 *           type: boolean
 *           description: Enable or disable scanning
 *           example: true
 */

export interface CreateBlockchainRequestDto {
  blockchainId: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  contractAddress?: string;
  blockExplorer: string;
  nativeCurrency: string;
  symbol: string;
  decimals: number;
  isActive?: boolean;
  scanEnabled?: boolean;
}
