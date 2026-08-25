export const WORLD_W = 390;
export const WORLD_H = 844;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return s;
}

export function parseRoomCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(c) ? c : null;
}

export function p2pRoomId(code: string): string {
  return `iw${code}`;
}

export type NetRole = "solo" | "host" | "guest";
export type PeerPhase = "idle" | "waiting" | "connecting" | "connected" | "failed" | "full" | "left";

export type ShipSnap = {
  x: number;
  y: number;
  ti: number;
  d: number;
  sh: number;
  mu: number;
  sp: number;
  nk: number;
  iv: number;
};

export type SnapMsg = {
  t: "s";
  sc: number;
  lv: number;
  wv: number;
  cb: number;
  bn: string;
  boom?: { x: number; y: number };
  sh: [ShipSnap, ShipSnap];
  en: Array<{ k: string; x: number; y: number; vx: number; hp: number; fl: number }>;
  bu: Array<{ x: number; y: number; vx: number; vy: number; f: number; r: number }>;
  pk: Array<{ k: string; x: number; y: number }>;
};

export type InpMsg = { t: "i"; x: number; y: number; n?: number };
export type StartMsg = { t: "go" };
export type PauseMsg = { t: "p"; on: number };
export type OverMsg = { t: "x"; sc: number; wv: number };
export type LeftMsg = { t: "bye" };

export type NetMsg = SnapMsg | InpMsg | StartMsg | PauseMsg | OverMsg | LeftMsg;

export function asNetMsg(data: unknown): NetMsg | null {
  if (!data || typeof data !== "object") return null;
  const t = (data as { t?: unknown }).t;
  if (t === "s" || t === "i" || t === "go" || t === "p" || t === "x" || t === "bye") {
    return data as NetMsg;
  }
  return null;
}
