import type { Metadata } from "next";
import { Hind_Siliguri, Manrope, Outfit, Unbounded } from "next/font/google";
import "@/fonts/style.css";
import "@/styles/globals.css";
import { ThemeProvider as NextThemesProvider, ThemeProvider } from "next-themes";
import PrimaryLayout from "@/layouts/PrimaryLayout";
import SWRLayout from "@/layouts/SWRLayouts";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-unbounded',
});

const hind = Hind_Siliguri({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind',
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "Web Developer Arif",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SWRLayout>
      <html lang="en">
        <body className={`${unbounded.variable} ${manrope.variable} ${outfit.variable} smooth-scrollbar`}>
          <ThemeProvider>
            <PrimaryLayout>
              {children}
            </PrimaryLayout>
          </ThemeProvider>
        </body>
      </html>
    </SWRLayout>
  );
}
