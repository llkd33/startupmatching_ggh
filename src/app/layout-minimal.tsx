import type { Metadata } from "next";
import "./globals.css";

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
        <div style={{ backgroundColor: 'green', padding: '10px', color: 'white' }}>
          <strong>Debug Mode: Minimal Layout Active</strong>
        </div>
        {children}
      </body>
    </html>
  );
}