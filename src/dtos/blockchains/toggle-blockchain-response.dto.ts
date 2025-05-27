/**
 * @swagger
 * components:
 *   schemas:
 *     ToggleBlockchainResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiSuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 blockchainId:
 *                   type: string
 *                   example: "avalanche"
 *                 name:
 *                   type: string
 *                   example: "Avalanche C-Chain"
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 */
export interface ToggleBlockchainResponseDto {
  id: string;
  blockchainId: string;
  name: string;
  isActive: boolean;
  updatedAt: Date;
}
