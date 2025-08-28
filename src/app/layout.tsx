import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from '@/components/providers/ClientProviders';

export const metadata: Metadata = {
  title: "전문가 매칭 플랫폼",
  description: "창업지원기관과 전문가를 연결하는 스마트 매칭 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ClientProviders>
          <div style={{ backgroundColor: '#10b981', padding: '8px', color: 'white', textAlign: 'center', fontSize: '14px' }}>
            ✅ Working Version - No JavaScript Dependencies
          </div>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}