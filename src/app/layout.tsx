import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

import { SidebarLayout } from "@/components/SidebarLayout";

export const metadata: Metadata = {
  title: "GenVoice — AI Voice Cloning",
  description: "Generate realistic AI voices from text using Breeze TTS 2, powered by Kaggle GPU.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full flex flex-col antialiased bg-bg-base text-text-primary selection:bg-accent-bg/20 selection:text-text-primary">
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
