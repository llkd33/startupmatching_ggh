import { z } from 'zod';

// ============================================
// Common Security Validations
// ============================================

/**
 * Email validation with additional security checks
 */
export const secureEmailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long') // RFC 5321
  .toLowerCase()
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    'Email cannot start or end with a dot'
  )
  .refine(
    (email) => {
      // Block disposable email domains
      const disposableDomains = [
        'tempmail.com', 'throwaway.email', '10minutemail.com',
        'guerrillamail.com', 'mailinator.com', 'maildrop.cc'
      ];
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    'Disposable email addresses are not allowed'
  );

/**
 * Password validation with strength requirements
 */
export const securePasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[^A-Za-z0-9]/.test(password),
    'Password must contain at least one special character'
  )
  .refine(
    (password) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password123!', 'Admin123!', 'Qwerty123!', 'Welcome123!'
      ];
      return !weakPasswords.includes(password);
    },
    'This password is too common'
  );

/**
 * Phone number validation (Korean format)
 */
export const securePhoneSchema = z
  .string()
  .regex(
    /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/,
    'Invalid Korean phone number format (010-XXXX-XXXX)'
  );

/**
 * URL validation with security checks
 */
export const secureUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow HTTPS in production
        if (process.env.NODE_ENV === 'production') {
          return parsed.protocol === 'https:';
        }
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'URL must use HTTPS protocol'
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Block localhost and private IPs
        const hostname = parsed.hostname;
        const blocked = [
          'localhost', '127.0.0.1', '0.0.0.0',
          '10.', '172.16.', '192.168.'
        ];
        return !blocked.some(block => hostname.startsWith(block));
      } catch {
        return false;
      }
    },
    'URL cannot point to local or private addresses'
  );

/**
 * Safe text input validation (prevents XSS and injection)
 */
export const safeTextSchema = z
  .string()
  .min(1, 'Text cannot be empty')
  .max(1000, 'Text too long')
  .refine(
    (text) => !/<script|<iframe|javascript:|on\w+=/i.test(text),
    'Text contains potentially dangerous content'
  )
  .transform((text) => {
    // Basic HTML entity encoding
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  });

/**
 * Create safe text schema with custom limits
 */
export const createSafeTextSchema = (minLength = 1, maxLength = 1000) => 
  z.string()
    .min(minLength, `Text must be at least ${minLength} characters`)
    .max(maxLength, `Text must be less than ${maxLength} characters`)
    .refine(
      (text) => !/<script|<iframe|javascript:|on\w+=/i.test(text),
      'Text contains potentially dangerous content'
    )
    .transform((text) => {
      // Basic HTML entity encoding
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    });

/**
 * Business number validation (Korean format)
 */
export const businessNumberSchema = z
  .string()
  .regex(
    /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/,
    'Invalid business number format (XXX-XX-XXXXX)'
  )
  .refine(
    (businessNumber) => {
      // Validate Korean business number checksum
      const numbers = businessNumber.replace(/-/g, '');
      if (numbers.length !== 10) return false;
      
      const keys = [1, 3, 7, 1, 3, 7, 1, 3, 5];
      let sum = 0;
      
      for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers[i]) * keys[i];
      }
      
      sum += Math.floor((parseInt(numbers[8]) * 5) / 10);
      const checkDigit = (10 - (sum % 10)) % 10;
      
      return checkDigit === parseInt(numbers[9]);
    },
    'Invalid business number'
  );

// ============================================
// User & Profile Schemas
// ============================================

export const userRegistrationSchema = z.object({
  email: secureEmailSchema,
  password: securePasswordSchema,
  confirmPassword: z.string(),
  role: z.enum(['expert', 'organization']),
  phone: securePhoneSchema.optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms'),
  privacyAccepted: z.boolean().refine(val => val === true, 'You must accept the privacy policy')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ['confirmPassword']
  }
);

export const expertProfileSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().min(1).max(500).refine(
    (text) => !/<script|<iframe|javascript:|on\w+=/i.test(text),
    'Text contains potentially dangerous content'
  ),
  skills: z.array(z.string().max(50)).max(20),
  hashtags: z.array(z.string().regex(/^#[A-Za-z0-9가-힣]+$/)).max(10),
  portfolio_url: secureUrlSchema.optional(),
  hourly_rate: z.number().min(0).max(1000000),
  career_history: z.array(z.object({
    company: z.string().max(100),
    position: z.string().max(100),
    start_date: z.string().datetime(),
    end_date: z.string().datetime().optional(),
    description: z.string().min(1).max(300).refine(
      (text) => !/<script|<iframe|javascript:|on\w+=/i.test(text),
      'Text contains potentially dangerous content'
    )
  })).max(10),
  education: z.array(z.object({
    school: z.string().max(100),
    degree: z.string().max(100),
    field: z.string().max(100),
    graduation_year: z.number().min(1950).max(new Date().getFullYear() + 5)
  })).max(5)
});

