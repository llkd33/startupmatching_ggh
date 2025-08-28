import { supabase } from './supabase'
import { UploadedFile } from '@/components/upload/FileUpload'

// 업로드 가능한 파일 타입
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  ARCHIVES: ['application/zip', 'application/x-rar-compressed']
}

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.IMAGES,
  ...ALLOWED_FILE_TYPES.DOCUMENTS,
  ...ALLOWED_FILE_TYPES.ARCHIVES
]

// 파일 크기 제한 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// 업로드 버킷 설정
export const UPLOAD_BUCKETS = {
  PROFILES: 'profile-images',
  PORTFOLIOS: 'portfolio-files', 
  DOCUMENTS: 'documents',
  ATTACHMENTS: 'attachments'
} as const

export type UploadBucket = keyof typeof UPLOAD_BUCKETS

// 파일 업로드 함수
export async function uploadFile(
  file: File, 
  bucket: UploadBucket = 'ATTACHMENTS',
  userId?: string
): Promise<UploadedFile> {
  try {
    // 파일 검증
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`)
    }

    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      throw new Error('지원하지 않는 파일 형식입니다.')
    }

    // 파일명 정리 (특수문자 제거 및 중복 방지)
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const fileExtension = file.name.split('.').pop()
    const cleanName = file.name
      .replace(/[^a-zA-Z0-9가-힣.-]/g, '_')
      .replace(/_{2,}/g, '_')
    
    const fileName = userId
      ? `${userId}/${timestamp}_${randomId}_${cleanName}`
      : `${timestamp}_${randomId}_${cleanName}`

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(UPLOAD_BUCKETS[bucket])
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(error.message)
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from(UPLOAD_BUCKETS[bucket])
      .getPublicUrl(fileName)

    // 썸네일 URL 생성 (이미지의 경우)
    let thumbnailUrl: string | undefined
    if (ALLOWED_FILE_TYPES.IMAGES.includes(file.type)) {
      const { data: thumbnailData } = supabase.storage
        .from(UPLOAD_BUCKETS[bucket])
        .getPublicUrl(fileName, {
          transform: {
            width: 200,
            height: 200,
            resize: 'cover'
          }
        })
      thumbnailUrl = thumbnailData.publicUrl
    }

    const uploadedFile: UploadedFile = {
      id: data.id || `uploaded-${timestamp}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: publicUrlData.publicUrl,
      thumbnailUrl,
      status: 'completed',
      metadata: {
        bucket,
        path: fileName,
        uploadedAt: new Date().toISOString(),
        userId
      }
    }

    return uploadedFile
  } catch (error) {
    throw error instanceof Error ? error : new Error('파일 업로드 중 알 수 없는 오류가 발생했습니다.')
  }
}

// 다중 파일 업로드
export async function uploadMultipleFiles(
  files: File[],
  bucket: UploadBucket = 'ATTACHMENTS',
  userId?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadedFile[]> {
  const results: UploadedFile[] = []
  const errors: Array<{ file: string, error: string }> = []

  for (let i = 0; i < files.length; i++) {
    try {
      const uploadedFile = await uploadFile(files[i], bucket, userId)
      results.push(uploadedFile)
      onProgress?.(i + 1, files.length)
    } catch (error) {
      errors.push({
        file: files[i].name,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      })
    }
  }

  if (errors.length > 0) {
    console.warn('일부 파일 업로드 실패:', errors)
  }

  return results
}

// 파일 삭제
export async function deleteFile(
  filePath: string,
  bucket: UploadBucket = 'ATTACHMENTS'
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKETS[bucket])
      .remove([filePath])

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('파일 삭제 중 오류가 발생했습니다.')
  }
}

// 파일 URL 생성
export function getFileUrl(
  filePath: string,
  bucket: UploadBucket = 'ATTACHMENTS'
): string {
  const { data } = supabase.storage
    .from(UPLOAD_BUCKETS[bucket])
    .getPublicUrl(filePath)

  return data.publicUrl
}

// 이미지 썸네일 URL 생성
export function getImageThumbnailUrl(
  filePath: string,
  bucket: UploadBucket = 'ATTACHMENTS',
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): string {
  const { width = 200, height = 200, quality = 80 } = options || {}

  const { data } = supabase.storage
    .from(UPLOAD_BUCKETS[bucket])
    .getPublicUrl(filePath, {
      transform: {
        width,
        height,
        resize: 'cover',
        quality
      }
    })

  return data.publicUrl
}

// 파일 타입 검증
export function validateFileType(file: File, allowedTypes?: string[]): string | null {
  const types = allowedTypes || ALL_ALLOWED_TYPES
  
  if (!types.includes(file.type)) {
    return '지원하지 않는 파일 형식입니다.'
  }
  
  return null
}

// 파일 크기 검증
export function validateFileSize(file: File, maxSize: number = MAX_FILE_SIZE): string | null {
  if (file.size > maxSize) {
    return `파일 크기가 너무 큽니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 업로드 가능합니다.`
  }
  
  return null
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 파일 확장자 추출
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// 파일 타입으로부터 카테고리 추출
export function getFileCategory(mimeType: string): 'image' | 'document' | 'archive' | 'other' {
  if (ALLOWED_FILE_TYPES.IMAGES.includes(mimeType)) {
    return 'image'
  }
  
  if (ALLOWED_FILE_TYPES.DOCUMENTS.includes(mimeType)) {
    return 'document'
  }
  
  if (ALLOWED_FILE_TYPES.ARCHIVES.includes(mimeType)) {
    return 'archive'
  }
  
  return 'other'
}

// 업로드 진행률 추적을 위한 타입
export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

// 프로그레시브 업로드 (큰 파일용)
export async function uploadWithProgress(
  file: File,
  bucket: UploadBucket = 'ATTACHMENTS',
  userId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> {
  const fileId = `upload-${Date.now()}-${Math.random()}`
  
  try {
    // 초기 상태
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    })

    // 파일 업로드 (실제 진행률 추적은 Supabase 클라이언트 제한으로 시뮬레이션)
    const uploadPromise = uploadFile(file, bucket, userId)
    
    // 진행률 시뮬레이션
    const progressInterval = setInterval(() => {
      onProgress?.({
        fileId,
        fileName: file.name,
        progress: Math.min(90, Math.random() * 80 + 10),
        status: 'uploading'
      })
    }, 500)

    const result = await uploadPromise
    clearInterval(progressInterval)

    // 완료 상태
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 100,
      status: 'completed'
    })

    return result
  } catch (error) {
    // 에러 상태
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : '업로드 실패'
    })

    throw error
  }
}