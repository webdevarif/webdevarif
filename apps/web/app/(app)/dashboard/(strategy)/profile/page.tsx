import { getUserProfile, upsertUserProfile } from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { seedProfileFromBase } from "@/lib/profile/seed";

import { ProfileEditor } from "./_components/profile-editor";

export const metadata = {
  title: "My Profile · webdevarif",
};

export default async function ProfilePage() {
  const user = await requireUser();

  let row = await getUserProfile(user.id);
  if (!row) {
    // First-time bootstrap: seed from the static base resume data.
    row = await upsertUserProfile({
      userId: user.id,
      data: seedProfileFromBase(),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6">
        <p className="text-label">— career · personal brain</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full pool of skills, experiences, projects, and achievements
          the Resume Generator pulls from. Add freely — the AI picks the
          most relevant subset per job, so a bigger brain just means
          better-tailored resumes.
        </p>
        <p className="text-comment mt-2">
          {`// last updated ${row.updatedAt.toLocaleString()}`}
        </p>
      </header>

      <ProfileEditor initial={row.data} />
    </div>
  );
}
