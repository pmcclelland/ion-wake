import type { ScoreRow } from "./types";

const KEY = "ionwake-save-v1";
const MEM = "__ionwakeSaveV1";
const VERSION = 1;
const MAX = 8;
const IDB_NAME = "ionwake";
const IDB_STORE = "kv";

export type SaveState = {
  version: number;
  scores: ScoreRow[];
  muted: boolean;
};

const defaults = (): SaveState => ({ version: VERSION, scores: [], muted: false });

declare global {
  interface Window {
    [MEM]?: string;
  }
}

function parse(raw: string | null | undefined): SaveState {
  if (!raw) return defaults();
  try {
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const scores = Array.isArray(parsed.scores)
      ? parsed.scores
          .filter(
            (s): s is ScoreRow =>
              !!s &&
              typeof s.name === "string" &&
              typeof s.score === "number" &&
              Number.isFinite(s.score) &&
              typeof s.wave === "number" &&
              Number.isFinite(s.wave),
          )
          .map((s) => ({
            name: s.name.slice(0, 3).toUpperCase() || "ACE",
            score: Math.max(0, Math.round(s.score)),
            wave: Math.max(1, Math.round(s.wave)),
            at: typeof s.at === "number" && Number.isFinite(s.at) ? s.at : 0,
          }))
      : [];
    return {
      version: VERSION,
      scores: sortScores(scores),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return defaults();
  }
}

function scoreKey(s: ScoreRow): string {
  return `${s.at}|${s.name}|${s.score}|${s.wave}`;
}

function sortScores(scores: ScoreRow[]): ScoreRow[] {
  return [...scores].sort((a, b) => b.score - a.score || b.at - a.at).slice(0, MAX);
}

export function mergeScores(a: ScoreRow[], b: ScoreRow[]): ScoreRow[] {
  const map = new Map<string, ScoreRow>();
  for (const s of [...a, ...b]) map.set(scoreKey(s), s);
  return sortScores([...map.values()]);
}

function readLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function readMem(): string | null {
  try {
    const v = window[MEM];
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function writeAll(raw: string): void {
  try {
    window[MEM] = raw;
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* private mode / iframe */
  }
  try {
    sessionStorage.setItem(KEY, raw);
  } catch {
    /* ignore */
  }
  void idbSet(raw);
}

function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(): Promise<string | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const g = tx.objectStore(IDB_STORE).get(KEY);
      g.onsuccess = () => resolve(typeof g.result === "string" ? g.result : null);
      g.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(raw: string): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  try {
    db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(raw, KEY);
  } catch {
    /* ignore */
  }
}

export function loadSave(): SaveState {
  return parse(readLocal() ?? readSession() ?? readMem());
}

export async function hydrateSave(): Promise<SaveState> {
  const local = loadSave();
  const fromIdb = parse(await idbGet());
  const merged: SaveState = {
    version: VERSION,
    muted: local.muted,
    scores: mergeScores(local.scores, fromIdb.scores),
  };
  persistSave(merged);
  return merged;
}

export function persistSave(save: SaveState): void {
  const existing = loadSave();
  const merged: SaveState = {
    version: VERSION,
    muted: save.muted,
    scores: mergeScores(existing.scores, save.scores),
  };
  writeAll(JSON.stringify(merged));
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

export function isHighScore(scores: ScoreRow[], score: number): boolean {
  if (score <= 0) return false;
  if (scores.length < MAX) return true;
  return score > (scores[scores.length - 1]?.score ?? 0);
}

export function insertScore(scores: ScoreRow[], row: ScoreRow): ScoreRow[] {
  return mergeScores(scores, [row]);
}

export function formatTag(name: string): string {
  const n = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3) || "ACE";
  return n.padEnd(3, "·");
}
