'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, MessageSquare, Send, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toast-custom'
import { escapeHtml } from '@/lib/html-escape'

const SUPPORT_EMAIL = 'support@startupmatch.kr'

type ContactFormState = {
  name: string
  email: string
  category: string
  message: string
}

const INITIAL_STATE: ContactFormState = {
  name: '',
  email: '',
  category: '일반 문의',
  message: ''
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)

  const updateField = <K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('이름, 이메일, 메시지는 필수 입력 항목입니다.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      toast.error('올바른 이메일 주소를 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const safeMessage = escapeHtml(form.message).replace(/\n/g, '<br/>')
      const html = `
        <h2>문의 유형: ${escapeHtml(form.category)}</h2>
        <p><strong>이름:</strong> ${escapeHtml(form.name)}</p>
        <p><strong>이메일:</strong> ${escapeHtml(form.email)}</p>
        <p><strong>메시지:</strong></p>
        <p>${safeMessage}</p>
      `

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: SUPPORT_EMAIL,
          subject: `[문의] ${form.category} - ${form.name}`,
          html
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        if (data?.skipped) {
          toast.success('문의가 접수되었습니다. 곧 답변드리겠습니다.')
          setForm(INITIAL_STATE)
          return
        }
        throw new Error(data?.error || '문의 전송에 실패했습니다.')
      }

      toast.success('문의가 성공적으로 전송되었습니다.', '24시간 내에 답변드리겠습니다.')
      setForm(INITIAL_STATE)
    } catch (err) {
      const message = err instanceof Error ? err.message : '문의 전송 중 오류가 발생했습니다.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

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
              문의하기
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              무엇을
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              도와드릴까요?
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            궁금한 점이 있으시면 언제든지 문의해주세요.
            전문 상담팀이 24시간 내에 답변드립니다.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Mail,
                title: "이메일",
                content: "support@startupmatch.kr",
                description: "24시간 내 답변"
              },
              {
                icon: Phone,
                title: "전화",
                content: "02-1234-5678",
                description: "평일 09:00 - 18:00"
              },
              {
                icon: MapPin,
                title: "오피스",
                content: "서울시 강남구",
                description: "방문 상담 가능"
              }
            ].map((contact, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <contact.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{contact.title}</h3>
                <p className="text-blue-600 font-medium mb-2">{contact.content}</p>
                <p className="text-gray-600 text-sm">{contact.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              문의 남기기
            </h3>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-2">
                    이름 *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-category" className="block text-sm font-medium text-gray-700 mb-2">
                  문의 유형 *
                </label>
                <select
                  id="contact-category"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option>일반 문의</option>
                  <option>기술 지원</option>
                  <option>파트너십 제안</option>
                  <option>기타</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">
                  메시지 *
                </label>
                <textarea
                  id="contact-message"
                  rows={6}
                  required
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="문의하실 내용을 자세히 적어주세요..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    문의 보내기
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            자주 묻는 질문
          </h3>
          <div className="space-y-4">
            {[
              {
                question: "StartupMatch는 무료인가요?",
                answer: "기본 매칭 서비스는 무료로 이용 가능하며, 프리미엄 기능은 별도 요금제가 적용됩니다."
              },
              {
                question: "매칭은 얼마나 걸리나요?",
                answer: "AI 매칭 시스템을 통해 평균 2시간 내에 최적의 전문가를 찾아드립니다."
              },
              {
                question: "전문가 검증은 어떻게 하나요?",
                answer: "블록체인 기반 검증 시스템으로 학력, 경력, 프로젝트 이력을 투명하게 검증합니다."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all">
                <div className="flex items-start">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
