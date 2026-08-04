import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AppLayout from "./_components/AppLayout";

export const metadata: Metadata = {
  title: "Deploy GUI",
  description: "一体化运维面板：服务器管理 + SSH 终端 + 文件管理 + SSH 隧道 + Jenkins 部署",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
