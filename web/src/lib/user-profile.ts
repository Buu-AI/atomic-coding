import type { User as PrivyUser } from "@privy-io/react-auth";

type GetToken = () => Promise<string | null>;

/**
 * Ensure a user profile exists in the database.
 * Creates one if it doesn't exist, updates if it does.
 */
export async function ensureUserProfile(
  user: PrivyUser,
  getToken?: GetToken,
): Promise<void> {
  const { API_BASE } = await import("./constants");

  const linkedEmail = user.linkedAccounts?.find((a) => a.type === "email");
  const linkedEmailAddress =
    linkedEmail && "address" in linkedEmail && typeof linkedEmail.address === "string"
      ? linkedEmail.address
      : undefined;
  const email = user.email?.address ?? user.google?.email ?? linkedEmailAddress;

  const displayName =
    user.google?.name ?? user.twitter?.name ?? email?.split("@")[0];
  const avatarUrl =
    user.google?.profilePictureUrl ?? user.twitter?.profilePictureUrl ?? undefined;
  const walletAddress = user.wallet?.address;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (getToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/users/profile`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: user.id,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      wallet_address: walletAddress,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync user profile: ${response.status}`);
  }
}
