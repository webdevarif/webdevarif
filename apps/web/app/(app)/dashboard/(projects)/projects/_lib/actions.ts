"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  createTrackedSite,
  deleteTrackedProject,
  findProjectWithSite,
  findTrackedProject,
  insertTrackedProject,
  updateTrackedProject,
  updateTrackedSite,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { syncProject } from "@/lib/projects/sync";

export type ProjectModulesInput = {
  analyticsEnabled: boolean;
  apiMetricsEnabled: boolean;
  healthChecksEnabled: boolean;
};

export type SaveProjectInput = {
  /** Omit for create; provide to update an existing row. */
  id?: string;
  name: string;
  domain: string;
  projectUrl?: string;
  platform?: string;
  modules: ProjectModulesInput;
  /** Only required when modules.apiMetricsEnabled is true. */
  apiEndpoint?: string;
  /** Optional — when set, encrypted at rest and sent as Bearer header. */
  apiKey?: string;
  /** Optional replay-recording config when analytics is enabled. */
  replayEnabled?: boolean;
  replaySampleRate?: number;
};

export type SaveProjectState =
  | {
      ok: true;
      data: { id: string; name: string; siteId: string | null; publicKey: string | null };
    }
  | { ok: false; error: { message: string } };

export type SyncProjectState =
  | { ok: true; data: { keys: string[]; syncedAt: string } }
  | { ok: false; error: { message: string } };

export type RemoveProjectState =
  | { ok: true }
  | { ok: false; error: { message: string } };

/**
 * Bare hostname — drops scheme, path, port. Same recipe the tracker
 * uses so a project's domain and its linked tracked_site.domain stay
 * byte-for-byte identical (matters for the public ingest origin check).
 */
function normaliseDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function newPublicKey(): string {
  return randomBytes(16).toString("base64url");
}

function isValidDomain(d: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d);
}

/**
 * Build a sensible projectUrl from inputs. Project URL is used for
 * health checks and as a default for the public landing page. Falls
 * back to `https://<domain>` when the user didn't override it.
 */
function deriveProjectUrl(input: { projectUrl?: string; domain: string }): string {
  const raw = input.projectUrl?.trim();
  if (raw) {
    try {
      return new URL(raw).toString();
    } catch {
      // fall through to domain-based default
    }
  }
  return `https://${input.domain}`;
}

/**
 * Create OR update a project in one call. The shape mirrors the unified
 * form: name + domain are required; the three module toggles decide
 * which extra fields are validated. Idempotent on the linked
 * tracked_sites row — re-toggling Analytics flips isActive rather than
 * deleting history.
 */
