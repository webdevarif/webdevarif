import "server-only";

import {
  findTrackedProject,
  insertProjectSnapshot,
  updateTrackedProjectSyncStatus,
} from "@kit/database";

import { decryptSecret } from "@/lib/crypto";

export type SyncResult =
  | { ok: true; data: { keys: string[]; syncedAt: string } }
  | { ok: false; error: { message: string } };

export async function syncProject(
  userId: string,
  projectId: string
): Promise<SyncResult> {
  const project = await findTrackedProject(userId, projectId);
  if (!project) {
    return { ok: false, error: { message: "Project not found." } };
  }

  if (!project.apiEndpoint) {
    return {
      ok: false,
      error: {
        message:
          "This project does not have an API endpoint configured. Enable the API Metrics module and add an endpoint to sync snapshots.",
      },
    };
  }

  const apiEndpoint = project.apiEndpoint;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (project.apiKeyEncrypted) {
    try {
      const apiKey = decryptSecret(project.apiKeyEncrypted);
      headers["Authorization"] = `Bearer ${apiKey}`;
    } catch {
      return {
        ok: false,
        error: { message: "Could not decrypt API key. Check encryption settings." },
      };
    }
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    response = await fetch(apiEndpoint, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "Request timed out after 30 seconds."
        : `Network error: ${err instanceof Error ? err.message : "unknown"}`;

    await updateTrackedProjectSyncStatus({
      id: projectId,
      userId,
      lastSyncedAt: new Date(),
      lastSyncError: msg,
      status: "error",
    });

    return { ok: false, error: { message: msg } };
  }

  if (!response.ok) {
    const msg =
      response.status === 401
        ? "Unauthorized (401). Check the API key."
        : response.status === 403
          ? "Forbidden (403). Access denied."
          : response.status === 404
            ? "Not found (404). Check the API endpoint."
            : `HTTP ${response.status}: ${response.statusText}`;

    await updateTrackedProjectSyncStatus({
      id: projectId,
      userId,
      lastSyncedAt: new Date(),
      lastSyncError: msg,
      status: "error",
    });

    return { ok: false, error: { message: msg } };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    const msg = "Invalid JSON response from the API endpoint.";
    await updateTrackedProjectSyncStatus({
      id: projectId,
      userId,
      lastSyncedAt: new Date(),
      lastSyncError: msg,
      status: "error",
    });
    return { ok: false, error: { message: msg } };
  }

  const now = new Date();

  await insertProjectSnapshot({ projectId, data });

  await updateTrackedProjectSyncStatus({
    id: projectId,
    userId,
    lastSyncedAt: now,
    lastSyncError: null,
    lastSnapshot: data,
    status: "active",
  });

  const keys =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.keys(data)
      : [];

  return {
    ok: true,
    data: { keys, syncedAt: now.toISOString() },
  };
}
