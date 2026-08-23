import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsUp, Pause, Shield, Volume2, VolumeX, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultHud, type GameAPI, type HudState } from "./types";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameAPI | null>(null);
  const [hud, setHud] = useState<HudState>(defaultHud);
  const [name, setName] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let instance: GameAPI | null = null;
    void import("./engine").then(({ Game }) => {
      if (!alive || !canvas) return;
      instance = new Game(canvas, setHud);
      gameRef.current = instance;
      instance.start();
    });
    return () => {
      alive = false;
      instance?.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = () => gameRef.current;
  const playing = hud.mode === "playing";
  const paused = hud.mode === "paused";
  const showHud = playing || paused;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
      />

      {showHud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="font-display text-xs font-medium uppercase tracking-widest text-muted">
              Score
            </p>
            <p className="font-display text-xl font-semibold tabular-nums leading-none tracking-tight">
              {hud.score.toLocaleString()}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className="tabular-nums">Wave {hud.wave}</span>
              {hud.combo > 1 && <span className="text-fg">x{hud.combo.toFixed(0)}</span>}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className="flex items-center gap-1.5" aria-label={`${hud.lives} lives`}>
              {Array.from({ length: Math.min(8, Math.max(0, hud.lives | 0)) }).map((_, i) => (
                <span key={i} className="block size-2.5 rotate-45 bg-fg" aria-hidden />
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted">
              {hud.multi > 1 && (
                <span className="inline-flex items-center gap-0.5 text-xs uppercase tracking-wider">
                  <ChevronsUp className="size-3.5" strokeWidth={2} />
                  {hud.multi}
                </span>
              )}
              {hud.shield > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs uppercase tracking-wider">
                  <Shield className="size-3.5" strokeWidth={2} />
                  {hud.shield}
                </span>
              )}
              {hud.speed > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs uppercase tracking-wider">
                  <Zap className="size-3.5" strokeWidth={2} />
                  {hud.speed}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto size-11 shrink-0"
            aria-label="Pause"
            type="button"
            onClick={() => g()?.pause()}
          >
            <Pause className="size-4" strokeWidth={2} />
          </Button>
        </div>
      )}

      {playing && hud.banner && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 text-center">
          <p className="font-display text-3xl font-semibold tracking-widest text-fg">{hud.banner}</p>
        </div>
      )}

      {hud.mode === "title" && (
        <Panel>
          <p className="font-display text-xs font-medium uppercase tracking-widest text-muted">
            Arcade
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-widest sm:text-5xl">
            IONWAKE
          </h1>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted">
            Break the incoming fleet. Grab multi-shot, shield, and speed. Three lives. Auto-fire is
            always on.
          </p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" className="w-full" type="button" onClick={() => g()?.play()}>
              Play
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => g()?.showScores()}
            >
              High scores
            </Button>
          </div>
          <dl className="mt-4 grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-left text-xs text-muted">
            <dt className="font-medium text-fg">Move</dt>
            <dd>WASD, arrows, or drag</dd>
            <dt className="font-medium text-fg">Fire</dt>
            <dd>Automatic</dd>
            <dt className="font-medium text-fg">Pause</dt>
            <dd>Esc or P</dd>
          </dl>
        </Panel>
      )}

      {paused && (
        <Panel>
          <h2 className="font-display text-2xl font-semibold tracking-widest">Paused</h2>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" className="w-full" type="button" onClick={() => g()?.resume()}>
              Resume
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => g()?.setMuted(!hud.muted)}
            >
              {hud.muted ? (
                <VolumeX className="size-4" strokeWidth={2} />
              ) : (
                <Volume2 className="size-4" strokeWidth={2} />
              )}
              {hud.muted ? "Sound off" : "Sound on"}
            </Button>
            <Button variant="outline" className="w-full" type="button" onClick={() => g()?.restart()}>
              Restart
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={() => g()?.toTitle()}>
              Title
            </Button>
          </div>
        </Panel>
      )}

      {hud.mode === "over" && (
        <Panel>
          <p className="font-display text-xs font-medium uppercase tracking-widest text-muted">
            Run ended
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-widest">Ionwake</h2>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">
            {hud.overScore.toLocaleString()}
          </p>
          <p className="text-sm text-muted">Wave {hud.overWave}</p>
          {hud.isHigh && (
            <form
              className="mt-2 flex w-full max-w-xs flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                g()?.submitName(name);
              }}
            >
              <label className="text-xs uppercase tracking-widest text-muted" htmlFor="tag">
                Initials
              </label>
              <input
                id="tag"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3))}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                maxLength={3}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="done"
                autoFocus
                placeholder="ACE"
                className="h-12 select-text rounded-lg border border-border-strong bg-surface px-3 text-center font-display text-xl tracking-widest text-fg outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/70"
              />
              <Button type="submit" size="lg" className="w-full">
                Save score
              </Button>
            </form>
          )}
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            {!hud.isHigh && (
              <Button size="lg" className="w-full" type="button" onClick={() => g()?.restart()}>
                Play again
              </Button>
            )}
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => (hud.isHigh ? g()?.submitName(name) : g()?.showScores())}
            >
              High scores
            </Button>
            {!hud.isHigh && (
              <Button variant="ghost" className="w-full" type="button" onClick={() => g()?.toTitle()}>
                Title
              </Button>
            )}
          </div>
        </Panel>
      )}

      {hud.mode === "scores" && (
        <Panel>
          <h2 className="font-display text-2xl font-semibold tracking-widest">High scores</h2>
          {hud.scores.length === 0 ? (
            <p className="text-sm text-muted">No scores yet. Fly a run.</p>
          ) : (
            <ol className="w-full max-w-sm divide-y divide-border">
              {hud.scores.map((row, i) => (
                <li
                  key={`${row.at}-${row.name}`}
                  className="grid grid-cols-4 items-baseline gap-2 py-2 text-sm"
                >
                  <span className="font-display tabular-nums text-muted">{i + 1}</span>
                  <span className="font-display tracking-widest">{row.name}</span>
                  <span className="font-display tabular-nums text-right">
                    {row.score.toLocaleString()}
                  </span>
                  <span className="text-right text-xs text-muted">W{row.wave}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" className="w-full" type="button" onClick={() => g()?.play()}>
              Play
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={() => g()?.toTitle()}>
              Title
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/60 px-5 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-surface/95 px-6 py-8 text-center">
        {children}
      </div>
    </div>
  );
}
