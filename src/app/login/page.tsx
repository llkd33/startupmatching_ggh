import { redirect } from 'next/navigation'

export default function LoginPage() {
  // 통일된 로그인 경로로 리다이렉트
  redirect('/auth/login')
}
