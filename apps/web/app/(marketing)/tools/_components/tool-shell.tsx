import Link from "next/link";

export function ToolShell({
  category,
  title,
  description,
  children,
}: {
  category: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080808] pt-24 pb-24 text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <nav className="mb-6 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            home
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-muted-foreground/70">tools</span>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">{title.toLowerCase()}</span>
        </nav>

        <header className="mb-10">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary">
            — {category}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-comment mt-3 max-w-2xl">
            {`// ${description}`}
          </p>
        </header>

        {children}
      </div>
    </main>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 sm:p-6 ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground">
      {code}
    </pre>
  );
}
