import { TrackerScript } from "@/components/tracker-script";

import { Header } from "./_components/header";
import { Footer } from "./_components/footer";
import { SmoothScroll } from "./_components/smooth-scroll";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <TrackerScript />
    </SmoothScroll>
  );
}
