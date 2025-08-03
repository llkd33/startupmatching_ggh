export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            개인정보 처리방침
          </h1>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. 개인정보의 처리목적</h2>
            <p className="mb-6">
              스타트업 매칭 플랫폼은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>회원 가입 및 관리</li>
              <li>서비스 제공</li>
              <li>매칭 서비스 제공</li>
              <li>고객 상담 및 불만 처리</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">2. 개인정보의 처리 및 보유기간</h2>
            <p className="mb-6">
              개인정보는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 처리·보유합니다.
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>회원 정보: 회원 탈퇴시까지 (단, 관련 법령에 따라 보존이 필요한 경우 해당 기간)</li>
              <li>서비스 이용 기록: 3년</li>
              <li>결제 정보: 5년</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">3. 처리하는 개인정보의 항목</h2>
            <ul className="list-disc pl-6 mb-6">
              <li>필수항목: 이메일, 이름, 전화번호, 역할(전문가/조직)</li>
              <li>선택항목: 프로필 사진, 경력사항, 학력사항, 자기소개</li>
              <li>자동수집: IP주소, 쿠키, 방문일시, 서비스 이용기록</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="mb-6">
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
            </p>

            <h2 className="text-xl font-semibold mb-4">5. 개인정보 처리의 위탁</h2>
            <p className="mb-6">
              원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>위탁받는 자: Supabase (데이터베이스 서비스)</li>
              <li>위탁하는 업무의 내용: 회원정보 저장 및 관리</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">6. 정보주체의 권리·의무 및 행사방법</h2>
            <p className="mb-6">
              정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>개인정보 처리현황 통지요구</li>
              <li>개인정보 열람요구</li>
              <li>개인정보 정정·삭제요구</li>
              <li>개인정보 처리정지요구</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">7. 개인정보 보호책임자</h2>
            <p className="mb-6">
              개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>

            <p className="text-sm text-gray-500 mt-8">
              최종 업데이트: 2024년 8월 4일<br/>
              개인정보 처리방침 문의: contact@startupmatching.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}