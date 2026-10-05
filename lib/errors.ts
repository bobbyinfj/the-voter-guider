// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    }
  }

  // Unexpected errors (e.g. database failures) can carry internals — log them, but
  // only show the details to developers
  if (error instanceof Error) {
    console.error(error)
    return {
      message: isDevelopment() && error.message ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    }
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

