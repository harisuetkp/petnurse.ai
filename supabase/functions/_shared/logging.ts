/**
 * Secure logging utilities for edge functions
 * Prevents exposure of sensitive information in production logs
 */

const IS_DEVELOPMENT = Deno.env.get('ENVIRONMENT') === 'development';

/**
 * Sanitize error messages to remove potentially sensitive information
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Only return the error type and a generic message in production
    return IS_DEVELOPMENT 
      ? error.message 
      : `${error.name}: Operation failed`;
  }
  return IS_DEVELOPMENT ? String(error) : 'Operation failed';
}

/**
 * Log an error with appropriate detail level based on environment
 */
export function logError(context: string, error: unknown, statusCode?: number): void {
  const sanitizedError = sanitizeError(error);
  
  if (IS_DEVELOPMENT) {
    // Full details in development
    console.error(`[${context}] Error:`, error);
  } else {
    // Sanitized in production - only log context and status
    console.error(`[${context}] Error occurred${statusCode ? ` (status: ${statusCode})` : ''}: ${sanitizedError}`);
  }
}

/**
 * Log API response errors without exposing full response bodies
 */
export function logApiError(context: string, status: number, errorText?: string): void {
  if (IS_DEVELOPMENT && errorText) {
    console.error(`[${context}] API error (${status}):`, errorText);
  } else {
    console.error(`[${context}] API request failed with status: ${status}`);
  }
}

/**
 * Log a step/action for debugging without exposing sensitive data
 */
export function logStep(step: string, details?: Record<string, unknown>): void {
  if (IS_DEVELOPMENT && details) {
    console.log(`[Step] ${step}:`, JSON.stringify(details));
  } else {
    console.log(`[Step] ${step}`);
  }
}

/**
 * Log user action with sanitized user ID (only first/last chars)
 */
export function logUserAction(action: string, userId: string): void {
  // Only show partial user ID in logs
  const sanitizedId = userId.length > 8 
    ? `${userId.slice(0, 4)}...${userId.slice(-4)}`
    : '****';
  console.log(`[User] ${action} by user: ${sanitizedId}`);
}
