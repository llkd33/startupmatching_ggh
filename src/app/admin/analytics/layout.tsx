// Force dynamic rendering for admin analytics page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminAnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