export const organizationProfileSchema = z.object({
  organization_name: z.string().min(2).max(100),
  business_number: businessNumberSchema,
  representative_name: z.string().min(2).max(100),
  contact_position: z.string().max(100).optional(),
  industry: z.string().max(100),
  employee_count: z.enum(['1-10', '11-50', '51-100', '101-500', '500+']),
  website: secureUrlSchema.optional(),
  description: createSafeTextSchema(1, 1000),
  address: z.string().max(500)
});

// ============================================
// Campaign & Proposal Schemas
// ============================================

export const campaignSchema = z.object({
  title: createSafeTextSchema(10, 200),
  description: createSafeTextSchema(50, 2000),
  requirements: createSafeTextSchema(1, 1000),
  budget_min: z.number().min(0).max(1000000000),
  budget_max: z.number().min(0).max(1000000000),
  duration_months: z.number().min(1).max(60),
  skills_required: z.array(z.string().max(50)).max(20),
  deadline: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Deadline must be in the future'
  )
}).refine(
  (data) => data.budget_max >= data.budget_min,
  {
    message: 'Maximum budget must be greater than minimum budget',
    path: ['budget_max']
  }
);

export const proposalSchema = z.object({
  campaign_id: z.string().uuid(),
  cover_letter: createSafeTextSchema(100, 3000),
  proposed_rate: z.number().min(0).max(1000000),
  estimated_hours: z.number().min(1).max(10000),
  availability_date: z.string().datetime().refine(
    (date) => new Date(date) >= new Date(),
    'Availability date cannot be in the past'
  ),
  portfolio_items: z.array(secureUrlSchema).max(10).optional()
});

// ============================================
// Message & Communication Schemas
// ============================================

export const messageSchema = z.object({
  connection_id: z.string().uuid(),
  content: createSafeTextSchema(1, 5000),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: secureUrlSchema,
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    type: z.enum(['image', 'document', 'video'])
  })).max(5).optional()
});

export const connectionRequestSchema = z.object({
  expert_id: z.string().uuid(),
  campaign_title: createSafeTextSchema(1, 200),
  campaign_description: createSafeTextSchema(1, 2000),
  project_duration: z.string().max(100),
  budget_range: z.string().max(100),
  request_message: createSafeTextSchema(1, 1000)
});

// ============================================
// File Upload Schemas
// ============================================

export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  purpose: z.enum(['avatar', 'portfolio', 'document', 'attachment'])
}).refine(
  (data) => {
    const file = data.file;
    const maxSizes: Record<string, number> = {
      avatar: 5 * 1024 * 1024, // 5MB
      portfolio: 20 * 1024 * 1024, // 20MB
      document: 10 * 1024 * 1024, // 10MB
      attachment: 10 * 1024 * 1024 // 10MB
    };
    
    return file.size <= maxSizes[data.purpose];
  },
  {
    message: 'File size exceeds limit for this purpose',
    path: ['file']
  }
).refine(
  (data) => {
    const file = data.file;
    const allowedTypes: Record<string, string[]> = {
      avatar: ['image/jpeg', 'image/png', 'image/gif'],
      portfolio: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      attachment: ['image/jpeg', 'image/png', 'application/pdf', 'application/zip']
    };
    
    return allowedTypes[data.purpose].includes(file.type);
  },
  {
    message: 'File type not allowed for this purpose',
    path: ['file']
  }
);

// ============================================
// Search & Filter Schemas
// ============================================

export const searchQuerySchema = z.object({
  query: z.string().max(200).transform(val => 
    // Remove potential SQL injection attempts
    val.replace(/[';""\\]/g, '').trim()
  ),
  filters: z.object({
    skills: z.array(z.string().max(50)).max(20).optional(),
    min_rate: z.number().min(0).optional(),
    max_rate: z.number().max(1000000).optional(),
    availability: z.boolean().optional(),
    verified_only: z.boolean().optional()
  }).optional(),
  sort: z.enum(['relevance', 'rate_asc', 'rate_desc', 'rating', 'experience']).optional(),
  page: z.number().min(1).max(1000).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// ============================================
// Admin Action Schemas
// ============================================

export const adminActionSchema = z.object({
  action: z.enum(['verify', 'suspend', 'delete', 'restore']),
  target_type: z.enum(['user', 'organization', 'campaign', 'proposal']),
  target_id: z.string().uuid(),
  reason: createSafeTextSchema(1, 500),
  admin_notes: createSafeTextSchema(1, 1000).optional()
});

// ============================================
// Utility Functions
// ============================================

/**
 * Validate and sanitize input data
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Check for common SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
    /(--|\||;|\/\*|\*\/)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /(\'|\"|`)\s*\bOR\b\s*(\'|\"|`)/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<embed/gi,
    /<object/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}