const FOOTER_LINKS = [
  { label: "ABOUT", href: "#about" },
  { label: "PRODUCTS", href: "#products" },
  { label: "WORKFLOW", href: "#workflow" },
  { label: "CONTACT", href: "#contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#050505]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row lg:px-8">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-foreground">web</span>
          <span className="text-sm font-extrabold text-primary">dev</span>
          <span className="text-sm font-extrabold text-foreground">arif</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} &middot; Shopify Expert
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
