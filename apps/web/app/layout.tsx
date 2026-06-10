import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import "@kit/ui/styles/globals.css";

import { Providers } from "@/components/providers";

const syne = Syne({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Arif Hossin — Shopify App & Theme Developer",
  description:
    "Building digital products with modern web technologies. Specializing in React, Next.js, WordPress, Shopify and full-stack development.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
