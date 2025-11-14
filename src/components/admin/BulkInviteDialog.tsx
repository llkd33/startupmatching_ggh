'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileSpreadsheet, UserPlus, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface InviteUser {
  email: string
  name: string
  phone: string
  role: 'expert' | 'organization'
  organization_name?: string
  position?: string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function BulkInviteDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel')
  const [parsedUsers, setParsedUsers] = useState<InviteUser[]>([])
  const [manualUsers, setManualUsers] = useState<InviteUser[]>([
    { email: '', name: '', phone: '', role: 'expert' }
  ])
  const [inviteResults, setInviteResults] = useState<{
    success: number
    failed: number
    errors: Array<{ email: string; error: string }>
  } | null>(null)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    processing: string | null
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 엑셀 파일 파싱
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 제한 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 파일 확장자 확인
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다. 파일 형식을 확인해주세요.')
      return
    }

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      let jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[]

      // 빈 행 필터링
      jsonData = jsonData.filter(row => 
        row.email || row.Email || row.EMAIL || 
        row.name || row.Name || row.NAME
      )

      if (jsonData.length === 0) {
        toast.error('파일에 입력된 정보가 없습니다. 파일을 확인해주세요.')
        return
      }

      // 필수 컬럼 확인
      const requiredColumns = ['email', 'name', 'phone', 'role']
      const headers = Object.keys(jsonData[0] || {})
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(h => h.toLowerCase().includes(col.toLowerCase()))
      )

      if (missingColumns.length > 0) {
        toast.error(`필수 항목이 누락되었습니다: ${missingColumns.join(', ')}. 템플릿을 다운로드하여 확인해주세요.`)
        return
      }

      // 데이터 변환 및 검증
      const users: InviteUser[] = []
      const errors: string[] = []
      const emailSet = new Set<string>() // 중복 이메일 체크용

      jsonData.forEach((row, index) => {
        const email = (row.email || row.Email || row.EMAIL || '').trim().toLowerCase()
        const name = row.name || row.Name || row.NAME || ''
        const phone = row.phone || row.Phone || row.PHONE || ''
        const role = (row.role || row.Role || row.ROLE || 'expert').toLowerCase()
        const organization_name = row.organization_name || row.Organization || row.organization || ''
        const position = row.position || row.Position || row.position || ''

        // 중복 이메일 체크
        if (email && emailSet.has(email)) {
          errors.push(`행 ${index + 2}: 중복된 이메일 주소입니다 (${email})`)
          return
        }

        const validation = validateUser({
          email,
          name,
          phone,
          role: role === 'organization' ? 'organization' : 'expert',
          organization_name,
          position
        }, index + 2) // 엑셀은 1부터 시작, 헤더가 1행이므로 +2

        if (validation.valid) {
          emailSet.add(email)
          users.push({
            email,
            name: name.trim(),
            phone: phone.replace(/[^0-9]/g, ''), // 숫자만 추출
            role: role === 'organization' ? 'organization' : 'expert',
            organization_name: organization_name?.trim() || undefined,
            position: position?.trim() || undefined
          })
        } else {
          errors.push(...validation.errors)
        }
      })

      if (users.length === 0) {
        toast.error('올바른 초대 정보가 없습니다. 파일을 확인해주세요.')
        if (errors.length > 0) {
          setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... 외 ${errors.length - 5}개 항목에 오류가 있습니다` : ''))
        }
        return
      }

      setParsedUsers(users)
      toast.success(`${users.length}명의 초대 정보가 확인되었습니다.${errors.length > 0 ? ` (${errors.length}개 항목에 오류가 있습니다)` : ''}`)
      
      if (errors.length > 0) {
        setError(errors.slice(0, 10).join('\n') + (errors.length > 10 ? `\n... 외 ${errors.length - 10}개 오류` : ''))
      } else {
        setError(null)
      }
    } catch (err: any) {
      console.error('File parsing error:', err)
      toast.error('파일을 읽는 중 문제가 발생했습니다. 파일 형식을 확인해주세요.')
    }
  }

  // 사용자 데이터 검증
  const validateUser = (user: Partial<InviteUser>, rowNumber: number): ValidationResult => {
    const errors: string[] = []

    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push(`행 ${rowNumber}: 올바른 이메일 주소 형식이 아닙니다 (${user.email || '입력되지 않음'})`)
    }

    if (!user.name || user.name.trim().length === 0) {
      errors.push(`행 ${rowNumber}: 이름을 입력해주세요`)
    }

    if (!user.phone || !/^01[0-9][0-9]{8}$/.test(user.phone.replace(/[^0-9]/g, ''))) {
      errors.push(`행 ${rowNumber}: 올바른 전화번호 형식이 아닙니다 (${user.phone || '입력되지 않음'})`)
    }

    if (user.role && user.role !== 'expert' && user.role !== 'organization') {
      errors.push(`행 ${rowNumber}: 역할은 '전문가' 또는 '기관'으로 입력해주세요`)
    }

    if (user.role === 'organization' && !user.organization_name) {
      errors.push(`행 ${rowNumber}: 기관 역할의 경우 기관명을 입력해주세요`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // 수동 입력 사용자 추가
  const addManualUser = () => {
    setManualUsers([...manualUsers, { email: '', name: '', phone: '', role: 'expert' }])
  }

  // 수동 입력 사용자 제거
  const removeManualUser = (index: number) => {
    setManualUsers(manualUsers.filter((_, i) => i !== index))
  }

  // 수동 입력 사용자 업데이트
  const updateManualUser = (index: number, field: keyof InviteUser, value: string) => {
    const updated = [...manualUsers]
    updated[index] = { ...updated[index], [field]: value }
    setManualUsers(updated)
  }

  // 일괄 초대 실행
  const handleBulkInvite = async () => {
    const usersToInvite = activeTab === 'excel' ? parsedUsers : manualUsers.filter(u => 
      u.email && u.name && u.phone
    )

    if (usersToInvite.length === 0) {
      toast.error('초대할 대상이 없습니다. 정보를 입력해주세요.')
      return
    }

    // 검증
    const validationErrors: string[] = []
    usersToInvite.forEach((user, index) => {
      const validation = validateUser(user, index + 1)
      if (!validation.valid) {
        validationErrors.push(...validation.errors)
      }
    })

    if (validationErrors.length > 0) {
      setError(validationErrors.slice(0, 10).join('\n') + (validationErrors.length > 10 ? `\n... 외 ${validationErrors.length - 10}개 오류` : ''))
      toast.error('입력하신 정보에 오류가 있습니다. 확인 후 다시 시도해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setInviteResults(null)
    setProgress({ current: 0, total: usersToInvite.length, processing: null })

    try {
      // 진행 상황 시뮬레이션을 위한 인터벌 설정
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev) return null
          // 실제 진행률은 API 응답을 받을 때까지 추정치로 표시
          const estimatedProgress = Math.min(
            prev.current + Math.ceil(prev.total / 20), // 대략적인 진행률
            prev.total
          )
          return { ...prev, current: estimatedProgress }
        })
      }, 500)

      const response = await fetch('/api/admin/bulk-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: usersToInvite }),
      })

      clearInterval(progressInterval)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '일괄 초대에 실패했습니다.')
      }

      setProgress({ current: usersToInvite.length, total: usersToInvite.length, processing: null })
      
      // 잠시 후 진행 상황 숨김
      setTimeout(() => {
        setProgress(null)
      }, 1000)

      setInviteResults({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || []
      })

      if (data.success > 0) {
        toast.success(`${data.success}명에게 초대장이 발송되었습니다.`)
      }
      
      if (data.failed > 0) {
        toast.error(`${data.failed}명의 초대 과정에서 문제가 발생했습니다. 오류 내역을 확인해주세요.`)
      }

      // 성공 시 초기화
      if (data.failed === 0) {
        setParsedUsers([])
        setManualUsers([{ email: '', name: '', phone: '', role: 'expert' }])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setProgress(null)
      console.error('Error bulk inviting users:', err)
      setError(err.message || '일괄 초대 중 오류가 발생했습니다.')
      toast.error(err.message || '초대 과정에서 문제가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        email: 'user1@example.com',
        name: '홍길동',
        phone: '01012345678',
        role: 'expert',
        organization_name: '',
        position: ''
      },
      {
        email: 'user2@example.com',
        name: '김철수',
        phone: '01087654321',
        role: 'organization',
        organization_name: '주식회사 테크노',
        position: '인사팀장'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'user_invite_template.xlsx')
      toast.success('템플릿 파일이 다운로드되었습니다. 파일을 열어 양식에 맞춰 입력해주세요.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-[44px]">
          <UserPlus className="w-4 h-4 mr-2" />
          일괄 초대
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>회원 일괄 초대</DialogTitle>
          <DialogDescription>
            엑셀 파일을 업로드하거나 수동으로 입력하여 여러 분을 한 번에 초대할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'excel' | 'manual')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              엑셀 업로드
            </TabsTrigger>
            <TabsTrigger value="manual">
              <UserPlus className="w-4 h-4 mr-2" />
              수동 입력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>엑셀 파일 업로드</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  템플릿 다운로드
                </Button>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  파일 선택
                </label>
                  <p className="text-sm text-gray-500 mt-2">
                  엑셀 파일(.xlsx, .xls) 또는 CSV 파일을 업로드해주세요
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  필수 항목: 이메일, 이름, 전화번호, 역할 (전문가 또는 기관)
                </p>
              </div>

              {parsedUsers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-green-800">
                      {parsedUsers.length}명의 초대가 준비되었습니다
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">이메일</th>
                          <th className="text-left p-2">이름</th>
                          <th className="text-left p-2">전화번호</th>
                          <th className="text-left p-2">역할</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedUsers.slice(0, 10).map((user, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">{user.name}</td>
                            <td className="p-2">{user.phone}</td>
                            <td className="p-2">{user.role === 'expert' ? '전문가' : '기관'}</td>
                          </tr>
                        ))}
                        {parsedUsers.length > 10 && (
                          <tr>
                            <td colSpan={4} className="p-2 text-center text-gray-500">
                              ... 외 {parsedUsers.length - 10}명
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              {manualUsers.map((user, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">사용자 {index + 1}</span>
                    {manualUsers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeManualUser(index)}
                      >
                        제거
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>이메일 *</Label>
                      <Input
                        value={user.email}
                        onChange={(e) => updateManualUser(index, 'email', e.target.value)}
                        placeholder="user@example.com"
                        type="email"
                      />
                    </div>
                    <div>
                      <Label>이름 *</Label>
                      <Input
                        value={user.name}
                        onChange={(e) => updateManualUser(index, 'name', e.target.value)}
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <Label>전화번호 *</Label>
                      <Input
                        value={user.phone}
                        onChange={(e) => updateManualUser(index, 'phone', e.target.value)}
                        placeholder="01012345678"
                        type="tel"
                      />
                    </div>
                    <div>
                      <Label>역할 *</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateManualUser(index, 'role', value as 'expert' | 'organization')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expert">전문가</SelectItem>
                          <SelectItem value="organization">기관</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {user.role === 'organization' && (
                      <>
                        <div>
                          <Label>기관명 *</Label>
                          <Input
                            value={user.organization_name || ''}
                            onChange={(e) => updateManualUser(index, 'organization_name', e.target.value)}
                            placeholder="주식회사 테크노"
                          />
                        </div>
                        <div>
                          <Label>직책</Label>
                          <Input
                            value={user.position || ''}
                            onChange={(e) => updateManualUser(index, 'position', e.target.value)}
                            placeholder="인사팀장"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addManualUser}
                className="w-full"
              >
                + 사용자 추가
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {progress && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>초대 진행 중...</span>
                  <span className="font-semibold">
                    {progress.current} / {progress.total}명
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                {progress.processing && (
                  <p className="text-xs text-gray-500">처리 중: {progress.processing}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {inviteResults && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">성공: {inviteResults.success}명</span>
                </div>
                {inviteResults.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold">실패: {inviteResults.failed}명</span>
                  </div>
                )}
                {inviteResults.errors.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="font-semibold mb-1">오류 상세:</p>
                    <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                      {inviteResults.errors.map((err, idx) => (
                        <li key={idx}>{err.email}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setParsedUsers([])
              setManualUsers([{ email: '', name: '', phone: '', role: 'expert' }])
              setInviteResults(null)
              setError(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            className="flex-1 min-h-[44px]"
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleBulkInvite}
            className="flex-1 min-h-[44px]"
            disabled={loading || (activeTab === 'excel' ? parsedUsers.length === 0 : manualUsers.filter(u => u.email && u.name && u.phone).length === 0)}
            isLoading={loading}
          >
            {loading ? '초대 진행 중...' : `초대하기 (${activeTab === 'excel' ? parsedUsers.length : manualUsers.filter(u => u.email && u.name && u.phone).length}명)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

