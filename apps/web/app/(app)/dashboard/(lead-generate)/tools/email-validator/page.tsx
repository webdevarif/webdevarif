import { requireUser } from "@/lib/auth/session";

import { ValidatorTool } from "./_components/validator-tool";

export const metadata = {
  title: "Email Validator · webdevarif",
};

export default async function EmailValidatorPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— lead generate · contact discovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Email Validator
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste anything — a CSV, a signature block, a screenshot text. We
          extract every email on blur, then check each one: syntax, live MX
          records, disposable providers, and role accounts. Filter, then
          copy the clean list. Free, no API key.
        </p>
      </header>

      <section className="mt-8">
        <ValidatorTool />
      </section>
    </div>
  );
}
