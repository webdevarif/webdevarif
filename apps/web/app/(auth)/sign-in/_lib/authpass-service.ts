import "server-only";

import {
  createSession,
  createUser,
  findUserByAuthpassSub,
  findUserByEmail,
  findUserByUsername,
  linkAuthpassSub,
  type User,
} from "@kit/database";
import { env } from "@kit/shared/env";

import { signJwt } from "@/lib/auth/jwt";
import {
  exchangeCodeForToken,
  fetchUserInfo,
  type AuthpassUserInfo,
} from "@/lib/auth/authpass";

export type AuthpassLoginResult = {
  user: User;
  token: string;
};

/** Slug-ify the email local part into a candidate username, then
 * disambiguate against existing rows — mirrors the 20-char column limit. */
async function generateUsername(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]!
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "user";

  let candidate = base;
  let suffix = 0;
  while (await findUserByUsername(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`.slice(0, 20);
  }
  return candidate;
}

async function upsertUserFromAuthpass(info: AuthpassUserInfo): Promise<User> {
  const existingBySub = await findUserByAuthpassSub(info.sub);
  if (existingBySub) return existingBySub;

  const email = info.email?.trim().toLowerCase();
  if (email) {
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      await linkAuthpassSub(existingByEmail.id, info.sub);
      return { ...existingByEmail, authpassSub: info.sub };
    }
  }

  const finalEmail = email ?? `${info.sub}@authpass.site`;
  const username = await generateUsername(finalEmail);

  return createUser({
    username,
    email: finalEmail,
    fullName: info.name?.trim() || username,
    passwordHash: null,
    authpassSub: info.sub,
  });
}

export async function handleAuthpassCallback(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<AuthpassLoginResult> {
  const tokens = await exchangeCodeForToken(params);
  const info = await fetchUserInfo(tokens.access_token);
  const user = await upsertUserFromAuthpass(info);

  const token = await signJwt({ sub: user.id });
  const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE * 1000);

  await createSession({ userId: user.id, token, expiresAt });

  return { user, token };
}
