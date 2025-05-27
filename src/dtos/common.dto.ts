/**
 * @swagger
 * components:
 *   schemas:
 *     ApiSuccessResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *           description: Response data (varies by endpoint)
 */
export interface ApiSuccessResponseDto<T> {
  success: true;
  message: string;
  data: T;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "An error occurred"
 *         statusCode:
 *           type: number
 *           description: Http status code
 *           example: 500
 *         code:
 *           type: number
 *           description: Error code
 *           example: 0
 *         stack:
 *           type: string
 *           description: Error stack trace (development only)
 */
export interface ApiErrorResponseDto {
  success: false;
  message: string;
  statusCode: number;
  code?: number;
  stack?: string;
}
