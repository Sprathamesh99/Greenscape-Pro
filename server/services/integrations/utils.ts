/**
 * Integration Utilities: Timeouts, Bounded Retries, and Credential Sanitization
 */

/**
 * Perform a fetch request with a strict timeout using AbortController.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error(`Request timed out after ${timeoutMs}ms to ${sanitizeUrl(url)}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute an async operation with bounded exponential backoff retries.
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    operationName?: string;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<{ result: T; attempts: number }> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 400;
  const backoffFactor = options.backoffFactor ?? 2;
  const opName = options.operationName || 'Operation';

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation(attempt);
      return { result, attempts: attempt };
    } catch (err: any) {
      lastError = err;
      const isRetryable = options.shouldRetry ? options.shouldRetry(err) : true;

      if (attempt >= maxRetries || !isRetryable) {
        console.warn(`[IntegrationUtils] ${opName} failed after ${attempt} attempt(s):`, err?.message);
        break;
      }

      console.warn(
        `[IntegrationUtils] ${opName} attempt ${attempt}/${maxRetries} failed: "${err?.message}". Retrying in ${delay}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = delay * backoffFactor;
    }
  }

  throw lastError;
}

/**
 * Recursively sanitize an object to strip secrets, bearer tokens, and API keys before logging or persistence.
 */
export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Mask potential bearer tokens and api keys in raw strings
    if (/bearer\s+[a-zA-Z0-9_\-\.]{8,}/i.test(obj)) {
      return obj.replace(/bearer\s+([a-zA-Z0-9_\-\.]{4})[a-zA-Z0-9_\-\.]+/gi, 'Bearer $1***[REDACTED]');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    const SENSITIVE_KEYS = [
      'authorization',
      'apikey',
      'api_key',
      'secret',
      'password',
      'token',
      'access_token',
      'webhook_url',
      'webhookurl',
      'client_secret'
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(k => lowerKey.includes(k));

      if (isSensitive && typeof value === 'string') {
        sanitized[key] = value.length > 8 ? `${value.substring(0, 4)}***[REDACTED]` : '***[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize URL to avoid leaking query params with tokens in logs or error messages.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.search) {
      return `${parsed.origin}${parsed.pathname}?***[QUERY_REDACTED]`;
    }
    // Mask path tokens if slack webhook URL
    if (parsed.pathname.includes('/services/T')) {
      const parts = parsed.pathname.split('/');
      if (parts.length >= 4) {
        return `${parsed.origin}/services/***/***/***[REDACTED]`;
      }
    }
    return url;
  } catch {
    return url.replace(/([?&][a-zA-Z0-9_-]+)=[^&]+/g, '$1=***');
  }
}

/**
 * Classify errors as retryable (transient network or 5xx/429) vs fatal (4xx validation)
 */
export function classifyError(error: any): 'RETRYABLE' | 'FATAL' {
  const status = error?.statusCode || error?.status;
  if (status === 429 || (status >= 500 && status < 600)) {
    return 'RETRYABLE';
  }
  if (status >= 400 && status < 500) {
    return 'FATAL';
  }
  // Generic network errors like ECONNRESET or ETIMEDOUT are retryable
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('network')) {
    return 'RETRYABLE';
  }
  return 'FATAL';
}
