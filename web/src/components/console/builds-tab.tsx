"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hammer, RotateCcw, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { listBuilds, triggerBuild, rollbackBuild } from "@/lib/api";
import type { BuildSummary, BuildStatus } from "@/lib/types";

interface BuildsTabProps {
  gameName: string;
}

const statusConfig: Record<
  BuildStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ReactNode }
> = {
  success: {
    label: "Success",
    variant: "default",
    icon: <CheckCircle2 className="size-3" />,
  },
  building: {
    label: "Building",
    variant: "secondary",
    icon: <Clock className="size-3" />,
  },
  error: {
    label: "Error",
    variant: "destructive",
    icon: <XCircle className="size-3" />,
  },
};

export function BuildsTab({ gameName }: BuildsTabProps) {
  const [builds, setBuilds] = useState<BuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listBuilds(gameName);
      setBuilds(data);
    } catch (err) {
      console.error("Failed to load builds:", err);
    } finally {
      setLoading(false);
    }
  }, [gameName]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRebuild() {
    setRebuilding(true);
    try {
      await triggerBuild(gameName);
      // wait a moment for the build to start
      setTimeout(load, 2000);
    } catch (err) {
      console.error("Rebuild failed:", err);
    } finally {
      setRebuilding(false);
    }
  }

  async function handleRollback(buildId: string) {
    try {
      await rollbackBuild(gameName, buildId);
      await load();
    } catch (err) {
      console.error("Rollback failed:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-xs text-muted-foreground">
          {builds.length} build{builds.length !== 1 && "s"}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRebuild}
          disabled={rebuilding}
        >
          {rebuilding ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            <Hammer className="size-3.5 mr-1.5" />
          )}
          Rebuild
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {builds.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No builds yet
            </p>
          ) : (
            builds.map((build) => {
              const config = statusConfig[build.status];
              return (
                <div
                  key={build.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={config.variant} className="gap-1 text-[10px]">
                        {config.icon}
                        {config.label}
                      </Badge>
                      {build.atom_count != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {build.atom_count} atoms
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(build.created_at).toLocaleString()}
                    </p>
                    {build.error_message && (
                      <p className="text-[10px] text-destructive mt-0.5 truncate">
                        {build.error_message}
                      </p>
                    )}
                  </div>
                  {build.status === "success" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={() => handleRollback(build.id)}
                      title="Rollback to this build"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
