import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drawing Training Check-in System",
  description: "Phase 0 foundation for drawing training check-in backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
