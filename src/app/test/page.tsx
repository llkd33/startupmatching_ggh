'use client'

export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>테스트 페이지</h1>
      <p>이 페이지가 보인다면 Next.js는 정상 작동 중입니다.</p>
      <p>현재 시간: {new Date().toLocaleString()}</p>
    </div>
  )
}