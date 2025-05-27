import { Router } from 'express';
import { BlockchainController } from '../controllers/blockchain.controller';
import { asyncHandler, validateRequest } from '../common/middleware/error-handler.middleware';

const router = Router();
const blockchainController = new BlockchainController();

// Validation rules
const addBlockchainValidation = [
  { field: 'blockchainId', type: 'string', required: true },
  { field: 'name', type: 'string', required: true },
  { field: 'chainId', type: 'number', required: true },
  { field: 'rpcUrl', type: 'string', required: true },
  { field: 'blockExplorer', type: 'string', required: true },
  { field: 'nativeCurrency', type: 'string', required: true },
  { field: 'symbol', type: 'string', required: true },
  { field: 'decimals', type: 'number', required: true, min: 0, max: 18 },
  { field: 'contractAddress', type: 'string', required: false },
  { field: 'isActive', type: 'boolean', required: false },
  { field: 'scanEnabled', type: 'boolean', required: false },
];

const toggleActiveValidation = [{ field: 'isActive', type: 'boolean', required: true }];

const toggleScanningValidation = [{ field: 'scanEnabled', type: 'boolean', required: true }];

/**
 * @swagger
 * /api/blockchains/all:
 *   get:
 *     summary: Get all blockchains
 *     description: Retrieve all blockchains without any filters
 *     tags: [Blockchains]
 *     responses:
 *       200:
 *         description: All blockchains retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/GetAllBlockchainsResponse'
 *             example:
 *               success: true
 *               message: "All blockchains retrieved successfully"
 *               data:
 *                 blockchains:
 *                   - id: "550e8400-e29b-41d4-a716-446655440000"
 *                     blockchainId: "ethereum"
 *                     rpcUrl: "https://mainnet.infura.io/v3/your-key"
 *                     name: "Ethereum Mainnet"
 *                     chainId: 1
 *                     symbol: "ETH"
 *                     nativeCurrency: "Ethereum"
 *                     blockExplorer: "https://etherscan.io"
 *                     isActive: true
 *                     scanEnabled: true
 *                   - id: "550e8400-e29b-41d4-a716-446655440001"
 *                     blockchainId: "avalanche"
 *                     rpcUrl: "https://api.avax.network/ext/bc/C/rpc"
 *                     name: "Avalanche C-Chain"
 *                     chainId: 43114
 *                     symbol: "AVAX"
 *                     nativeCurrency: "Avalanche"
 *                     blockExplorer: "https://snowtrace.io"
 *                     isActive: true
 *                     scanEnabled: false
 *                 total: 2
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get('/all', asyncHandler(blockchainController.getAllBlockchains.bind(blockchainController)));

/**
 * @swagger
 * /api/blockchains/{id}:
 *   get:
 *     summary: Get blockchain by ID
 *     description: Retrieve detailed information about a specific blockchain
 *     tags: [Blockchains]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Blockchain UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Blockchain retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BlockchainDetailResponse'
 *             example:
 *               success: true
 *               message: "Blockchain retrieved successfully"
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 blockchainId: "ethereum"
 *                 name: "Ethereum Mainnet"
 *                 chainId: 1
 *                 rpcUrl: "https://mainnet.infura.io/v3/your-key"
 *                 contractAddress: "0xa0b86a33e6776d021d14e6d3dfadeb99e2e92c1d"
 *                 blockExplorer: "https://etherscan.io"
 *                 nativeCurrency: "Ethereum"
 *                 symbol: "ETH"
 *                 decimals: 18
 *                 isActive: true
 *                 scanEnabled: true
 *                 createdAt: "2024-01-15T10:30:00Z"
 *                 updatedAt: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Invalid blockchain ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain ID is required"
 *               statusCode: 400
 *       404:
 *         description: Blockchain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain not found"
 *               statusCode: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get('/:id', asyncHandler(blockchainController.getBlockchainById.bind(blockchainController)));

/**
 * @swagger
 * /api/blockchains:
 *   post:
 *     summary: Add new blockchain
 *     description: Create a new blockchain configuration
 *     tags: [Blockchains]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBlockchainRequest'
 *           example:
 *             blockchainId: "polygon"
 *             name: "Polygon Mainnet"
 *             chainId: 137
 *             rpcUrl: "https://polygon-rpc.com"
 *             contractAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
 *             blockExplorer: "https://polygonscan.com"
 *             nativeCurrency: "Polygon"
 *             symbol: "MATIC"
 *             decimals: 18
 *             isActive: true
 *             scanEnabled: false
 *     responses:
 *       201:
 *         description: Blockchain added successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BlockchainDetailResponse'
 *             example:
 *               success: true
 *               message: "Blockchain Polygon Mainnet added successfully"
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440002"
 *                 blockchainId: "polygon"
 *                 name: "Polygon Mainnet"
 *                 chainId: 137
 *                 rpcUrl: "https://polygon-rpc.com"
 *                 contractAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
 *                 blockExplorer: "https://polygonscan.com"
 *                 nativeCurrency: "Polygon"
 *                 symbol: "MATIC"
 *                 decimals: 18
 *                 isActive: true
 *                 scanEnabled: false
 *                 createdAt: "2024-01-15T10:30:00Z"
 *                 updatedAt: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Validation error or blockchain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "Missing required fields: blockchainId, name, rpcUrl, blockExplorer, nativeCurrency, symbol, chainId"
 *                   statusCode: 400
 *               invalid_decimals:
 *                 summary: Invalid decimals value
 *                 value:
 *                   success: false
 *                   message: "Decimals must be between 0 and 18"
 *                   statusCode: 400
 *       409:
 *         description: Blockchain with this ID already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain with ID 'polygon' already exists"
 *               statusCode: 409
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post(
  '/',
  validateRequest(addBlockchainValidation),
  asyncHandler(blockchainController.addBlockchain.bind(blockchainController))
);

/**
 * @swagger
 * /api/blockchains/{id}/toggle:
 *   patch:
 *     summary: Enable/disable blockchain
 *     description: Toggle the active status of a blockchain
 *     tags: [Blockchains]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Blockchain UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ToggleBlockchainRequest'
 *           example:
 *             isActive: false
 *     responses:
 *       200:
 *         description: Blockchain status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         blockchainId:
 *                           type: string
 *                           example: "ethereum"
 *                         name:
 *                           type: string
 *                           example: "Ethereum Mainnet"
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:35:00Z"
 *             example:
 *               success: true
 *               message: "Blockchain disabled successfully"
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 blockchainId: "ethereum"
 *                 name: "Ethereum Mainnet"
 *                 isActive: false
 *                 updatedAt: "2024-01-15T10:35:00Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "isActive must be a boolean"
 *               statusCode: 400
 *       404:
 *         description: Blockchain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain not found"
 *               statusCode: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.patch(
  '/:id/toggle',
  validateRequest(toggleActiveValidation),
  asyncHandler(blockchainController.toggleBlockchain.bind(blockchainController))
);

/**
 * @swagger
 * /api/blockchains/{id}/scanning:
 *   patch:
 *     summary: Enable/disable scanning for blockchain
 *     description: Toggle the scanning status of a blockchain. Scanning can only be enabled for active blockchains with contract addresses.
 *     tags: [Blockchains]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Blockchain UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ToggleScanningRequest'
 *           example:
 *             scanEnabled: true
 *     responses:
 *       200:
 *         description: Scanning status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         blockchainId:
 *                           type: string
 *                           example: "ethereum"
 *                         name:
 *                           type: string
 *                           example: "Ethereum Mainnet"
 *                         scanEnabled:
 *                           type: boolean
 *                           example: true
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:35:00Z"
 *             example:
 *               success: true
 *               message: "Scanning enabled for Ethereum Mainnet"
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 blockchainId: "ethereum"
 *                 name: "Ethereum Mainnet"
 *                 scanEnabled: true
 *                 updatedAt: "2024-01-15T10:35:00Z"
 *       400:
 *         description: Cannot enable scanning (blockchain inactive or missing contract)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "scanEnabled must be a boolean"
 *                   statusCode: 400
 *               inactive_blockchain:
 *                 summary: Blockchain is inactive
 *                 value:
 *                   success: false
 *                   message: "Cannot enable scanning for inactive blockchain"
 *                   statusCode: 400
 *               missing_contract:
 *                 summary: Missing contract address
 *                 value:
 *                   success: false
 *                   message: "Contract address is required to enable scanning"
 *                   statusCode: 400
 *       404:
 *         description: Blockchain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain not found"
 *               statusCode: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.patch(
  '/:id/scanning',
  validateRequest(toggleScanningValidation),
  asyncHandler(blockchainController.toggleScanning.bind(blockchainController))
);

/**
 * @swagger
 * /api/blockchains/{id}:
 *   delete:
 *     summary: Delete blockchain by ID
 *     description: Permanently delete a blockchain configuration. Cannot delete blockchains with active scanning.
 *     tags: [Blockchains]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Blockchain UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Blockchain deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         blockchainId:
 *                           type: string
 *                           example: "ethereum"
 *                         name:
 *                           type: string
 *                           example: "Ethereum Mainnet"
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:35:00Z"
 *             example:
 *               success: true
 *               message: "Blockchain Ethereum Mainnet deleted successfully"
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 blockchainId: "ethereum"
 *                 name: "Ethereum Mainnet"
 *                 deletedAt: "2024-01-15T10:35:00Z"
 *       400:
 *         description: Cannot delete blockchain with active scanning
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "Blockchain ID is required"
 *                   statusCode: 400
 *               active_scanning:
 *                 summary: Cannot delete blockchain with active scanning
 *                 value:
 *                   success: false
 *                   message: "Cannot delete blockchain with active scanning. Disable scanning first."
 *                   statusCode: 400
 *       404:
 *         description: Blockchain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               message: "Blockchain not found"
 *               statusCode: 404
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.delete(
  '/:id',
  asyncHandler(blockchainController.deleteBlockchain.bind(blockchainController))
);

export default router;
