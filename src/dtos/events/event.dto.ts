/**
 * @swagger
 * components:
 *   schemas:
 *     EventResponseDto:
 *       type: object
 *       required:
 *         - id
 *         - integrator
 *         - token
 *         - integratorFee
 *         - lifiFee
 *         - blockNumber
 *         - transactionHash
 *         - logIndex
 *         - chainId
 *       properties:
 *         id:
 *           type: string
 *           description: Event collection id
 *           example: "7ceb9d3f-4f47-4b2a-b163-0f711209a287"
 *         integrator:
 *           type: string
 *           description: Integrator wallet address
 *           example: "0x1234567890123456789012345678901234567890"
 *         token:
 *           type: string
 *           description: Token contract address
 *           example: "0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0"
 *         integratorFee:
 *           type: string
 *           description: Fee amount for integrator
 *           example: "78859"
 *         lifiFee:
 *           type: string
 *           description: Fee amount for LiFi
 *           example: "14786"
 *         integratorFeeHex:
 *           type: string
 *           description: Fee amount for integrator in hexadecimal format
 *           example: "0xde0b6b3a7640000"
 *           nullable: true
 *         lifiFeeHex:
 *           type: string
 *           description: Fee amount for LiFi in hexadecimal format
 *           example: "0x6f05b59d3b20000"
 *           nullable: true
 *         blockNumber:
 *           type: integer
 *           description: Block number where event occurred
 *           example: 45123456
 *         transactionHash:
 *           type: string
 *           description: Transaction hash
 *           example: "0xc1449b20979a82263dc72867324c7630323e38bf40411e28372ad04ea36dc6d6"
 *         logIndex:
 *           type: integer
 *           description: Log index within the transaction
 *           example: 2
 *         chainId:
 *           type: integer
 *           description: EVM blockchain chain ID
 *           example: 137
 *         blockTimestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the block was mined
 *           example: "2024-01-15T10:30:00.000Z"
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the event was saved to database
 *           example: "2024-01-15T10:31:00.000Z"
 *           nullable: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the event was last updated in database
 *           example: "2024-01-15T10:31:00.000Z"
 *           nullable: true
 */
export interface EventResponseDto {
  id: string;
  integrator: string;
  token: string;
  integratorFee: string;
  lifiFee: string;
  integratorFeeHex?: string;
  lifiFeeHex?: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  chainId: number;
  blockTimestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetEventsByIntegratorRequestDto:
 *       type: object
 *       properties:
 *         chainId:
 *           type: integer
 *           description: Filter by chain ID
 *           example: 137
 *         token:
 *           type: string
 *           description: Filter by token address
 *           example: "0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0"
 *         fromBlock:
 *           type: integer
 *           minimum: 0
 *           description: Start block number
 *           example: 61500000
 *         toBlock:
 *           type: integer
 *           minimum: 0
 *           description: End block number
 *           example: 71500000
 *         sortBy:
 *           type: string
 *           enum: [blockNumber, blockTimestamp, createdAt]
 *           description: Sort field
 *           example: "blockNumber"
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           description: Sort order
 *           example: "desc"
 *         page:
 *           type: integer
 *           minimum: 1
 *           description: Page number (default 1)
 *           example: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           description: Number of events per page (default 50, max 1000)
 *           example: 50
 *       required:
 *         - integrator
 */
export interface GetEventsQueryParamsRequestDto {
  chainId?: string;
  token?: string;
  fromBlock?: string;
  toBlock?: string;
  sortBy?: 'blockNumber' | 'blockTimestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: string;
  limit?: string;
}
