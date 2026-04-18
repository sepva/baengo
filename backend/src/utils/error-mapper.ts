import { z } from 'zod'

export interface ApiErrorResponse {
  error: string
  message: string
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, details)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Invalid credentials') {
    super(401, message)
    this.name = 'AuthError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message)
    this.name = 'RateLimitError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message)
    this.name = 'ConflictError'
  }
}

/**
 * Maps errors to API responses
 * Sanitizes database/stack trace details for security
 */
export function mapErrorToResponse(error: any): { statusCode: number; response: ApiErrorResponse } {
  // AppError instances - use as-is
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      response: {
        error: getErrorName(error.statusCode),
        message: error.message,
      },
    }
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0]
    return {
      statusCode: 400,
      response: {
        error: 'Validation Error',
        message: `${firstError.path.join('.')}: ${firstError.message}`,
      },
    }
  }

  // Generic database or unknown errors - return generic message
  console.error('Unhandled error:', error)
  return {
    statusCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
    },
  }
}

function getErrorName(statusCode: number): string {
  const names: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  }
  return names[statusCode] || 'Error'
}
