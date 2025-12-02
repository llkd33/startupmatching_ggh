import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import crypto from 'crypto';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// CSRF token management
const csrfTokens = new Map<string, { token: string; expires: number }>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000; // 1 hour
  csrfTokens.set(sessionId, { token, expires });
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;
  
  // Clean up expired token
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  request: NextRequest,
  options: {
    windowMs?: number;
    maxRequests?: number;
    identifier?: string;
  } = {}
): Promise<NextResponse | null> {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60,
    identifier = request.ip || 'anonymous'
  } = options;

  const now = Date.now();
  const key = `${identifier}:${request.nextUrl.pathname}`;
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  
  // Check if rate limit exceeded
  if (entry.count > maxRequests) {
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        retryAfter: Math.ceil((entry.resetTime - now) / 1000) 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        }
      }
    );
  }
  
  return null;
}

/**
 * Authentication middleware
 */
export async function requireAuth(
  request: NextRequest,
  options: {
    roles?: string[];
    requireVerified?: boolean;
  } = {}
): Promise<{ user: any; response?: NextResponse } | { response: NextResponse }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
    }
  );

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }

  // Get user details with role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (userError || !user) {
    return {
      response: NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    };
  }

  // Check role requirements
  if (options.roles && !options.roles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    };
  }

  // Check verification status if required
  if (options.requireVerified && user.role === 'organization') {
    const { data: orgProfile } = await supabase
      .from('organization_profiles')
      .select('is_verified')
      .eq('user_id', user.id)
      .single();

    if (!orgProfile?.is_verified) {
      return {
        response: NextResponse.json(
          { error: 'Organization not verified' },
          { status: 403 }
        )
      };
    }
  }

  return { user };
}

/**
 * Input validation middleware
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  try {
    const validated = schema.parse(data);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        )
      };
    }
    
    return {
      error: NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    };
  }
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization (in production, use DOMPurify)
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL injection prevention
 */
export function sanitizeSqlInput(input: string): string {
  // Remove or escape potentially dangerous characters
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/exec/gi, '')
    .replace(/execute/gi, '')
    .replace(/select/gi, '')
    .replace(/insert/gi, '')
    .replace(/update/gi, '')
    .replace(/delete/gi, '')
    .replace(/drop/gi, '')
    .replace(/union/gi, '')
    .trim();
}

/**
 * File upload validation
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: true } | { valid: false; error: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    };
  }

  // Check for double extensions (potential bypass attempt)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      if (allowedExtensions.includes(`.${parts[i].toLowerCase()}`)) {
        return {
          valid: false,
          error: 'Multiple extensions detected'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CSP header with nonce-based security (more secure than 'unsafe-inline')
  // Note: For full nonce support, generate nonce per-request and pass to script tags
  const cspDirectives = [
    "default-src 'self'",
    // For Next.js, we need 'unsafe-inline' for styles but can restrict scripts more
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);
  
  return response;
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  event: {
    action: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    details?: any;
    success: boolean;
  }
): Promise<void> {
  // In production, send to logging service
  console.log('[SECURITY EVENT]', {
    timestamp: new Date().toISOString(),
    ...event
  });
  
  // For critical events, trigger alerts
  if (event.risk === 'critical' && !event.success) {
    // Send alert to admin (email, Slack, etc.)
    console.error('[CRITICAL SECURITY ALERT]', event);
  }
}

/**
 * Combined security middleware
 */
export async function withSecurity(
  request: NextRequest,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    rateLimit?: { windowMs?: number; maxRequests?: number };
    requireAuth?: { roles?: string[]; requireVerified?: boolean };
    validateCSRF?: boolean;
  } = {}
): Promise<NextResponse> {
  try {
    // Apply rate limiting
    if (options.rateLimit) {
      const rateLimitResponse = await rateLimit(request, options.rateLimit);
      if (rateLimitResponse) {
        await logSecurityEvent({
          action: 'rate_limit_exceeded',
          ip: request.ip,
          userAgent: request.headers.get('user-agent') || undefined,
          risk: 'medium',
          success: false,
          details: { path: request.nextUrl.pathname }
        });
        return rateLimitResponse;
      }
    }

    // Check authentication
    const context: Record<string, any> = {};
    if (options.requireAuth) {
      const authResult = await requireAuth(request, options.requireAuth);
      if ('response' in authResult && !('user' in authResult)) {
        await logSecurityEvent({
          action: 'unauthorized_access',
          ip: request.ip,
          userAgent: request.headers.get('user-agent') || undefined,
          risk: 'high',
          success: false,
          details: { path: request.nextUrl.pathname }
        });
        return authResult.response;
      }
      if ('user' in authResult) {
        context.user = authResult.user;
      }
    }

    // Validate CSRF token for state-changing operations
    if (options.validateCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers.get('X-CSRF-Token');
      const sessionId = request.cookies.get('session-id')?.value;
      
      if (!sessionId || !csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
        await logSecurityEvent({
          action: 'csrf_validation_failed',
          userId: context.user?.id,
          ip: request.ip,
          userAgent: request.headers.get('user-agent') || undefined,
          risk: 'critical',
          success: false,
          details: { path: request.nextUrl.pathname }
        });
        
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    // Execute the handler
    const response = await handler(request, context);
    
    // Apply security headers
    return applySecurityHeaders(response);
    
  } catch (error) {
    await logSecurityEvent({
      action: 'security_middleware_error',
      ip: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
      risk: 'high',
      success: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean CSRF tokens
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(sessionId);
    }
  }
  
  // Clean rate limit entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Run every minute