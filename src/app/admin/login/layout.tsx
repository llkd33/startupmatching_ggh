// Force dynamic rendering for admin login page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

