# Supabase RLS Security Audit Report

## 현재 상태 분석

### 1. 테이블별 RLS 정책 현황

#### Users 테이블
- ✅ RLS 활성화됨
- ⚠️ **보안 이슈**: 
  - Admin 정책이 너무 광범위함 (모든 사용자 데이터 접근 가능)
  - DELETE 정책 누락
  - 민감한 정보(email, phone) 보호 부족

#### Expert Profiles 테이블
- ✅ RLS 활성화됨
- ⚠️ **보안 이슈**:
  - 모든 사용자가 전체 프로필 조회 가능 (개인정보 노출)
  - hourly_rate 등 민감한 정보 무제한 공개

#### Organization Profiles 테이블
- ✅ RLS 활성화됨
- ⚠️ **보안 이슈**:
  - business_number 등 민감한 비즈니스 정보 무제한 공개
  - is_verified 필드 조작 가능성

#### Connection Requests 테이블
- ✅ RLS 활성화됨
- ✅ 비교적 적절한 정책 구성
- ⚠️ **개선 필요**: 
  - DELETE 정책 누락
  - status 변경 권한 제한 필요

#### Notifications 테이블
- ✅ RLS 활성화됨
- ⚠️ **보안 이슈**:
  - INSERT 정책이 너무 관대함 (WITH CHECK (true))
  - 스팸 알림 가능성

#### Messages 테이블
- ✅ RLS 활성화됨
- ✅ 연결 상태 확인 로직 포함
- ⚠️ **개선 필요**:
  - 메시지 수정/삭제 정책 누락

### 2. 주요 보안 취약점

1. **과도한 데이터 노출**
   - 프로필 정보가 인증되지 않은 사용자에게도 완전 공개
   - 민감한 비즈니스 정보 보호 부족

2. **Admin 권한 남용 가능성**
   - Admin 역할 검증이 단순 role 체크에만 의존
   - Audit log는 있으나 실제 추적 메커니즘 부족

3. **DELETE 정책 부재**
   - 대부분 테이블에 DELETE 정책 누락
   - 데이터 무단 삭제 위험

4. **Service Role 남용 가능성**
   - SECURITY DEFINER 함수들의 권한 관리 미흡

## 보안 강화 방안

### Phase 1: 즉시 적용 (Critical)

#### 1.1 민감한 정보 보호
```sql
-- Expert profiles 공개 정보 제한
CREATE POLICY "Public can view limited expert info" ON public.expert_profiles
    FOR SELECT 
    TO anon
    USING (is_available = true);

-- 인증된 사용자만 상세 정보 조회
CREATE POLICY "Authenticated can view full expert profiles" ON public.expert_profiles
    FOR SELECT 
    TO authenticated
    USING (true);
```

#### 1.2 Admin 권한 강화
```sql
-- Admin 역할 검증 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND created_at < NOW() - INTERVAL '1 hour' -- 신규 admin 즉시 권한 방지
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.3 DELETE 정책 추가
```sql
-- 각 테이블에 적절한 DELETE 정책 추가
CREATE POLICY "Users can delete own data with verification" ON public.users
    FOR DELETE USING (
        auth.uid() = id 
        AND NOT EXISTS (
            SELECT 1 FROM public.connection_requests 
            WHERE status = 'approved' 
            AND (
                organization_id IN (SELECT id FROM public.organization_profiles WHERE user_id = auth.uid())
                OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
            )
        )
    );
```

### Phase 2: 단기 개선 (1-2주)

#### 2.1 Rate Limiting 구현
```sql
-- API 호출 추적 테이블
CREATE TABLE public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint, window_start)
);

-- Rate limiting 함수
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT SUM(request_count) INTO v_count
    FROM public.api_rate_limits
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > NOW() - INTERVAL '1 hour';
    
    RETURN COALESCE(v_count, 0) < p_max_requests;
END;
$$ LANGUAGE plpgsql;
```

#### 2.2 데이터 암호화
- 민감한 필드 (phone, business_number) 암호화
- pgcrypto extension 활용

#### 2.3 Audit Trail 강화
```sql
-- 모든 중요 작업 로깅
CREATE OR REPLACE FUNCTION log_data_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(OLD),
        to_jsonb(NEW),
        current_setting('request.headers')::json->>'x-forwarded-for',
        current_setting('request.headers')::json->>'user-agent'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: 장기 개선 (2-4주)

#### 3.1 Zero Trust Architecture
- 모든 요청에 대한 다단계 검증
- JWT 토큰 만료 시간 단축
- Refresh token rotation 구현

#### 3.2 데이터 분류 및 접근 제어
- 데이터 민감도 레벨 정의 (Public, Internal, Confidential, Restricted)
- 레벨별 접근 정책 구현

#### 3.3 보안 모니터링
- 이상 패턴 감지
- 자동 알림 시스템
- 정기 보안 감사

## 구현 우선순위

1. **즉시 (오늘)**: 
   - 민감한 정보 노출 차단
   - DELETE 정책 추가
   - Admin 권한 검증 강화

2. **이번 주**:
   - Rate limiting 기본 구현
   - Audit trail 개선
   - 입력 검증 강화

3. **다음 2주**:
   - 암호화 구현
   - 보안 모니터링 시스템
   - 침투 테스트 수행

## 테스트 계획

### Unit Tests
- 각 RLS 정책에 대한 권한 테스트
- 경계값 테스트
- 예외 상황 테스트

### Integration Tests
- 실제 사용 시나리오 기반 테스트
- 권한 에스컬레이션 시도
- SQL injection 테스트

### Penetration Testing
- OWASP Top 10 기반 테스트
- 자동화 도구 활용 (SQLMap, Burp Suite)
- 수동 테스트 병행

## 결론

현재 Supabase RLS 정책은 기본적인 구조는 갖추고 있으나, 여러 보안 취약점이 존재합니다. 
특히 민감한 정보의 과도한 노출과 DELETE 정책 부재는 즉시 해결이 필요합니다.
제안된 3단계 접근법을 통해 체계적으로 보안을 강화할 수 있습니다.