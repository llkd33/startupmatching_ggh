// Force dynamic rendering for admin campaigns page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminCampaignsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

