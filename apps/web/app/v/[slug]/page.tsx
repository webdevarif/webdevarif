import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { findVideoBySlug, getUserProfile } from "@kit/database";

import { BASE_RESUME_DATA } from "@/lib/resume/base-data";
import { detectVideoSource } from "@/lib/videos/source";

import { ContactCard, type ContactInfo } from "./_components/contact-card";
import { PasswordGate } from "./_components/password-gate";
import { VideoPlayer } from "./_components/video-player";
import { verifySlugAccess, videoCookieName } from "./_lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await findVideoBySlug(slug);
  if (!video || !video.isPublic) return { title: "Video not found" };
  return {
    title: `${video.title} · webdevarif`,
    description: video.description ?? undefined,
  };
}

export default async function PublicVideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await findVideoBySlug(slug);
  if (!video || !video.isPublic) notFound();

  const source = detectVideoSource(video.sourceUrl);
  if (!source) notFound();

  // Password gate
  if (video.passwordHash) {
    const cookieJar = await cookies();
    const token = cookieJar.get(videoCookieName(slug))?.value;
    if (!verifySlugAccess(slug, token)) {
      return (
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
          <PasswordGate slug={slug} title={video.title} />
        </main>
      );
    }
  }

  const contact = await resolveContactForOwner(video.userId);

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-3 sm:mb-4">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {video.title}
          </h1>
          {video.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {video.description}
            </p>
          ) : null}
        </header>

        <VideoPlayer slug={slug} source={source} />

        <ContactCard contact={contact} />

        <footer className="mt-4 flex items-center justify-between text-[0.6875rem] text-muted-foreground/70">
          <span className="font-mono">{`// ${source.label}`}</span>
          <span className="font-mono">
            shared via <span className="text-primary">webdevarif</span>
          </span>
        </footer>
      </div>
    </main>
  );
}

/**
 * The contact strip below the video is sourced from the video owner's
 * Personal Brain (user_profiles row). If they haven't customised it
 * yet, we fall back to the static base resume data so the share page
 * is never blank.
 */
async function resolveContactForOwner(userId: string): Promise<ContactInfo> {
  const profile = await getUserProfile(userId).catch(() => null);
  if (profile) {
    const b = profile.data.basics;
    return {
      name: b.name,
      title: b.titleLine,
      location: b.location,
      email: b.email,
      phone: b.phone,
      website: b.website,
      linkedin: b.linkedin,
      github: b.github,
    };
  }
  const c = BASE_RESUME_DATA.contact;
  return {
    name: BASE_RESUME_DATA.name,
    title: BASE_RESUME_DATA.titleLine,
    location: c.location,
    email: c.email,
    phone: c.phone,
    website: c.website,
    linkedin: c.linkedin,
    github: c.github,
  };
}
