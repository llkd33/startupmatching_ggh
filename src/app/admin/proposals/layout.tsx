// Force dynamic rendering for admin proposals page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminProposalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

