import type { Metadata } from "next";
import { StudyProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "IELTS Study OS — 我的AI雅思学习教练",
  description:
    "从你现在的水平开始。诊断、讲解、分步练习与复练，建立每天可执行的雅思学习路径。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <StudyProvider>
          <Shell>{children}</Shell>
        </StudyProvider>
      </body>
    </html>
  );
}
