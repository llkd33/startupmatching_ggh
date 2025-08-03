import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Users, Zap, Shield } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">
            창업지원기관과 전문가를 연결하는
            <span className="text-primary"> 스마트 매칭 플랫폼</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI 기반 매칭 시스템으로 최적의 전문가를 찾아드립니다
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register?type=expert">
              <Button size="lg">전문가로 시작하기</Button>
            </Link>
            <Link href="/auth/register?type=organization">
              <Button size="lg" variant="outline">기관으로 시작하기</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>스마트 매칭</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  키워드와 전문분야를 기반으로 최적의 전문가를 자동으로 매칭합니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>검증된 전문가</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  이력과 경력이 검증된 각 분야 전문가들이 등록되어 있습니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Briefcase className="w-10 h-10 text-primary mb-2" />
                <CardTitle>다양한 서비스</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  멘토링, 투자 매칭, 용역 대행 등 다양한 형태의 서비스를 지원합니다
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>안전한 거래</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  검증된 기관과 전문가 간의 안전한 거래를 보장합니다
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">이용 방법</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">창업지원기관</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">1. 캠페인 생성</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      필요한 전문가 요구사항과 예산을 입력하여 캠페인을 생성합니다
                    </CardDescription>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2. 제안서 검토</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      매칭된 전문가들의 제안서를 검토하고 비교합니다
                    </CardDescription>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">3. 전문가 선택</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      최적의 전문가를 선택하고 프로젝트를 진행합니다
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">전문가</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">1. 프로필 등록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      전문분야와 경력사항을 등록하고 프로필을 완성합니다
                    </CardDescription>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2. 매칭 알림</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      전문분야에 맞는 캠페인이 등록되면 알림을 받습니다
                    </CardDescription>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">3. 제안서 제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      캠페인에 대한 제안서를 작성하여 제출합니다
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            수많은 창업지원기관과 전문가들이 여러분을 기다리고 있습니다
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary">
              무료로 시작하기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}