# 스타트업 매칭 플랫폼 (Expert Matching Platform)

창업지원기관과 전문가를 연결하는 스마트 매칭 플랫폼입니다.

## 🚀 프로젝트 현황

### ✅ 완료된 기능
- **Task 1-5**: 기본 인프라 구축 완료
- **Task 6**: 전문가 검색 및 매칭 인터페이스
- **Task 7**: 연결 요청 시스템 (간소화 버전)
- **Task 9**: 알림 시스템 및 대시보드

### 🔧 Supabase 설정 상태

#### 현재 이슈
- Trigger 함수가 작동하지 않아 fallback 메커니즘 구현
- RLS 정책으로 인한 일부 제한 (정상 서비스는 가능)

#### 해결 방법
1. Supabase Dashboard에서 `final-fix-trigger.sql` 실행
2. Fallback 메커니즘이 이미 구현되어 있어 서비스는 정상 작동

### 🎯 핵심 기능
- **역할 기반 인증** - 전문가/조직 구분된 인터페이스
- **전문가 프로필 관리** - 경력, 학력, 자동 해시태그 생성
- **연결 요청 시스템** - 간단한 요청 승인 후 연락처 공유
- **실시간 알림** - 연결 요청 및 상태 변경 알림
- **대시보드** - 역할별 통계 및 요청 현황

### Technical Features
- **Real-time Updates** - Supabase subscriptions for live data
- **Type Safety** - Full TypeScript implementation
- **Responsive Design** - Mobile-first UI with Tailwind CSS
- **Row Level Security** - Secure data access with Supabase RLS
- **File Upload** - Support for documents and portfolio links
- **Multi-stage Matching** - Progressive expert discovery algorithm

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Deployment**: Vercel

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── campaign/         # Campaign management
│   ├── chat/             # Messaging components
│   ├── expert/           # Expert-related components
│   ├── layout/           # Layout components
│   ├── notification/     # Notification components
│   ├── organization/     # Organization components
│   ├── proposal/         # Proposal system
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── utils/                # Helper functions

supabase/
├── migrations/           # Database migration files
└── README.md            # Database documentation
```

## 🛠️ 설치 및 실행

### 1. 환경 변수 설정
`.env.local` 파일 생성:
```bash
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

참고: `.env.example` 파일을 참조하세요

### 2. 의존성 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 브라우저에서 접속
```
http://localhost:3000
```

## 📋 테스트 절차

### 회원가입 테스트
1. 홈페이지에서 "전문가 회원가입" 클릭
2. 필수 정보 입력
3. 회원가입 완료 후 프로필 완성 페이지로 이동

### 연결 요청 테스트
1. 조직 계정으로 로그인
2. 전문가 검색
3. 원하는 전문가에게 연결 요청
4. 전문가가 수락하면 연락처 공유

## 🐛 문제 해결

### "Database error saving new user" 오류
1. `final-fix-trigger.sql` 파일을 Supabase SQL Editor에서 실행
2. 이미 fallback 메커니즘이 구현되어 있어 서비스는 정상 작동

### 빌드 경고
TypeScript 'any' 타입 경고는 무시 가능 (ESLint 설정으로 에러 대신 경고로 처리)

## Database Schema

The platform uses the following main tables:

- **users**: Base user table extending Supabase auth
- **expert_profiles**: Expert user profiles with skills and experience
- **organization_profiles**: Organization profiles with verification
- **campaigns**: Matching requests from organizations
- **proposals**: Expert proposals for campaigns
- **messages**: Chat messages between users
- **notifications**: System notifications

## Development Workflow

1. **Authentication Flow**
   - Users register as either experts or organizations
   - Profile creation follows registration
   - Email verification required

2. **Expert Flow**
   - Complete profile with skills and experience
   - Receive notifications for matching campaigns
   - Submit proposals with budget and timeline
   - Communicate with organizations

3. **Organization Flow**
   - Create campaigns with requirements
   - Review expert proposals
   - Select experts and manage projects
   - Leave reviews after completion

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[License Type]