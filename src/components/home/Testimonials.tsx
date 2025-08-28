"use client"

import { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import { Star } from 'lucide-react'

export default function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const testimonials = [
    { name: "김대표", company: "스타트업 A", content: "빠르고 정확한 전문가 매칭으로 프로젝트를 성공적으로 완료했습니다.", rating: 5 },
    { name: "이매니저", company: "창업지원센터 B", content: "다양한 분야의 검증된 전문가들을 쉽게 찾을 수 있어 좋습니다.", rating: 5 },
    { name: "박전문가", company: "컨설팅 전문가", content: "좋은 프로젝트를 지속적으로 연결받을 수 있어 만족합니다.", rating: 5 }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="testimonials" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">고객 후기</h2>
          <p className="text-xl text-gray-600">실제 사용자들의 생생한 경험</p>
        </div>

        <Card className="p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
            ))}
          </div>
          <p className="text-lg text-center mb-6 italic">
            "{testimonials[activeTestimonial].content}"
          </p>
          <div className="text-center">
            <p className="font-semibold">{testimonials[activeTestimonial].name}</p>
            <p className="text-gray-600">{testimonials[activeTestimonial].company}</p>
          </div>
          <div className="flex justify-center mt-6 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${index === activeTestimonial ? 'bg-blue-600' : 'bg-gray-300'}`}
                onClick={() => setActiveTestimonial(index)}
                aria-label={`후기 ${index + 1} 보기`}
              />
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

