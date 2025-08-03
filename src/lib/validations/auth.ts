import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('올바른 이메일 주소를 입력해주세요')
export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[A-Z]/, '대문자를 하나 이상 포함해야 합니다')
  .regex(/[a-z]/, '소문자를 하나 이상 포함해야 합니다')
  .regex(/[0-9]/, '숫자를 하나 이상 포함해야 합니다')

export const phoneSchema = z.string()
  .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다')

// Expert registration schema
export const expertRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  phone: phoneSchema,
  agreeToTerms: z.boolean().refine(val => val === true, '약관에 동의해주세요'),
  agreeToPrivacy: z.boolean().refine(val => val === true, '개인정보 처리방침에 동의해주세요'),
}).refine(data => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

// Organization registration schema
export const organizationRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  organizationName: z.string().min(2, '조직명은 2자 이상이어야 합니다'),
  businessNumber: z.string().optional(),
  representativeName: z.string().min(2, '대표자명은 2자 이상이어야 합니다'),
  contactPosition: z.string().optional(),
  phone: phoneSchema,
  agreeToTerms: z.boolean().refine(val => val === true, '약관에 동의해주세요'),
  agreeToPrivacy: z.boolean().refine(val => val === true, '개인정보 처리방침에 동의해주세요'),
}).refine(data => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

// Expert profile schema
export const expertProfileSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  bio: z.string().max(500, '자기소개는 500자 이내로 작성해주세요').optional(),
  skills: z.array(z.string()).min(1, '최소 1개 이상의 스킬을 선택해주세요'),
  serviceRegions: z.array(z.string()).min(1, '최소 1개 이상의 지역을 선택해주세요'),
  hourlyRate: z.number().min(0, '시간당 요금은 0 이상이어야 합니다').optional(),
  portfolioUrl: z.string().url('올바른 URL 형식이 아닙니다').optional().or(z.literal('')),
  careerHistory: z.array(z.object({
    company: z.string().min(1, '회사명을 입력해주세요'),
    position: z.string().min(1, '직책을 입력해주세요'),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string().optional(),
  })),
  education: z.array(z.object({
    school: z.string().min(1, '학교명을 입력해주세요'),
    degree: z.string().min(1, '학위를 입력해주세요'),
    field: z.string().min(1, '전공을 입력해주세요'),
    graduationDate: z.string(),
  })),
})

// Organization profile schema
export const organizationProfileSchema = z.object({
  organizationName: z.string().min(2, '조직명은 2자 이상이어야 합니다'),
  businessNumber: z.string().optional(),
  representativeName: z.string().min(2, '대표자명은 2자 이상이어야 합니다'),
  contactPosition: z.string().optional(),
  industry: z.string().min(1, '업종을 선택해주세요'),
  employeeCount: z.string().min(1, '직원 수를 선택해주세요'),
  website: z.string().url('올바른 URL 형식이 아닙니다').optional().or(z.literal('')),
  description: z.string().max(1000, '설명은 1000자 이내로 작성해주세요').optional(),
})

export type ExpertRegistrationInput = z.infer<typeof expertRegistrationSchema>
export type OrganizationRegistrationInput = z.infer<typeof organizationRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ExpertProfileInput = z.infer<typeof expertProfileSchema>
export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>