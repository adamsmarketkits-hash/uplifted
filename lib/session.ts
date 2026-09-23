import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sf_session";
export const FAMILY_COOKIE = "sf_family";
export const TZ_COOKIE = "sf_tz";

export type SessionPayload = {
  memberId: string;
  familyId: string;
  displayName: string;
};

export type FamilyCookie = {
  familyId: string;
  inviteCode: string;
  familyName: string;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: object, expires: string) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());
}

export async function decrypt<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await decrypt<SessionPayload & { exp: number }>(token);
  if (!session?.memberId || !session.familyId) return null;
  return {
    memberId: session.memberId,
    familyId: session.familyId,
    displayName: session.displayName,
  };
}

export async function getFamilyCookie(): Promise<FamilyCookie | null> {
  const jar = await cookies();
  const token = jar.get(FAMILY_COOKIE)?.value;
  if (!token) return null;
  const family = await decrypt<FamilyCookie & { exp: number }>(token);
  if (!family?.familyId || !family.inviteCode) return null;
  return {
    familyId: family.familyId,
    inviteCode: family.inviteCode,
    familyName: family.familyName,
  };
}

export async function getTimeZone() {
  const jar = await cookies();
  const raw = jar.get(TZ_COOKIE)?.value;
  if (!raw) return "UTC";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function setSession(session: SessionPayload) {
  const jar = await cookies();
  const token = await encrypt(session, "30d");
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setFamilyCookie(family: FamilyCookie) {
  const jar = await cookies();
  const token = await encrypt(family, "180d");
  jar.set(FAMILY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function clearFamilyCookie() {
  const jar = await cookies();
  jar.delete(FAMILY_COOKIE);
}
