"use client";

import { useRouter } from "next/navigation";
import { CreateGameDialog } from "./create-game-dialog";

export function GamesHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Atomic Coding</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered game development with atoms
        </p>
      </div>
      <CreateGameDialog onCreated={() => router.refresh()} />
    </div>
  );
}
