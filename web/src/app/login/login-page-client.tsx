"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

export function LoginPageClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace(redirectTo);
    }
  }, [ready, authenticated, redirectTo, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="text-sm text-zinc-400">
            Sign in to continue to your dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => login()}
          className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
