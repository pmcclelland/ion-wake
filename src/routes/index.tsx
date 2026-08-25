import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/game/GameApp";
import { parseRoomCode } from "@/game/coop";

type Search = { r?: string };

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const code = parseRoomCode(typeof raw.r === "string" ? raw.r : null);
    return code ? { r: code } : {};
  },
  component: Home,
});

function Home() {
  const { r } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <GameApp
      joinCode={r}
      onRoomCode={(code) => {
        void navigate({ search: code ? { r: code } : {} });
      }}
    />
  );
}
