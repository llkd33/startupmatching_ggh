export default function Home() {
  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: 'black', fontSize: '2rem', marginBottom: '1rem' }}>
        StartupMatch - 전문가 매칭 플랫폼
      </h1>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: 'black', marginBottom: '10px' }}>서비스 소개</h2>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          창업지원기관과 전문가를 연결하는 스마트 매칭 플랫폼입니다.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a 
          href="/auth/register?type=organization" 
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '6px',
            display: 'inline-block'
          }}
        >
          기관으로 시작하기
        </a>
        
        <a 
          href="/auth/register?type=expert" 
          style={{ 
            backgroundColor: '#6b7280', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '6px',
            display: 'inline-block'
          }}
        >
          전문가로 시작하기
        </a>
      </div>

      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: 'black', marginBottom: '10px' }}>🔍 전문가 검색</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            프로젝트 요구사항에 맞는 전문가를 검색하고 매칭합니다.
          </p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: 'black', marginBottom: '10px' }}>✅ 검증된 전문가</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            학력, 경력, 자격증을 철저히 검증한 전문가만 활동합니다.
          </p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: 'black', marginBottom: '10px' }}>⚡ 신속한 매칭</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            평균 24시간 이내 매칭 완료, 긴급 프로젝트는 2시간 내 연결.
          </p>
        </div>
      </div>

      <footer style={{ marginTop: '60px', padding: '20px', backgroundColor: '#1f2937', color: 'white', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', margin: 0 }}>
          © 2024 StartupMatch. All rights reserved.
        </p>
      </footer>
    </div>
  )
}