import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Web Developer Arif | Portfolio",
  description: "Portfolio Design",
};

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <React.Fragment>{children}</React.Fragment>;
}
