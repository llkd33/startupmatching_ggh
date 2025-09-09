'use client'

import Link from 'next/link'
import { ArrowLeft, Search, Filter, Users, Star, Award, Briefcase } from 'lucide-react'

export default function ExpertsPage() {
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
              전문가 찾기
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              5,000+ 검증된
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              전문가 네트워크
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            AI가 분석한 최적의 전문가를 만나보세요
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-2 flex items-center">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="전문 분야, 기술, 이름으로 검색..."
                className="flex-1 px-4 py-3 outline-none"
              />
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all">
                검색
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, number: "5,000+", label: "전문가" },
              { icon: Star, number: "4.8", label: "평균 평점" },
              { icon: Award, number: "98%", label: "매칭 성공률" },
              { icon: Briefcase, number: "15,000+", label: "완료된 프로젝트" }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 text-center">
                <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <Filter className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              전문가 목록이 곧 준비됩니다
            </h3>
            <p className="text-gray-600 mb-8">
              AI 매칭 시스템이 당신에게 최적화된 전문가를 찾아드릴 예정입니다
            </p>
            <Link href="/auth/register" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              지금 시작하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}