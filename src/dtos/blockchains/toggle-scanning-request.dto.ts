/**
 * @swagger
 * components:
 *   schemas:
 *     ToggleScanningRequest:
 *       type: object
 *       required:
 *         - scanEnabled
 *       properties:
 *         scanEnabled:
 *           type: boolean
 *           description: Enable or disable blockchain scanning
 *           example: true
 */
export interface ToggleScanningRequestDto {
  scanEnabled: boolean;
}
