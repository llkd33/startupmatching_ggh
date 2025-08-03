export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            이용약관
          </h1>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">제1조 (목적)</h2>
            <p className="mb-6">
              이 약관은 스타트업 매칭 플랫폼(이하 "서비스")이 제공하는 서비스의 이용조건 및 절차, 회사와 이용자 간의 권리, 의무, 책임사항 등을 규정함을 목적으로 합니다.
            </p>

            <h2 className="text-xl font-semibold mb-4">제2조 (정의)</h2>
            <ul className="list-disc pl-6 mb-6">
              <li>"서비스"란 스타트업 지원기관과 전문가를 연결하는 매칭 플랫폼을 의미합니다.</li>
              <li>"이용자"란 이 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
              <li>"전문가"란 특정 분야의 전문 지식을 보유한 개인 회원을 의미합니다.</li>
              <li>"조직"란 창업 지원을 필요로 하는 기관 회원을 의미합니다.</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">제3조 (약관의 효력 및 변경)</h2>
            <p className="mb-6">
              이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 필요하다고 인정되는 경우 이 약관을 변경할 수 있으며, 약관이 변경된 경우 지체없이 공지합니다.
            </p>

            <h2 className="text-xl font-semibold mb-4">제4조 (서비스의 제공)</h2>
            <ul className="list-disc pl-6 mb-6">
              <li>전문가와 조직 간의 매칭 서비스</li>
              <li>프로필 관리 및 검색 기능</li>
              <li>연결 요청 및 승인 시스템</li>
              <li>실시간 알림 서비스</li>
              <li>기타 회사가 정하는 서비스</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">제5조 (회원가입)</h2>
            <p className="mb-6">
              서비스 이용을 위해서는 회원가입이 필요하며, 정확한 정보를 제공해야 합니다. 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.
            </p>

            <h2 className="text-xl font-semibold mb-4">제6조 (개인정보보호)</h2>
            <p className="mb-6">
              회사는 이용자의 개인정보를 보호하기 위해 개인정보보호정책을 수립하고 이를 준수합니다. 자세한 내용은 개인정보 처리방침을 참조하시기 바랍니다.
            </p>

            <p className="text-sm text-gray-500 mt-8">
              최종 업데이트: 2024년 8월 4일
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}