export async function saveProjectAction(
  input: SaveProjectInput,
): Promise<SaveProjectState> {
  const user = await requireUser();

  const name = input.name.trim();
  if (!name) return { ok: false, error: { message: "Project name is required." } };

  const domain = normaliseDomain(input.domain);
  if (!domain) return { ok: false, error: { message: "Domain is required." } };
  if (!isValidDomain(domain)) {
    return {
      ok: false,
      error: { message: "Enter a bare hostname like example.com." },
    };
  }

  const modules = input.modules;

  let apiEndpoint: string | null = null;
  if (modules.apiMetricsEnabled) {
    const raw = input.apiEndpoint?.trim();
    if (!raw) {
      return {
        ok: false,
        error: {
          message: "API endpoint is required when the API Metrics module is on.",
        },
      };
    }
    try {
      apiEndpoint = new URL(raw).toString();
    } catch {
      return {
        ok: false,
        error: { message: "API endpoint must be a valid URL." },
      };
    }
  }

  let apiKeyEncrypted: string | null = null;
  if (input.apiKey?.trim()) {
    if (!isEncryptionConfigured()) {
      return {
        ok: false,
        error: {
          message:
            "Encryption key not configured. Set SHOPIFY_ENCRYPTION_KEY in env.",
        },
      };
    }
    apiKeyEncrypted = encryptSecret(input.apiKey.trim());
  }

  const projectUrl = deriveProjectUrl({ projectUrl: input.projectUrl, domain });
  const platform = input.platform?.trim() || "custom";

  // ─── Update path ────────────────────────────────────────────────
  if (input.id) {
    const existing = await findProjectWithSite(user.id, input.id);
    if (!existing) {
      return { ok: false, error: { message: "Project not found." } };
    }

    await updateTrackedProject({
      id: input.id,
      userId: user.id,
      name,
      domain,
      projectUrl,
      platform,
      // Only overwrite endpoint when API Metrics is on; otherwise keep
      // the previous value so re-enabling later doesn't force a retype.
      apiEndpoint: modules.apiMetricsEnabled ? apiEndpoint : undefined,
      // Same for the key — only update when the user provided a fresh one.
      apiKeyEncrypted: apiKeyEncrypted ?? undefined,
      analyticsEnabled: modules.analyticsEnabled,
      apiMetricsEnabled: modules.apiMetricsEnabled,
      healthChecksEnabled: modules.healthChecksEnabled,
    });

    let siteId: string | null = existing.site?.id ?? null;
    let publicKey: string | null = existing.site?.publicKey ?? null;

    // Analytics turned ON.
    if (modules.analyticsEnabled) {
      if (existing.site) {
        // Re-activate + keep name/domain in sync with the project.
        const updated = await updateTrackedSite(existing.site.id, user.id, {
          name,
          domain,
          isActive: true,
          ...(typeof input.replayEnabled === "boolean"
            ? { replayEnabled: input.replayEnabled }
            : {}),
          ...(typeof input.replaySampleRate === "number"
            ? {
                replaySampleRate: Math.max(
                  0,
                  Math.min(100, Math.round(input.replaySampleRate)),
                ),
              }
            : {}),
        });
        if (updated) {
          siteId = updated.id;
          publicKey = updated.publicKey;
        }
      } else {
        // First-time enable: spin up a fresh site linked to the project.
        const created = await createTrackedSite({
          userId: user.id,
          projectId: input.id,
          name,
          domain,
          publicKey: newPublicKey(),
          isActive: true,
          replayEnabled: input.replayEnabled ?? false,
          replaySampleRate:
            typeof input.replaySampleRate === "number"
              ? Math.max(0, Math.min(100, Math.round(input.replaySampleRate)))
              : 10,
        });
        siteId = created.id;
        publicKey = created.publicKey;
      }
    } else if (existing.site) {
      // Analytics turned OFF — preserve history, just stop ingest.
      await updateTrackedSite(existing.site.id, user.id, { isActive: false });
    }

    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${input.id}`);
    return {
      ok: true,
      data: { id: input.id, name, siteId, publicKey },
    };
  }

  // ─── Create path ────────────────────────────────────────────────
  const project = await insertTrackedProject({
    userId: user.id,
    name,
    domain,
    projectUrl,
    apiEndpoint,
    apiKeyEncrypted,
    platform,
    status: "active",
    analyticsEnabled: modules.analyticsEnabled,
    apiMetricsEnabled: modules.apiMetricsEnabled,
    healthChecksEnabled: modules.healthChecksEnabled,
  });

  let siteId: string | null = null;
  let publicKey: string | null = null;

  if (modules.analyticsEnabled) {
    const site = await createTrackedSite({
      userId: user.id,
      projectId: project.id,
      name,
      domain,
      publicKey: newPublicKey(),
      isActive: true,
      replayEnabled: input.replayEnabled ?? false,
      replaySampleRate:
        typeof input.replaySampleRate === "number"
          ? Math.max(0, Math.min(100, Math.round(input.replaySampleRate)))
          : 10,
    });
    siteId = site.id;
    publicKey = site.publicKey;
  }

  revalidatePath("/dashboard/projects");
  return {
    ok: true,
    data: { id: project.id, name: project.name, siteId, publicKey },
  };
}

export async function syncProjectAction(
  projectId: string,
): Promise<SyncProjectState> {
  const user = await requireUser();
  const result = await syncProject(user.id, projectId);

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);

  return result;
}

/**
 * Destructive: cascades to tracked_sites (which cascades to events,
 * sessions, replays) AND to project_health_checks /
 * project_health_aggregates. The caller must pass `confirmName` exactly
 * matching the project's current name — UI enforces this with a
 * type-to-confirm field.
 */
export async function removeProjectAction(input: {
  projectId: string;
  confirmName: string;
}): Promise<RemoveProjectState> {
  const user = await requireUser();
  const project = await findTrackedProject(user.id, input.projectId);
  if (!project) {
    return { ok: false, error: { message: "Project not found." } };
  }
  if (input.confirmName.trim() !== project.name) {
    return {
      ok: false,
      error: {
        message:
          "Confirmation text does not match the project name. Deletion cancelled.",
      },
    };
  }
  await deleteTrackedProject(user.id, input.projectId);
  revalidatePath("/dashboard/projects");
  return { ok: true };
}
