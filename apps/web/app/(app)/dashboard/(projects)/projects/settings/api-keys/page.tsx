import { listApiKeys } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { ApiKeysPanel } from "./_components/api-keys-panel";

export const metadata = {
  title: "API Keys · webdevarif",
};

export default async function ProjectsApiKeysPage() {
  const user = await requireUser();
  const keys = await listApiKeys(user.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-label">— projects · settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          API Keys
        </h1>
        <p className="text-comment mt-2">
          {`// manage api keys for programmatic access to the tracker ingest + project endpoints`}
        </p>
      </header>

      <ApiKeysPanel keys={keys} />
    </div>
  );
}
