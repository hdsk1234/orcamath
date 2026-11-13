import type { Metadata } from "next";
import "./globals.css";
import "./login/login.css";
import "./components/companions.css";
import "./components/learning-feedback.css";
import "./components/learning-trends.css";
import "./components/achievements.css";
import "./components/ocean-landing.css";
import "./components/mobile-menu.css";
import "./components/members.css";
import "./components/admissions.css";

export const metadata: Metadata = {
  title: "ORCA 수학 | 오늘의 학습을 끝까지",
  description: "진단부터 매일의 과제와 학생별 진도까지, 오르카 통합 학습관리",
  robots: {index: false, follow: false, noarchive: true},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
