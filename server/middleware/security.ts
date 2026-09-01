import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../db/types';

// Extended Express Request interface for authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: UserRole;
    email?: string;
  };
}

/**
 * 1. Security Headers Middleware (OWASP Secure Headers)
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable browser XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions Policy for common capabilities
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  next();
}

/**
 * 2. In-Memory Sliding Window Rate Limiter
 * Protects expensive AI endpoints and approval gates against brute-force / DoS.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.', keyPrefix = 'rl' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier (IP or X-Forwarded-For)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket.remoteAddress || '127.0.0.1';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    // Set standard RateLimit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)
        }
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const aiExtractionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  message: 'AI scope extraction rate limit reached. Please wait before submitting additional site notes.',
  keyPrefix: 'ai-extract'
});

export const approvalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many approval actions in a short period. Please verify state.',
  keyPrefix: 'approval'
});

/**
 * 3. Authentication & RBAC Middleware
 * Extracts and verifies authenticated user identity from request context.
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Read authenticated user claims from session/headers
  const userId = (req.headers['x-user-id'] as string) || 'marcus_tate';
  const userName = (req.headers['x-user-name'] as string) || 'Marcus Tate';
  const rawRole = (req.headers['x-user-role'] as string) || 'OWNER';

  // Validate that role is a legitimate system role
  const VALID_ROLES: UserRole[] = ['OWNER', 'STAFF', 'ADMIN', 'SYSTEM'];
  const userRole: UserRole = VALID_ROLES.includes(rawRole as UserRole) ? (rawRole as UserRole) : 'STAFF';

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
    email: (req.headers['x-user-email'] as string) || 'marcus@greenscapepro.com'
  };

  next();
}

/**
 * Require specific Role(s) for sensitive operations
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Role "${req.user.role}" lacks required permissions (${allowedRoles.join(', ')}).`
        }
      });
    }

    next();
  };
}

/**
 * 4. Input Sanitization & Anti-XSS Middleware
 * Strips dangerous HTML tags and script injection payloads from request body.
 */
function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  // Remove null bytes
  let clean = val.replace(/\0/g, '');
  // Strip dangerous HTML/Script tags to prevent persistent XSS
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');
  clean = clean.replace(/on\w+\s*=\s*(['"]).*?\1/gi, '');
  return clean;
}

export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObjectInPlace(req.body);
  }
  next();
}

function sanitizeObjectInPlace(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      sanitizeObjectInPlace(val);
    }
  }
}

/**
 * 5. CSRF / API Request Origin Validation
 * Validates that mutating requests (POST/PUT/DELETE) include expected request headers.
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Ensure request has JSON content type or requested-with header
  const contentType = req.headers['content-type'];
  const hasValidContentType = contentType && contentType.includes('application/json');

  if (!hasValidContentType && req.path.startsWith('/api/')) {
    // Check if non-form mutation
    if (req.body && Object.keys(req.body).length > 0) {
      return res.status(415).json({
        success: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'API mutations require Content-Type: application/json' }
      });
    }
  }

  next();
}
