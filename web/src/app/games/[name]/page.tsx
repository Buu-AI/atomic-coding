import { GameWorkspaceLoader } from "./game-workspace-loader";

interface GamePageProps {
  params: Promise<{ name: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  return <GameWorkspaceLoader name={decodedName} />;
}
