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
        {/* Impact.com site verification — hoisted into <head> by React 19 */}
        <meta
          name="impact-site-verification"
          value="be22a2d9-2d96-4329-b91c-ca21e085286a"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
