"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { registerAuthTokenGetter } from "./auth-token-registry";
import {
  AppAuthProvider,
  defaultAuthValue,
  type AppAuthUser,
  useAppAuth,
} from "./app-auth-context";
import { ensureUserProfile } from "./user-profile";

const PrivyAuthProvider = dynamic(
  () =>
    import("./privy-auth-provider").then((module) => ({
      default: module.PrivyAuthProvider,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";
const DEV_AUTH_BYPASS_USER_ID =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_USER_ID ?? "did:dev:local-user";
const DEV_AUTH_BYPASS_TOKEN =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_TOKEN ?? "dev-bypass";
const noop = () => {};

function DevAuthBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerAuthTokenGetter(async () => DEV_AUTH_BYPASS_TOKEN);
  }, []);

  useEffect(() => {
    ensureUserProfile(
      DEV_AUTH_BYPASS_USER_ID,
      "dev@local.test",
      "Local Dev",
    ).catch(() => {
      // Profile sync is best-effort and should not block auth.
    });
  }, []);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (DEV_AUTH_BYPASS) {
    const devUser: AppAuthUser = {
      id: DEV_AUTH_BYPASS_USER_ID,
      email: { address: "dev@local.test" },
    };

    return (
      <AppAuthProvider
        value={{
          authenticated: true,
          ready: true,
          user: devUser,
          login: noop,
          logout: noop,
          getAccessToken: async () => DEV_AUTH_BYPASS_TOKEN,
          isDevBypass: true,
        }}
      >
        <DevAuthBootstrap>{children}</DevAuthBootstrap>
      </AppAuthProvider>
    );
  }

  // During static generation the key may not be set; render children without auth
  if (!PRIVY_APP_ID) {
    return (
      <AppAuthProvider value={defaultAuthValue}>{children}</AppAuthProvider>
    );
  }

  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}

export { useAppAuth } from "./app-auth-context";
