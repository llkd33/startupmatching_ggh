# 🚀 Vercel 배포 가이드

## ✅ 배포 준비 완료 상태

### 확인된 사항:
- ✅ 빌드 성공 (TypeScript 경고만 있음, 에러 없음)
- ✅ 환경 변수 설정 완료
- ✅ Supabase 연결 정상
- ✅ Fallback 메커니즘 구현으로 안정성 확보

## 📋 배포 단계

### 1단계: Vercel 계정 준비
1. [vercel.com](https://vercel.com) 에서 GitHub 계정으로 로그인
2. GitHub repository 연결

### 2단계: 환경 변수 설정
Vercel Dashboard → Settings → Environment Variables에서 추가:

```bash
# 필수 환경 변수
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]

# 서버 전용 (선택사항)
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

⚠️ **중요**: 실제 키 값은 `.env.local` 파일에서 복사하세요

### 3단계: 배포 설정
1. **Framework Preset**: Next.js (자동 감지)
2. **Node.js Version**: 18.x 또는 20.x
3. **Build Command**: `npm run build`
4. **Install Command**: `npm install`

### 4단계: Supabase 프로덕션 설정 (중요!)

#### 도메인 설정
1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL** 추가: `https://your-app-name.vercel.app`
3. **Redirect URLs** 추가:
   ```
   https://your-app-name.vercel.app/auth/callback
   https://your-app-name.vercel.app/**
   ```

#### CORS 설정 확인
Supabase는 기본적으로 모든 도메인을 허용하지만, 필요시 설정:
```
https://your-app-name.vercel.app
https://*.vercel.app
```

### 5단계: 첫 배포
1. Vercel에서 "Deploy" 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 후 URL 확인

## 🔧 배포 후 확인 사항

### 필수 테스트
1. **홈페이지 로딩**: 기본 페이지 접근
2. **회원가입**: 전문가/조직 회원가입 테스트
3. **로그인**: 생성한 계정으로 로그인
4. **대시보드**: 역할별 대시보드 접근
5. **실시간 기능**: 알림 및 연결 요청

### 예상 이슈 및 해결

#### 이슈 1: "Database error saving new user"
- **원인**: Trigger 함수 미작동
- **해결**: 이미 fallback 메커니즘 구현됨, 정상 작동 예상

#### 이슈 2: 인증 리다이렉트 문제
- **원인**: Supabase URL 설정 미완료
- **해결**: 4단계 도메인 설정 필수

#### 이슈 3: 빌드 타임아웃
- **원인**: 의존성 설치 시간 초과
- **해결**: Vercel은 일반적으로 충분한 시간 제공, 재배포 시도

## 🚨 주의사항

### 보안
- ✅ `NEXT_PUBLIC_*` 환경 변수만 클라이언트에 노출됨
- ✅ `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용
- ✅ Supabase RLS로 데이터 보안 확보

### 성능
- ✅ Next.js 15의 최적화 기능 활용
- ✅ Vercel Edge Functions로 빠른 응답
- ✅ Supabase 실시간 기능 정상 작동

### 모니터링
- Vercel Analytics에서 성능 모니터링
- Supabase Dashboard에서 DB 사용량 확인
- 실제 사용자 테스트 필요

## 🎉 배포 완료 체크리스트

- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] Supabase 도메인 설정
- [ ] 첫 배포 성공
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 기본 기능 테스트
- [ ] 실시간 알림 테스트

---

**💡 팁**: 배포 후 문제가 발생하면 Vercel Functions 탭에서 로그를 확인하세요!