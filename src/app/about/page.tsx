'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, Users, Shield, Target, Award, Globe } from 'lucide-react'

export default function AboutPage() {
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
              회사소개
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 border border-blue-200/50 shadow-lg">
            <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">AI 혁신 기업</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              창업 생태계를
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              혁신하는 AI 플랫폼
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            StartupMatch는 AI 기술로 창업가와 전문가를 연결하여
            대한민국 창업 생태계의 성공률을 혁신적으로 높이고 있습니다.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                우리의 미션
              </h3>
              <p className="text-gray-600 leading-relaxed">
                AI 기술을 통해 창업가와 전문가를 완벽하게 매칭하여,
                모든 스타트업이 성공할 수 있는 기회를 제공합니다.
                우리는 혁신적인 매칭 시스템으로 창업 성공률을 높이고,
                지속 가능한 창업 생태계를 만들어갑니다.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                우리의 비전
              </h3>
              <p className="text-gray-600 leading-relaxed">
                2030년까지 아시아 최대의 AI 기반 창업 지원 플랫폼으로 성장하여,
                100만 개의 스타트업 성공을 지원합니다.
                글로벌 시장으로 확장하여 전 세계 창업가들에게
                최고의 전문가 매칭 서비스를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            핵심 가치
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "신뢰",
                description: "블록체인 기반 검증 시스템으로 투명하고 신뢰할 수 있는 서비스를 제공합니다"
              },
              {
                icon: Users,
                title: "연결",
                description: "AI 기술로 최적의 전문가와 창업가를 연결하여 시너지를 창출합니다"
              },
              {
                icon: Award,
                title: "혁신",
                description: "지속적인 기술 혁신으로 창업 생태계의 새로운 표준을 만들어갑니다"
              }
            ].map((value, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all">
                <value.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-3">{value.title}</h4>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-6">함께 만들어가는 팀</h3>
            <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
              AI 전문가, 창업 경험자, 개발자들이 모여
              창업 생태계를 혁신하는 플랫폼을 만들고 있습니다.
            </p>
            <Link href="/careers" className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl font-medium hover:shadow-lg transition-all">
              팀에 합류하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}