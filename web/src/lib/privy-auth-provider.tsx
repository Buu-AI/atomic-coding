"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PrivyProvider, usePrivy, type User } from "@privy-io/react-auth";
import {
  AppAuthProvider,
  type AppAuthUser,
} from "./app-auth-context";
import { registerAuthTokenGetter } from "./auth-token-registry";
import { ensureUserProfile } from "./user-profile";

function toAppUser(user: User | null | undefined): AppAuthUser | null {
  if (!user) return null;
  const emailAddress = user.email?.address;
  return {
    id: user.id,
    email: emailAddress ? { address: emailAddress } : undefined,
  };
}

function AuthTokenRegistrar({ children }: { children: ReactNode }) {
  const { authenticated, user, getAccessToken } = usePrivy();
  const getTokenRef = useRef(getAccessToken);
  getTokenRef.current = getAccessToken;

  registerAuthTokenGetter(() => getTokenRef.current());

  useEffect(() => {
    if (!authenticated || !user) return;

    const email = user.email?.address;
    const displayName = user.google?.name ?? email;
    const avatarUrl = user.google?.profilePictureUrl;

    ensureUserProfile(user.id, email, displayName, avatarUrl).catch(() => {
      // Profile sync is best-effort and should not block auth.
    });
  }, [authenticated, user]);

  return <>{children}</>;
}

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken, login, logout } =
    usePrivy();

  return (
    <AppAuthProvider
      value={{
        authenticated,
        ready,
        user: authenticated ? toAppUser(user) : null,
        login: () => login(),
        logout: () => logout(),
        getAccessToken: () => getAccessToken(),
        isDevBypass: false,
      }}
    >
      <AuthTokenRegistrar>{children}</AuthTokenRegistrar>
    </AppAuthProvider>
  );
}

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{ appearance: { theme: "dark" } }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}
