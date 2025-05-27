/**
 * @swagger
 * components:
 *   schemas:
 *     ToggleBlockchainRequest:
 *       type: object
 *       required:
 *         - isActive
 *       properties:
 *         isActive:
 *           type: boolean
 *           description: Enable or disable the blockchain
 *           example: true
 */
export interface ToggleBlockchainRequestDto {
  isActive: boolean;
}
