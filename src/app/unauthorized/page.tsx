export default function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">접근 권한이 없습니다</h1>
        <p className="text-gray-600 mb-6">이 페이지에 접근할 권한이 없거나 세션이 만료되었습니다.</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/auth/login"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            로그인하기
          </a>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            메인으로 이동
          </a>
        </div>
      </div>
    </div>
  )
}

