"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { GameFrame } from "@/components/playground/game-frame";
import { ActionsConsole } from "@/components/console/actions-console";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GameWorkspaceProps {
  gameId: string;
  gameName: string;
}

type SidebarTab = "chat" | "config";

export function GameWorkspace({ gameId, gameName }: GameWorkspaceProps) {
  const [tab, setTab] = useState<SidebarTab>("chat");

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-3 h-10 px-3 border-b shrink-0 bg-background">
        <Link href="/">
          <Button variant="ghost" size="icon" className="size-7">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm font-medium">{gameName}</span>
      </header>

      {/* Sidebar + Game */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[420px] shrink-0 border-r flex flex-col">
          {/* Tab bar */}
          <div className="flex items-stretch h-9 border-b shrink-0">
            <button
              onClick={() => setTab("chat")}
              className={cn(
                "relative flex items-center gap-1.5 px-4 text-xs font-medium transition-colors",
                tab === "chat"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="size-3.5" />
              Chat
              {tab === "chat" && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
            <button
              onClick={() => setTab("config")}
              className={cn(
                "relative flex items-center gap-1.5 px-4 text-xs font-medium transition-colors",
                tab === "config"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="size-3.5" />
              Config
              {tab === "config" && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          </div>

          {/* Both panels always mounted, toggled via CSS */}
          <div className={cn("flex-1 min-h-0", tab !== "chat" && "hidden")}>
            <ChatPanel gameId={gameId} gameName={gameName} />
          </div>
          <div className={cn("flex-1 min-h-0", tab !== "config" && "hidden")}>
            <ActionsConsole gameName={gameName} />
          </div>
        </aside>

        {/* Game */}
        <main className="flex-1 min-w-0">
          <GameFrame gameName={gameName} />
        </main>
      </div>
    </div>
  );
}
