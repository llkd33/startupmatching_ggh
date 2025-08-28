import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-4">
            <ShieldX className="w-16 h-16 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근이 거부되었습니다</h1>
          
          <p className="text-gray-600 mb-6">이 페이지에 접근할 권한이 없습니다. 관리자 권한이 필요합니다.</p>
          
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              대시보드로 이동
            </Link>
            
            <Link
              href="/"
              className="block w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
