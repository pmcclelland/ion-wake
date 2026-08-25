export type Mode = "title" | "lobby" | "playing" | "paused" | "over" | "scores";
export type NetRole = "solo" | "host" | "guest";
export type PeerPhase = "idle" | "waiting" | "connecting" | "connected" | "failed" | "full" | "left";

export type EnemyKind = "scout" | "fighter" | "bomber";
export type PowerKind = "multi" | "shield" | "speed" | "life" | "nuke";
export type Pattern = "sine" | "dive" | "hold" | "seek" | "form";

export type ScoreRow = {
  name: string;
  score: number;
  wave: number;
  at: number;
};

export type HudState = {
  mode: Mode;
  score: number;
  lives: number;
  wave: number;
  shield: number;
  multi: number;
  speed: number;
  nukes: number;
  combo: number;
  banner: string | null;
  overScore: number;
  overWave: number;
  isHigh: boolean;
  scores: ScoreRow[];
  muted: boolean;
  coop: boolean;
  netRole: NetRole;
  roomCode: string | null;
  shareUrl: string | null;
  peerPhase: PeerPhase;
  peerReady: boolean;
};

export const defaultHud = (): HudState => ({
  mode: "title",
  score: 0,
  lives: 3,
  wave: 1,
  shield: 0,
  multi: 1,
  speed: 0,
  nukes: 0,
  combo: 0,
  banner: null,
  overScore: 0,
  overWave: 1,
  isHigh: false,
  scores: [],
  muted: false,
  coop: false,
  netRole: "solo",
  roomCode: null,
  shareUrl: null,
  peerPhase: "idle",
  peerReady: false,
});

export type GameAPI = {
  start: () => void;
  destroy: () => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  toTitle: () => void;
  showScores: () => void;
  setMuted: (muted: boolean) => void;
  submitName: (name: string) => void;
  unlockAudio: () => void;
  fireNuke: () => void;
  playTogether: () => void;
  startCoop: () => void;
  leaveCoop: () => void;
};
