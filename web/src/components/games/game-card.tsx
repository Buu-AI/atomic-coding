import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";
import type { GameWithBuild } from "@/lib/types";

interface GameCardProps {
  game: GameWithBuild;
}

export function GameCard({ game }: GameCardProps) {
  const hasBuild = !!game.active_build_id;

  return (
    <Link href={`/games/${encodeURIComponent(game.name)}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Gamepad2 className="size-5 shrink-0 text-muted-foreground" />
              <CardTitle className="text-base truncate">{game.name}</CardTitle>
            </div>
            <Badge variant={hasBuild ? "default" : "secondary"} className="shrink-0">
              {hasBuild ? "Active" : "No build"}
            </Badge>
          </div>
          {game.description && (
            <CardDescription className="line-clamp-2">
              {game.description}
            </CardDescription>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Created {new Date(game.created_at).toLocaleDateString()}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
