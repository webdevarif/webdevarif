import type { Metadata } from "next";
import "../styles/globals.css";
import { Barlow, Source_Serif_4 } from "next/font/google";
import SWRLayout from "@/Providers/SWRLayout";
import { cn } from "@/lib/utils";
import NextTheme from "@/Providers/NextTheme";
import GsapLayout from "@/Providers/GsapLayout";

export const metadata: Metadata = {
  title: "Web Developer Arif",
  description: "",
};

const barlow = Barlow({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

const source_serif_4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-serif-4',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <body className={cn(barlow.variable, source_serif_4.variable)}>
      <SWRLayout>
        <NextTheme>
          <GsapLayout>
            { children }
          </GsapLayout>
        </NextTheme>
      </SWRLayout>
      </body>
    </html>
  );
}
