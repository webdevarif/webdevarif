import { listSocialProfileAnalyses } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { ProfileOptimizerTool } from "./_components/profile-optimizer-tool";

export const metadata = {
  title: "Profile Optimizer · webdevarif",
};

export default async function SocialProfileOptimizerPage() {
  const user = await requireUser();
  const history = await listSocialProfileAnalyses(user.id);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">&mdash; social media &middot; profile optimization</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Profile Optimizer
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Analyze your LinkedIn profile with AI vision. Get section-by-section
          scores, actionable suggestions, and track improvements over time.
        </p>
      </header>
      <section className="mt-8">
        <ProfileOptimizerTool history={history} />
      </section>
    </div>
  );
}
