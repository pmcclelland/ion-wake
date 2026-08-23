export type Mode = "title" | "playing" | "paused" | "over" | "scores";

export type EnemyKind = "scout" | "fighter" | "bomber";
export type PowerKind = "multi" | "shield" | "speed" | "life";
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
  combo: number;
  banner: string | null;
  overScore: number;
  overWave: number;
  isHigh: boolean;
  scores: ScoreRow[];
  muted: boolean;
};

export const defaultHud = (): HudState => ({
  mode: "title",
  score: 0,
  lives: 3,
  wave: 1,
  shield: 0,
  multi: 1,
  speed: 0,
  combo: 0,
  banner: null,
  overScore: 0,
  overWave: 1,
  isHigh: false,
  scores: [],
  muted: false,
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
};
