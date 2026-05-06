"use client";

import { notFound } from "next/navigation";
import { GameWorkspace } from "@/components/workspace/game-workspace";
import { WorkspaceSkeleton } from "@/components/workspace/workspace-skeleton";
import { useGame } from "@/lib/hooks";
import { isApiErrorStatus } from "@/lib/api";

interface GameWorkspaceLoaderProps {
  name: string;
}

export function GameWorkspaceLoader({ name }: GameWorkspaceLoaderProps) {
  const { data: game, error, isLoading } = useGame(name);

  if (error && (isApiErrorStatus(error, 404) || isApiErrorStatus(error, 403))) {
    notFound();
  }

  if (isLoading || !game) {
    return <WorkspaceSkeleton />;
  }

  return (
    <GameWorkspace
      gameId={game.id}
      gameName={game.name}
      genre={game.genre}
      gameFormat={game.game_format}
      description={game.description}
      isPublished={game.is_published}
      publicSlug={game.public_slug}
    />
  );
}
