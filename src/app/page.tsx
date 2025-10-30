'use client'

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Shield,
  Clock,
  MessageSquare,
  Star,
  Building,
  UserCheck,
  Search,
  FileText,
  Handshake,
  Sparkles,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react'
import { useThrottledMouseMove } from '@/hooks/useThrottledMouseMove'
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery'

// Lazy load non-critical sections
const Testimonials = lazy(() => import('@/components/landing/Testimonials'))
const Footer = lazy(() => import('@/components/landing/Footer'))

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()

  // Disable mouse tracking on mobile and for users who prefer reduced motion
  const mousePosition = useThrottledMouseMove({
    throttleMs: 50,
    enabled: !isMobile && !prefersReducedMotion
  })

  // Memoize gradient positions to prevent unnecessary recalculations
  const gradientPositions = useMemo(() => ({
    x: mousePosition.x * 0.02,
    y: mousePosition.y * 0.02
  }), [mousePosition.x, mousePosition.y])

  useEffect(() => {
    setIsVisible(true)

    // Scroll animation observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    // Observe all fade-in elements
    const fadeElements = document.querySelectorAll('.fade-in-up')
    fadeElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Background - Only on desktop without reduced motion */}
      {!isMobile && !prefersReducedMotion && (
        <div className="fixed inset-0 z-0">
          {/* Gradient Orbs */}
          <div
            className="absolute w-96 h-96 bg-gradient-to-r from-blue-200/40 to-purple-200/40 rounded-full blur-3xl animate-pulse will-change-transform"
            style={{
              left: `${gradientPositions.x}px`,
              top: `${gradientPositions.y}px`,
              transform: 'translate3d(0,0,0)' // Force GPU acceleration
            }}
          />
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-bounce will-change-transform" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl animate-pulse will-change-transform" />

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
      )}

      {/* Static background for mobile */}
      {isMobile && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-8 border border-blue-200/50 shadow-lg transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Handshake className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">창업기관과 전문가를 연결하는 플랫폼</span>
          </div>

          {/* Main Heading */}
          <h1 className={`text-5xl md:text-7xl font-black mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-800 bg-clip-text text-transparent">
              필요한 전문가를
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent">
              빠르게 찾아보세요
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            창업지원기관은 <span className="text-blue-600 font-semibold">전문가를 찾고</span>,<br />
            전문가는 <span className="text-purple-600 font-semibold">프로젝트 기회를 발견</span>하는<br />
            <span className="font-semibold">간편한 매칭 플랫폼</span>입니다
          </p>
          
          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center mb-16 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Link href="/auth/register/organization" className="group">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <div className="flex items-center justify-center text-lg font-bold">
                  <Building className="w-5 h-5 mr-2" />
                  기관으로 시작하기
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link href="/auth/register/expert" className="group">
              <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 text-gray-700 rounded-2xl px-8 py-4 hover:bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="flex items-center justify-center text-lg font-bold">
                  <UserCheck className="w-5 h-5 mr-2" />
                  전문가로 시작하기
                </div>
              </div>
            </Link>
          </div>

          {/* Animated Stats */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {[
              { number: "간편한", label: "등록 절차", icon: UserCheck, color: "from-blue-400 to-cyan-400" },
              { number: "투명한", label: "프로필 시스템", icon: FileText, color: "from-purple-400 to-pink-400" },
              { number: "직접", label: "소통 가능", icon: MessageSquare, color: "from-green-400 to-emerald-400" },
              { number: "안전한", label: "제안서 관리", icon: Shield, color: "from-yellow-400 to-orange-400" }
            ].map((stat, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:border-gray-300 hover:bg-white hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 border border-blue-200/50 shadow-lg">
              <Star className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">StartupMatch의 핵심 기능</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                필요한 기능을
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                간편하게 사용하세요
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              캠페인 생성부터 전문가 발굴, 제안서 관리까지 한 곳에서 해결하세요
            </p>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 fade-in-up">
            {[
              {
                icon: Search,
                title: "캠페인 생성 & 관리",
                description: "필요한 전문가 유형, 예산, 기간 등을 설정하여 캠페인을 쉽게 생성하고 관리할 수 있습니다",
                gradient: "from-blue-500 to-cyan-500",
                delay: "delay-100"
              },
              {
                icon: Users,
                title: "전문가 프로필 검색",
                description: "다양한 분야의 전문가 프로필을 키워드, 지역, 전문분야로 검색하고 비교할 수 있습니다",
                gradient: "from-purple-500 to-pink-500",
                delay: "delay-200"
              },
              {
                icon: FileText,
                title: "제안서 송수신",
                description: "전문가는 관심있는 캠페인에 제안서를 제출하고, 기관은 받은 제안서를 검토할 수 있습니다",
                gradient: "from-green-500 to-emerald-500",
                delay: "delay-300"
              },
              {
                icon: MessageSquare,
                title: "직접 소통",
                description: "메시지 기능으로 전문가와 기관이 직접 소통하며 프로젝트 세부사항을 논의할 수 있습니다",
                gradient: "from-yellow-500 to-orange-500",
                delay: "delay-400"
              },
              {
                icon: Shield,
                title: "안전한 정보 관리",
                description: "제안서, 계약서, 프로젝트 자료를 체계적으로 보관하고 필요할 때 쉽게 찾을 수 있습니다",
                gradient: "from-indigo-500 to-purple-500",
                delay: "delay-500"
              },
              {
                icon: CheckCircle2,
                title: "프로젝트 진행 현황",
                description: "대시보드에서 진행중인 캠페인, 제안서, 매칭 현황을 한눈에 확인할 수 있습니다",
                gradient: "from-pink-500 to-rose-500",
                delay: "delay-600"
              }
            ].map((feature, index) => (
              <div key={index} className={`group cursor-pointer transition-all duration-700 ${feature.delay}`}>
                <div className="relative h-full">
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 rounded-3xl`} />
                  
                  {/* Card */}
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 hover:border-gray-300 hover:bg-white hover:shadow-2xl transition-all duration-500 h-full group-hover:scale-105">
                    {/* Icon */}
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent group-hover:from-gray-900 group-hover:to-gray-700 transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {feature.description}
                    </p>
                    
                    {/* Hover Arrow */}
                    <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowRight className={`w-5 h-5 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                3단계로 완성되는
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                완벽한 매칭
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 fade-in-up">
            {[
              {
                step: "01",
                title: "AI 분석",
                description: "프로젝트 요구사항을 AI가 자동 분석하고 최적의 전문가 풀을 선별합니다",
                icon: Search
              },
              {
                step: "02", 
                title: "스마트 매칭",
                description: "머신러닝 알고리즘이 호환성, 경험, 평점을 종합하여 최고의 매칭을 제안합니다",
                icon: Zap
              },
              {
                step: "03",
                title: "프로젝트 시작",
                description: "AI 모니터링과 실시간 피드백으로 프로젝트 성공을 지속적으로 지원합니다",
                icon: Handshake
              }
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                성공 사례가
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                증명합니다
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 fade-in-up">
            {[
              {
                name: "김대표",
                company: "테크 스타트업 A",
                content: "AI 매칭으로 2시간 만에 완벽한 CTO를 찾았습니다. 덕분에 시리즈 A 투자 유치에 성공했어요!",
                rating: 5,
                avatar: "👨‍💼"
              },
              {
                name: "이매니저", 
                company: "창업지원센터 B",
                content: "기존 방식보다 매칭 성공률이 3배 향상되었습니다. 스타트업들의 만족도가 정말 높아요.",
                rating: 5,
                avatar: "👩‍💼"
              },
              {
                name: "박전문가",
                company: "AI 컨설턴트",
                content: "플랫폼을 통해 정말 의미있는 프로젝트들을 만나고 있습니다. 수익도 2배 이상 증가했어요!",
                rating: 5,
                avatar: "👨‍🔬"
              }
            ].map((testimonial, index) => (
              <div key={index} className="group">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 hover:border-gray-300 hover:bg-white hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
          
          <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-12 border border-gray-200/50 shadow-2xl">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full mb-8 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-700">완전 무료로 시작</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                지금 바로
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI 매칭을 경험하세요
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              수천 개의 성공 사례가 증명하는 AI 매칭 시스템을<br />
              지금 무료로 체험해보세요
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth/register/expert" className="group">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-center text-xl font-bold">
                    <Sparkles className="w-6 h-6 mr-3" />
                    전문가로 시작하기
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
              <Link href="/auth/register/organization" className="group">
                <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 text-gray-700 rounded-2xl px-12 py-6 hover:bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-center text-xl font-bold">
                    <Building className="w-6 h-6 mr-3" />
                    기관으로 시작하기
                  </div>
                </div>
              </Link>
            </div>
            
            <div className="flex justify-center items-center space-x-8 mt-8 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                신용카드 불필요
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                즉시 사용 가능
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                언제든 해지 가능
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="font-black text-2xl text-white">
                  StartupMatch
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-md">
                AI 기반 스마트 매칭으로 창업 성공을 위한 최고의 전문가를 연결하는 혁신적인 플랫폼입니다.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white mb-6">서비스</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link href="/experts" className="hover:text-white transition-colors">전문가 찾기</Link></li>
                <li><Link href="/campaigns" className="hover:text-white transition-colors">프로젝트 등록</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">AI 매칭 시스템</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-6">회사</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link href="/about" className="hover:text-white transition-colors">회사소개</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">문의하기</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">채용안내</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2024 StartupMatch. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">이용약관</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}