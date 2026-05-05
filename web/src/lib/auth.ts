import "server-only";
import { PrivyClient } from "@privy-io/server-auth";
import {
  getDevAuthUser,
  isDevAuthBypassEnabled,
} from "./dev-auth";

export interface AuthUser {
  userId: string;
  email?: string;
}

let cachedClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  if (!cachedClient) {
    cachedClient = new PrivyClient(appId, appSecret);
  }
  return cachedClient;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Verify the auth token from a request.
 * Returns the authenticated user or null if invalid.
 */
export async function verifyAuthToken(
  req: Request
): Promise<AuthUser | null> {
  const hostname = new URL(req.url).hostname;
  if (isDevAuthBypassEnabled(hostname)) {
    return getDevAuthUser();
  }

  const token = extractBearerToken(req);
  if (!token) return null;

  const client = getPrivyClient();
  if (!client) return null;

  try {
    const verified = await client.verifyAuthToken(token);
    if (!verified?.userId) return null;
    return { userId: verified.userId };
  } catch {
    return null;
  }
}
