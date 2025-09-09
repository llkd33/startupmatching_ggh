'use client'

import Link from 'next/link'
import { ArrowLeft, Plus, Briefcase, Target, Clock, TrendingUp } from 'lucide-react'

export default function CampaignsPage() {
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
              프로젝트 캠페인
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              프로젝트와
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              전문가를 연결합니다
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            AI 매칭으로 최적의 전문가를 2시간 내에 찾아드립니다
          </p>
          
          {/* CTA Button */}
          <Link href="/dashboard/campaigns/create" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all">
            <Plus className="w-5 h-5 mr-2" />
            새 캠페인 만들기
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Briefcase, number: "1,200+", label: "활성 캠페인" },
              { icon: Target, number: "98%", label: "매칭 성공률" },
              { icon: Clock, number: "2시간", label: "평균 매칭 시간" },
              { icon: TrendingUp, number: "3.5x", label: "ROI 향상" }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 text-center">
                <stat.icon className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            캠페인 진행 과정
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "캠페인 등록",
                description: "프로젝트 요구사항과 예산을 입력하면 AI가 자동으로 분석합니다"
              },
              {
                step: "2",
                title: "AI 매칭",
                description: "머신러닝이 최적의 전문가를 찾아 2시간 내에 제안합니다"
              },
              {
                step: "3",
                title: "프로젝트 시작",
                description: "전문가와 연결되어 바로 프로젝트를 시작할 수 있습니다"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              캠페인 목록이 곧 준비됩니다
            </h3>
            <p className="text-gray-600 mb-8">
              AI 매칭 시스템으로 프로젝트를 성공으로 이끌어보세요
            </p>
            <Link href="/auth/register?type=organization" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              기관으로 시작하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}