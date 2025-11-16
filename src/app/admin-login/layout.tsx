// Force dynamic rendering for admin login page
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Admin login layout - 부모 admin layout의 인증 체크를 완전히 우회
// 이 layout은 admin/layout.tsx를 무시하고 독립적으로 렌더링됨
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 로그인 페이지는 사이드바나 네비게이션 없이 깔끔하게 렌더링
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}

