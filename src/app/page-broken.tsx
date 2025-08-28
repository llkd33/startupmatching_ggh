'use client'

import { } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import Header from '@/components/layout/Header'
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Zap, 
  Shield,
  TrendingUp,
  Award,
  Clock,
  MessageSquare,
  Star,
  Building,
  UserCheck,
  Search,
  FileText,
  Handshake
} from 'lucide-react'

import Testimonials from '@/components/home/Testimonials'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* <Header /> */}
      <div style={{ backgroundColor: 'green', padding: '10px' }}>
        <h3>Page is loading - Header is disabled for testing</h3>
      </div>
      
      {/* Hero Section with Animation */}
      <section id="home" className="relative pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 opacity-70"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-50 rounded-full mb-4 sm:mb-6">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mr-2" />
              <span className="text-xs sm:text-sm font-medium text-blue-700">국내 1위 전문가 매칭 플랫폼</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight px-4 sm:px-0">
              창업 성공을 위한<br className="sm:hidden" />
              <span className="hidden sm:inline"><br /></span>
              최고의 전문가를 만나보세요
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-6 sm:px-4">
              5,000명 이상의 검증된 전문가와<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>1,200개 창업지원기관을 연결합니다
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
              <Link href="/auth/register?type=organization" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  기관으로 시작하기
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/register?type=expert" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-xl hover:bg-gray-50">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  전문가로 시작하기
                </Button>
              </Link>
            </div>

            {/* Stats - Improved mobile layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
              <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">5,000+</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">검증된 전문가</div>
              </div>
              <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">1,200+</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">파트너 기관</div>
              </div>
              <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">98%</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">매칭 성공률</div>
              </div>
              <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">24시간</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">평균 매칭 시간</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section with Icons */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">왜 StartupMatch인가?</h2>
            <p className="text-xl text-gray-600">빠르고, 정확하고, 신뢰할 수 있는 매칭 서비스</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">전문가 검색</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  프로젝트 요구사항에 맞는 전문가를 검색하고, 전문가가 직접 프로젝트를 검토하여 매칭이 성사됩니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">검증된 전문가</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  학력, 경력, 자격증을 철저히 검증하고 실제 프로젝트 수행 이력을 확인한 전문가만 활동합니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-green-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">신속한 매칭</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  평균 24시간 이내 매칭 완료, 긴급 프로젝트는 2시간 내 전문가 연결이 가능합니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">품질 보증</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  프로젝트 완료 후 만족도 평가 시스템으로 지속적인 품질 관리를 수행합니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-red-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">실시간 소통</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  프로젝트 진행 상황을 실시간으로 확인하고 전문가와 직접 소통할 수 있습니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-indigo-50 to-white">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">성과 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  프로젝트별 상세 리포트와 ROI 분석으로 투자 대비 성과를 명확히 확인합니다
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - Improved */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">간단한 3단계 프로세스</h2>
            <p className="text-xl text-gray-600">복잡한 절차 없이 빠르게 시작하세요</p>
          </div>

          {/* For Organizations */}
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Building className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-2xl font-semibold">창업지원기관</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Search className="w-8 h-8 text-blue-600 mb-3" />
                    <CardTitle>요구사항 입력</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">프로젝트 내용, 필요 전문분야, 예산을 간단히 입력합니다</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Users className="w-8 h-8 text-blue-600 mb-3" />
                    <CardTitle>전문가 매칭</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">요구사항에 맞는 전문가를 검색하고, 전문가의 승인을 받아 매칭을 진행합니다</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Handshake className="w-8 h-8 text-blue-600 mb-3" />
                    <CardTitle>프로젝트 시작</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">선택한 전문가와 계약을 체결하고 프로젝트를 진행합니다</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* For Experts */}
          <div>
            <div className="flex items-center mb-8">
              <UserCheck className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-2xl font-semibold">전문가</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <FileText className="w-8 h-8 text-purple-600 mb-3" />
                    <CardTitle>프로필 등록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">전문분야, 경력, 포트폴리오를 등록하여 매력적인 프로필을 완성합니다</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Search className="w-8 h-8 text-purple-600 mb-3" />
                    <CardTitle>프로젝트 탐색</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">등록된 프로젝트를 직접 검색하고 관심있는 프로젝트에 지원합니다</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
                <Card className="pt-8 h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Award className="w-8 h-8 text-purple-600 mb-3" />
                    <CardTitle>프로젝트 수행</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">매칭된 기관과 프로젝트를 진행하고 평가를 통해 신뢰도를 높입니다</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section - Free Service */}
      <section id="cta" className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            무료로 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            창업 성공을 위한 전문가 매칭, 지금 바로 경험해보세요
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-lg">
                지금 시작하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="flex justify-center items-center space-x-8 text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              무료 회원가입
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              언제든 해지 가능
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
                <span className="font-bold text-xl text-white">StartupMatch</span>
              </div>
              <p className="text-sm">
                창업 성공을 위한 최고의 파트너
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/experts" className="hover:text-white transition">전문가 찾기</Link></li>
                <li><Link href="/campaigns" className="hover:text-white transition">프로젝트 등록</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition">회사소개</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">문의하기</Link></li>
                <li><Link href="/careers" className="hover:text-white transition">채용안내</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition">이용약관</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">개인정보처리방침</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 StartupMatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
