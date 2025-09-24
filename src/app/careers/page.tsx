'use client'

import Link from 'next/link'
import { ArrowLeft, Briefcase, Users, Rocket, Heart, Globe, Zap } from 'lucide-react'

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">홈으로</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              채용안내
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full mb-6 border border-green-200">
            <Rocket className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700">We&apos;re Hiring!</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              함께 혁신을
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              만들어갈 동료를 찾습니다
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            StartupMatch는 AI 기술로 창업 생태계를 혁신하고 있습니다.
            열정적인 당신과 함께 더 큰 꿈을 실현하고 싶습니다.
          </p>
        </div>
      </section>

      {/* Culture & Benefits */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            우리가 일하는 방식
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "자율과 책임",
                description: "자율적인 업무 환경에서 책임감 있게 일합니다"
              },
              {
                icon: Rocket,
                title: "빠른 성장",
                description: "스타트업의 속도로 함께 성장합니다"
              },
              {
                icon: Heart,
                title: "워라밸",
                description: "일과 삶의 균형을 중요하게 생각합니다"
              },
              {
                icon: Globe,
                title: "글로벌 마인드",
                description: "세계를 무대로 하는 서비스를 만듭니다"
              },
              {
                icon: Zap,
                title: "혁신 문화",
                description: "새로운 도전을 두려워하지 않습니다"
              },
              {
                icon: Briefcase,
                title: "전문성",
                description: "각자의 전문성을 존중하고 협업합니다"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            채용 중인 포지션
          </h3>
          
          <div className="space-y-6">
            {[
              {
                title: "Senior Frontend Developer",
                team: "Engineering",
                type: "정규직",
                location: "서울 / Remote",
                description: "React, Next.js를 활용한 프론트엔드 개발"
              },
              {
                title: "AI/ML Engineer",
                team: "AI Team",
                type: "정규직",
                location: "서울",
                description: "머신러닝 모델 개발 및 최적화"
              },
              {
                title: "Product Designer",
                team: "Design",
                type: "정규직",
                location: "서울 / Remote",
                description: "사용자 중심의 UI/UX 디자인"
              },
              {
                title: "Business Developer",
                team: "Business",
                type: "정규직",
                location: "서울",
                description: "파트너십 구축 및 사업 개발"
              }
            ].map((job, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h4>
                    <p className="text-gray-600 mb-3">{job.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                        {job.team}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">
                        {job.type}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {job.location}
                      </span>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors transform rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-8 text-center">복지 혜택</h3>
            <div className="grid md:grid-cols-2 gap-6 text-white/90">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>유연한 근무 시간 및 재택 근무</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>최신 장비 지원 (맥북 프로 등)</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>교육 및 컨퍼런스 참가 지원</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>건강검진 및 의료비 지원</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>점심 식대 및 간식 제공</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3 flex-shrink-0" />
                <span>스톡옵션 제공</span>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <a href="mailto:careers@startupmatch.kr" className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:shadow-lg transition-all">
                지원하기
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}