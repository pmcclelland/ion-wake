import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bomb,
  ChevronsUp,
  Copy,
  Maximize2,
  Minimize2,
  Pause,
  Shield,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FULLSCREEN_EVENTS,
  fullscreenSupported,
  isFullscreen,
  toggleFullscreen,
} from "./fullscreen";
import { defaultHud, type GameAPI, type HudState } from "./types";

export function GameApp({
  joinCode,
  onRoomCode,
}: {
  joinCode?: string;
  onRoomCode?: (code: string | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameAPI | null>(null);
  const joinRef = useRef(joinCode);
  const roomCb = useRef(onRoomCode);
  roomCb.current = onRoomCode;
  const [hud, setHud] = useState<HudState>(defaultHud);
  const [name, setName] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let instance: GameAPI | null = null;
    void import("./engine").then(({ Game }) => {
      if (!alive || !canvas) return;
      instance = new Game(canvas, setHud, {
        joinCode: joinRef.current,
        onRoomCode: (code) => roomCb.current?.(code),
      });
      gameRef.current = instance;
      instance.start();
    });
    return () => {
      alive = false;
      instance?.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setCanFullscreen(fullscreenSupported(root));
    const sync = () => setFullscreen(isFullscreen());
    sync();
    for (const ev of FULLSCREEN_EVENTS) document.addEventListener(ev, sync);
    return () => {
      for (const ev of FULLSCREEN_EVENTS) document.removeEventListener(ev, sync);
    };
  }, []);

  const focusPlayfield = useCallback(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const onToggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    void toggleFullscreen(root)
      .catch(() => {
        /* gesture denied */
      })
      .finally(() => {
        root.focus({ preventScroll: true });
      });
  }, []);

  useEffect(() => {
    if (hud.mode === "playing" || hud.mode === "paused") {
      focusPlayfield();
    }
  }, [hud.mode, focusPlayfield]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      onToggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleFullscreen]);

  const g = () => gameRef.current;
  const playing = hud.mode === "playing";
  const paused = hud.mode === "paused";
  const showHud = playing;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`relative w-full overflow-hidden bg-bg text-fg select-none outline-none ${fullscreen ? "ion-wake-fs-root" : "h-dvh"}`}
      onPointerUp={(e) => {
        if (hud.mode !== "playing" && hud.mode !== "paused") return;
        const t = e.target;
        if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
          return;
        }
        focusPlayfield();
      }}
    >
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
              {hud.nukes > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs uppercase tracking-wider">
                  <Bomb className="size-3.5" strokeWidth={2} />
                  {hud.nukes}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="pointer-events-auto size-11"
              aria-label="Pause"
              type="button"
              onClick={() => g()?.pause()}
            >
              <Pause className="size-4" strokeWidth={2} />
            </Button>
            {canFullscreen && (
              <FullscreenButton
                active={fullscreen}
                className="pointer-events-auto"
                onToggle={onToggleFullscreen}
              />
            )}
          </div>
        </div>
      )}

      {playing && (
        <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-10 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-5">
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto relative size-20 sm:size-12"
            aria-label="Fire nuke"
            disabled={hud.nukes <= 0}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => g()?.fireNuke()}
          >
            <Bomb className="size-8 sm:size-5" strokeWidth={2} />
            <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-fg font-display text-xs font-semibold leading-none tabular-nums text-accent-fg sm:size-5">
              {hud.nukes}
            </span>
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
            Break the incoming fleet. Grab multi-shot, shield, speed, and the rare nuke. Three lives.
            Auto-fire is always on.
          </p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" className="w-full" type="button" onClick={() => g()?.play()}>
              Play
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => g()?.playTogether()}
            >
              <Users className="size-4" strokeWidth={2} />
              Play together
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => g()?.showScores()}
            >
              High Scores
            </Button>
            {canFullscreen && (
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={onToggleFullscreen}
              >
                {fullscreen ? (
                  <Minimize2 className="size-4" strokeWidth={2} />
                ) : (
                  <Maximize2 className="size-4" strokeWidth={2} />
                )}
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </Button>
            )}
          </div>
          <ControlsHint canFullscreen={canFullscreen} className="mt-4" />
        </Panel>
      )}

      {hud.mode === "lobby" && (
        <Panel>
          <p className="font-display text-xs font-medium uppercase tracking-widest text-muted">
            Co-op
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-widest">
            {hud.netRole === "host" ? "Your room" : "Join room"}
          </h2>
          {hud.roomCode && (
            <p className="font-display text-4xl font-semibold tracking-[0.4em]">{hud.roomCode}</p>
          )}
          <p className="max-w-sm text-pretty text-sm text-muted">{lobbyCopy(hud.peerPhase, hud.netRole)}</p>
          {hud.shareUrl && (
            <Button
              variant="secondary"
              className="w-full max-w-xs"
              type="button"
              onClick={() => {
                const url = hud.shareUrl;
                if (!url) return;
                void navigator.clipboard?.writeText(url).catch(() => {
                  window.prompt("Copy this link", url);
                });
              }}
            >
              <Copy className="size-4" strokeWidth={2} />
              Copy link
            </Button>
          )}
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            {hud.netRole === "host" && (
              <Button
                size="lg"
                className="w-full"
                type="button"
                disabled={!hud.peerReady}
                onClick={() => g()?.startCoop()}
              >
                {hud.peerReady ? "Start" : "Waiting for friend"}
              </Button>
            )}
            <Button variant="ghost" className="w-full" type="button" onClick={() => g()?.leaveCoop()}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}

      {paused && (
        <Panel>
          <h2 className="font-display text-2xl font-semibold tracking-widest">Paused</h2>
          <ControlsHint canFullscreen={canFullscreen} />
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
            {canFullscreen && (
              <Button variant="outline" className="w-full" type="button" onClick={onToggleFullscreen}>
                {fullscreen ? (
                  <Minimize2 className="size-4" strokeWidth={2} />
                ) : (
                  <Maximize2 className="size-4" strokeWidth={2} />
                )}
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </Button>
            )}
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
          <h2 className="font-display text-2xl font-semibold tracking-widest">IONWAKE</h2>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">
            {hud.overScore.toLocaleString()}
          </p>
          <p className="text-sm text-muted">
            Wave {hud.overWave}
            {hud.coop ? " · Co-op" : ""}
          </p>
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
                Save Score
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
              High Scores
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
          <h2 className="font-display text-2xl font-semibold tracking-widest">High Scores</h2>
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

function FullscreenButton({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="icon"
      className={className}
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={active}
      type="button"
      onClick={onToggle}
    >
      {active ? (
        <Minimize2 className="size-4" strokeWidth={2} />
      ) : (
        <Maximize2 className="size-4" strokeWidth={2} />
      )}
    </Button>
  );
}

function lobbyCopy(phase: HudState["peerPhase"], role: HudState["netRole"]): string {
  if (phase === "failed") return "Couldn’t connect. Some networks block a direct link — try another connection.";
  if (phase === "full") return "This room already has two pilots.";
  if (phase === "left") return "Your partner left.";
  if (phase === "connected") return role === "host" ? "Friend is in. Start when you’re ready." : "Connected. Waiting for host to start.";
  if (phase === "connecting") return "Connecting…";
  return role === "host" ? "Share the link. One friend can join." : "Joining the room…";
}

const CONTROL_ROWS: ReadonlyArray<{ action: string; binding: string; fullscreenOnly?: boolean }> = [
  { action: "Move", binding: "WASD, arrows, or drag" },
  { action: "Fire", binding: "Automatic" },
  { action: "Nuke", binding: "X, or the bomb" },
  { action: "Pause / Resume", binding: "Esc or P" },
  { action: "Fullscreen", binding: "F", fullscreenOnly: true },
];

function ControlsHint({
  canFullscreen,
  className,
}: {
  canFullscreen: boolean;
  className?: string;
}) {
  return (
    <div className={`w-full max-w-sm border-t border-border pt-4 text-left ${className ?? ""}`}>
      <p
        id="controls-hint-label"
        className="font-display text-xs font-medium uppercase tracking-widest text-muted"
      >
        Controls
      </p>
      <dl aria-labelledby="controls-hint-label" className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {CONTROL_ROWS.filter((row) => !row.fullscreenOnly || canFullscreen).map((row) => (
          <Fragment key={row.action}>
            <dt className="font-medium text-accent">{row.action}</dt>
            <dd className="text-fg">{row.binding}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-bg/60 px-5 py-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="my-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-surface/95 px-6 py-8 text-center">
        {children}
      </div>
    </div>
  );
}
