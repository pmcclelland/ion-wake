import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { AudioBus } from "./audio";
import {
  WORLD_H,
  WORLD_W,
  asNetMsg,
  makeRoomCode,
  p2pRoomId,
  parseRoomCode,
  type InpMsg,
  type NetRole,
  type PeerPhase,
  type ShipSnap,
  type SnapMsg,
} from "./coop";
import { Input, type Actions } from "./input";
import { formatTag, hydrateSave, insertScore, isHighScore, loadSave, mergeScores, persistSave, type SaveState } from "./save";
import { drawSprite, loadAtlas, type Atlas } from "./sprites";
import { defaultHud, type EnemyKind, type HudState, type Mode, type Pattern, type PowerKind } from "./types";

const STEP = 1 / 60;
const TOUCH_LIFT = 72;
const NUKE_MAX = 2;
const NUKE_DMG = 8;
const SPEED_MAX = 2;
const SHIELD_MAX = 3;
const NET_HZ = 0.05;
const CONNECT_MS = 14000;

type Bullet = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  from: "player" | "enemy";
  life: number;
};
type Enemy = {
  alive: boolean;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  fire: number;
  pattern: Pattern;
  t: number;
  phase: number;
  score: number;
  flash: number;
  originX: number;
};
type Pickup = { alive: boolean; kind: PowerKind; x: number; y: number; t: number };
type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};
type Burst = { alive: boolean; x: number; y: number; t: number; max: number; scale: number };
type Shock = { alive: boolean; x: number; y: number; t: number; max: number };
type Floater = { alive: boolean; x: number; y: number; text: string; t: number };
type Star = { x: number; y: number; z: number; s: number };
type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  lives: number;
  invuln: number;
  fireCd: number;
  multi: number;
  shield: number;
  speed: number;
  nukes: number;
  nukeCd: number;
  dead: boolean;
  respawn: number;
  tilt: number;
  wantNuke: boolean;
};

function blankShip(): Ship {
  return {
    x: WORLD_W / 2,
    y: WORLD_H * 0.78,
    vx: 0,
    vy: 0,
    r: 14,
    lives: 3,
    invuln: 0,
    fireCd: 0,
    multi: 1,
    shield: 0,
    speed: 0,
    nukes: 0,
    nukeCd: 0,
    dead: false,
    respawn: 0,
    tilt: 0,
    wantNuke: false,
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const KIND: Record<
  EnemyKind,
  { r: number; hp: number; score: number; size: number; fire: number }
> = {
  scout: { r: 12, hp: 1, score: 100, size: 36, fire: 0 },
  fighter: { r: 16, hp: 3, score: 250, size: 48, fire: 1.35 },
  bomber: { r: 26, hp: 10, score: 600, size: 76, fire: 1.7 },
};

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private audio = new AudioBus();
  private atlas: Atlas | null = null;
  private onHud: (h: HudState) => void;
  private raf = 0;
  private running = false;
  private acc = 0;
  private last = 0;
  private w = WORLD_W;
  private h = WORLD_H;
  private viewW = 390;
  private viewH = 844;
  private ox = 0;
  private oy = 0;
  private scale = 1;
  private dpr = 1;
  private reduced = false;
  private hudKey = "";

  private mode: Mode = "title";
  private save: SaveState;
  private hud = defaultHud();
  private bannerT = 0;
  private banner = "";
  private hitstop = 0;
  private trauma = 0;
  private time = 0;

  private player: Ship = blankShip();
  private mate: Ship | null = null;
  private netRole: NetRole = "solo";
  private p2p: P2PRoom | null = null;
  private selfId = "";
  private roomCode: string | null = null;
  private peerPhase: PeerPhase = "idle";
  private peerReady = false;
  private connectUntil = 0;
  private lastNet = 0;
  private mateIn: InpMsg | null = null;
  private pendingBoom: { x: number; y: number } | null = null;
  private onRoomCode: ((code: string | null) => void) | null = null;
  private score = 0;
  private wave = 1;
  private combo = 0;
  private comboT = 0;
  private spawnQ: Array<{ t: number; kind: EnemyKind; x: number; pattern: Pattern; phase: number }> =
    [];
  private waveT = 0;
  private between = 0;
  private nextLifeAt = 10000;
  private pendingHigh: { score: number; wave: number } | null = null;

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private bursts: Burst[] = [];
  private shocks: Shock[] = [];
  private muzzles: Burst[] = [];
  private flash = 0;
  private floaters: Floater[] = [];
  private stars: Star[] = [];
  private nebula: Array<{ x: number; y: number; r: number; c: string; v: number }> = [];
  private ro: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onHud: (h: HudState) => void,
    opts?: { joinCode?: string | null; onRoomCode?: (code: string | null) => void },
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    this.ctx = ctx;
    this.onHud = onHud;
    this.onRoomCode = opts?.onRoomCode ?? null;
    this.input = new Input(canvas);
    this.save = loadSave();
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.audio.setMuted(this.save.muted);
    this.resize();
    this.seedStars();
    this.resetPlayer(true);
    this.pushHud();
    void loadAtlas().then((a) => {
      this.atlas = a;
    });
    void hydrateSave().then((s) => {
      this.save.scores = s.scores;
      if (!this.save.muted) this.save.muted = s.muted;
      this.audio.setMuted(this.save.muted);
      this.pushHud();
    });
    void this.syncRemoteScores();
    this.wireControlsTest();
    const join = parseRoomCode(opts?.joinCode);
    if (join) queueMicrotask(() => this.joinAsGuest(join));
    window.addEventListener("resize", this.onResize);
    document.addEventListener("fullscreenchange", this.onResize);
    document.addEventListener("webkitfullscreenchange", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    window.addEventListener("pagehide", this.onHide);
    window.visualViewport?.addEventListener("resize", this.onResize);
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      try {
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        dt = Math.min(dt, 0.1);
        this.acc += dt;
        const actions = this.input.poll();
        this.pumpNet(now);
        if (this.mode === "playing" && actions.pausePressed) this.pause();
        else if (this.mode === "paused" && actions.pausePressed) this.resume();
        let steps = 0;
        while (this.acc >= STEP && steps < 6) {
          if (this.mode === "playing") {
            if (this.hitstop > 0) {
              this.hitstop -= STEP;
              this.player.nukeCd = Math.max(0, this.player.nukeCd - STEP);
              if (this.mate) this.mate.nukeCd = Math.max(0, this.mate.nukeCd - STEP);
            } else this.step(STEP, actions);
          } else if (this.mode === "lobby") {
            this.watchLobby(now);
          }
          this.acc -= STEP;
          this.time += STEP;
          steps++;
        }
        if (this.acc > STEP * 6) this.acc = 0;
        this.draw(actions, dt);
      } catch {
        this.acc = 0;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.commitPending();
    persistSave(this.save);
    this.closeNet();
    this.input.destroy();
    this.ro?.disconnect();
    this.ro = null;
    window.removeEventListener("resize", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    document.removeEventListener("fullscreenchange", this.onResize);
    document.removeEventListener("webkitfullscreenchange", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    window.removeEventListener("pagehide", this.onHide);
    if (window.__controlsTest) delete window.__controlsTest;
  }

  unlockAudio(): void {
    this.audio.unlock();
  }

  play(): void {
    this.audio.unlock();
    this.audio.ui();
    this.commitPending();
    this.closeNet();
    this.netRole = "solo";
    this.beginRun();
  }

  playTogether(): void {
    this.audio.unlock();
    this.audio.ui();
    this.commitPending();
    const code = makeRoomCode();
    this.openNet("host", code);
  }

  startCoop(): void {
    if (this.netRole !== "host" || !this.peerReady) return;
    this.audio.unlock();
    this.audio.ui();
    this.p2p?.send({ t: "go" });
    this.beginRun();
  }

  leaveCoop(): void {
    this.audio.ui();
    this.closeNet();
    this.mode = "title";
    this.banner = "";
    this.pushHud();
  }

  pause(): void {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    if (this.netRole !== "solo") this.p2p?.send({ t: "p", on: 1 });
    this.pushHud();
  }

  resume(): void {
    if (this.mode !== "paused") return;
    this.audio.unlock();
    this.mode = "playing";
    if (this.netRole !== "solo") this.p2p?.send({ t: "p", on: 0 });
    this.pushHud();
  }

  restart(): void {
    this.audio.unlock();
    this.commitPending();
    if (this.netRole === "guest") {
      this.p2p?.send({ t: "go" });
      return;
    }
    if (this.netRole === "host") this.p2p?.send({ t: "go" });
    this.beginRun();
  }

  toTitle(): void {
    this.commitPending();
    this.closeNet();
    this.mode = "title";
    this.banner = "";
    this.pushHud();
  }

  showScores(): void {
    this.commitPending();
    this.refreshScores();
    this.mode = "scores";
    this.pushHud();
  }

  setMuted(muted: boolean): void {
    this.save.muted = muted;
    persistSave(this.save);
    this.audio.setMuted(muted);
    this.pushHud();
  }

  fireNuke(): void {
    this.player.wantNuke = true;
    if (this.netRole === "guest") {
      this.p2p?.send({ t: "i", x: this.player.x, y: this.player.y, n: 1 });
      return;
    }
    if (this.tryNukeFrom(this.player)) this.player.wantNuke = false;
  }

  submitName(name: string): void {
    this.commitPending(name);
    this.mode = "scores";
    this.pushHud();
  }

  private commitPending(name = ""): void {
    if (!this.pendingHigh) return;
    const pending = this.pendingHigh;
    this.pendingHigh = null;
    const row = {
      name: formatTag(name),
      score: pending.score,
      wave: pending.wave,
      at: Date.now(),
    };
    this.save.scores = insertScore(this.save.scores, row);
    persistSave(this.save);
    void this.pushRemoteScore(row);
  }

  private async syncRemoteScores(): Promise<void> {
    try {
      const { listScores } = await import("@/lib/scores");
      const remote = await listScores();
      if (!Array.isArray(remote) || remote.length === 0) return;
      this.save.scores = mergeScores(this.save.scores, remote);
      persistSave(this.save);
      this.pushHud();
    } catch {
      /* local board still works */
    }
  }

  private async pushRemoteScore(row: {
    name: string;
    score: number;
    wave: number;
    at: number;
  }): Promise<void> {
    try {
      const { submitScore } = await import("@/lib/scores");
      const remote = await submitScore({ data: row });
      if (!Array.isArray(remote)) return;
      this.save.scores = mergeScores(this.save.scores, remote);
      persistSave(this.save);
      this.pushHud();
    } catch {
      /* kept locally */
    }
  }

  private refreshScores(): void {
    const disk = loadSave();
    this.save.scores = mergeScores(disk.scores, this.save.scores);
  }

  private beginRun(): void {
    this.mode = "playing";
    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboT = 0;
    this.nextLifeAt = 10000;
    this.hitstop = 0;
    this.trauma = 0;
    this.between = 0.2;
    this.spawnQ = [];
    this.waveT = 0;
    this.clearWorld();
    const coop = this.netRole !== "solo";
    if (coop && !this.mate) this.mate = blankShip();
    if (!coop) this.mate = null;
    const localLane = this.netRole === "guest" ? 1 : this.netRole === "host" ? -1 : 0;
    this.resetShip(this.player, true, localLane);
    this.player.lives = 3;
    if (this.mate) this.resetShip(this.mate, true, -localLane);
    this.flash = 0;
    this.pushHud();
  }

  private gameOver(): void {
    this.mode = "over";
    this.hud.overScore = this.score;
    this.hud.overWave = this.wave;
    const coop = this.netRole !== "solo";
    this.hud.isHigh = !coop && isHighScore(this.save.scores, this.score);
    if (this.hud.isHigh) {
      this.pendingHigh = { score: this.score, wave: Math.max(1, this.wave) };
    } else {
      this.pendingHigh = null;
    }
    if (this.netRole === "host") this.p2p?.send({ t: "x", sc: this.score, wv: this.wave });
    this.pushHud();
  }

  private resetPlayer(center: boolean): void {
    this.resetShip(
      this.player,
      center,
      this.mate ? (this.netRole === "guest" ? 1 : -1) : 0,
    );
  }

  private resetShip(s: Ship, center: boolean, lane: number): void {
    s.x = this.w / 2 + lane * 52;
    s.y = this.h * (center ? 0.78 : 0.82);
    s.vx = 0;
    s.vy = 0;
    s.dead = false;
    s.invuln = center ? 0 : 2;
    s.respawn = 0;
    s.fireCd = 0;
    s.nukeCd = 0;
    s.tilt = 0;
    s.multi = 1;
    s.shield = 0;
    s.speed = 0;
    s.nukes = 0;
    s.wantNuke = false;
  }

  private clearWorld(): void {
    for (const list of [
      this.bullets,
      this.enemies,
      this.pickups,
      this.particles,
      this.bursts,
      this.shocks,
      this.muzzles,
      this.floaters,
    ]) {
      for (const o of list) o.alive = false;
    }
  }

  private step(dt: number, a: Actions): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner = "";
    }
    this.updatePlayer(dt, a);
    if (this.netRole !== "guest") {
      this.updateMate(dt);
      this.updateWave(dt);
      this.updateEnemies(dt);
      this.updateBullets(dt);
      this.updatePickups(dt);
      this.collide();
    } else {
      this.updateBullets(dt);
      this.updatePickups(dt);
    }
    this.updateFx(dt);
    this.pushHud();
  }

  private speedMul(s: Ship = this.player): number {
    return 1 + s.speed * 0.28;
  }

  private updatePlayer(dt: number, a: Actions): void {
    const s = this.player;
    if (s.dead) {
      s.wantNuke = false;
      s.respawn -= dt;
      if (s.respawn <= 0) {
        if (this.player.lives <= 0) {
          if (this.netRole !== "guest") this.gameOver();
          return;
        }
        this.resetPlayer(false);
      }
      return;
    }
    s.invuln = Math.max(0, s.invuln - dt);
    s.fireCd = Math.max(0, s.fireCd - dt);
    s.nukeCd = Math.max(0, s.nukeCd - dt);
    if (a.nukePressed) s.wantNuke = true;
    if (s.wantNuke) {
      if (this.netRole === "guest") {
        this.p2p?.send({ t: "i", x: s.x, y: s.y, n: 1 });
        s.wantNuke = false;
      } else if (this.tryNukeFrom(s)) s.wantNuke = false;
    }
    if (s.nukes <= 0) s.wantNuke = false;

    const usingPointer = a.pointerActive && a.pointerX != null && a.pointerY != null;
    const usingKeys = Math.abs(a.moveX) + Math.abs(a.moveY) > 0.05;

    if (usingKeys) {
      const accel = 2200 * this.speedMul(s);
      const max = 310 * this.speedMul(s);
      this.player.vx += a.moveX * accel * dt;
      this.player.vy += a.moveY * accel * dt;
      const sp = Math.hypot(this.player.vx, this.player.vy);
      if (sp > max) {
        this.player.vx *= max / sp;
        this.player.vy *= max / sp;
      }
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
    } else if (usingPointer && a.pointerX != null && a.pointerY != null) {
      const wpt = this.toWorld(a.pointerX, a.pointerY);
      const tx = wpt.x;
      const ty = a.pointerIsTouch ? wpt.y - TOUCH_LIFT : wpt.y;
      const k = 16 * this.speedMul(s);
      const nx = this.player.x + (tx - this.player.x) * (1 - Math.exp(-k * dt));
      const ny = this.player.y + (ty - this.player.y) * (1 - Math.exp(-k * dt));
      this.player.vx = (nx - this.player.x) / Math.max(dt, 0.0001);
      this.player.vy = (ny - this.player.y) / Math.max(dt, 0.0001);
      this.player.x = nx;
      this.player.y = ny;
    } else {
      const damp = Math.exp(-7 * dt);
      this.player.vx *= damp;
      this.player.vy *= damp;
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
    }

    const m = 28;
    this.player.x = clamp(this.player.x, m, this.w - m);
    this.player.y = clamp(this.player.y, m + 36, this.h - m - 8);
    this.player.tilt += (this.player.vx * 0.00115 - this.player.tilt) * (1 - Math.exp(-12 * dt));

    if (this.player.fireCd <= 0) {
      if (this.netRole !== "guest") this.fireFrom(this.player);
      this.player.fireCd = this.player.multi >= 5 ? 0.09 : 0.12;
    }

    if (Math.random() < 0.55) {
      this.spawnParticle(
        this.player.x + rand(-4, 4),
        this.player.y + 18,
        rand(-12, 12),
        rand(40, 90),
        rand(0.18, 0.35),
        rand(1.2, 2.4),
        "rgba(110,200,224,0.7)",
      );
    }
  }

  private fireFrom(s: Ship): void {
    const angles =
      s.multi >= 5 ? [-0.32, -0.16, 0, 0.16, 0.32] : s.multi >= 3 ? [-0.18, 0, 0.18] : [0];
    const speed = 640;
    for (const ang of angles) {
      this.spawnBullet(
        s.x + Math.sin(ang) * 8,
        s.y - 20,
        Math.sin(ang) * speed,
        -Math.cos(ang) * speed,
        "player",
        4.2,
        1.4,
      );
    }
    this.spawnMuzzle(s.x, s.y - 22);
    this.audio.shoot();
    if (!this.reduced) this.trauma = Math.min(1, this.trauma + 0.05);
  }

  private updateWave(dt: number): void {
    this.waveT += dt;
    this.spawnQ = this.spawnQ.filter((s) => {
      if (this.waveT >= s.t) {
        this.spawnEnemy(s.kind, s.x, s.pattern, s.phase);
        return false;
      }
      return true;
    });
    const live = this.enemies.some((e) => e.alive);
    if (!live && this.spawnQ.length === 0) {
      this.between -= dt;
      if (this.between <= 0) this.nextWave();
    }
  }

  private nextWave(): void {
    this.wave += 1;
    this.waveT = 0;
    this.between = 1.5;
    this.banner = `WAVE ${this.wave}`;
    this.bannerT = 1.8;
    this.audio.wave();
    this.queueWave(this.wave);
    if (this.wave > 1) this.score += (this.wave - 1) * 250;
  }

  private queueWave(n: number): void {
    const W = this.w;
    const q = this.spawnQ;
    const push = (t: number, kind: EnemyKind, x: number, pattern: Pattern, phase = 0) => {
      q.push({ t, kind, x, pattern, phase });
    };
    if (n === 1) {
      for (let i = 0; i < 5; i++) {
        push(0.3 + i * 0.08, "scout", W / 2 + (i - 2) * 52, "form", i);
      }
    } else if (n === 2) {
      for (let i = 0; i < 6; i++) push(0.2, "scout", 50 + (i * (W - 100)) / 5, "sine", i);
      for (let i = 0; i < 6; i++) push(1.6, "scout", 70 + (i * (W - 140)) / 5, "sine", i + 3);
    } else if (n === 3) {
      for (let i = 0; i < 4; i++) push(0.25 + i * 0.15, "fighter", 80 + i * ((W - 160) / 3), "dive", i);
    } else if (n % 5 === 0) {
      push(0.3, "bomber", W / 2, "hold");
      for (let i = 0; i < 4; i++) push(0.5, "scout", 60 + i * ((W - 120) / 3), "sine", i);
      if (n >= 10) {
        push(1.2, "fighter", W * 0.3, "seek");
        push(1.2, "fighter", W * 0.7, "seek");
      }
    } else {
      const scouts = Math.min(5 + n, 12);
      const fighters = Math.min(1 + Math.floor(n / 2), 6);
      for (let i = 0; i < scouts; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        push(0.2 + row * 0.9, "scout", 48 + col * ((W - 96) / 5), row % 2 ? "dive" : "sine", i);
      }
      for (let i = 0; i < fighters; i++) {
        push(0.8 + i * 0.25, "fighter", 70 + (i * (W - 140)) / Math.max(1, fighters - 1), "seek", i);
      }
      if (n > 6 && n % 4 === 0) push(1.4, "bomber", W * (0.3 + 0.4 * Math.random()), "hold");
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, pattern: Pattern, phase: number): void {
    const spec = KIND[kind];
    const hp = spec.hp + Math.floor((this.wave - 1) / 4);
    const e = this.take(this.enemies, () => ({
      alive: true,
      kind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 0,
      hp: 1,
      fire: 0,
      pattern: "sine" as Pattern,
      t: 0,
      phase: 0,
      score: 0,
      flash: 0,
      originX: 0,
    }));
    e.alive = true;
    e.kind = kind;
    e.x = clamp(x, 36, this.w - 36);
    e.y = -30;
    e.vx = 0;
    e.vy = kind === "bomber" ? 55 : kind === "fighter" ? 80 : 95;
    e.r = spec.r;
    e.hp = hp;
    e.fire = rand(0.4, 1.1);
    e.pattern = pattern;
    e.t = 0;
    e.phase = phase;
    e.score = spec.score;
    e.flash = 0;
    e.originX = e.x;
  }

  private updateEnemies(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.pattern === "sine") {
        e.vy = 70 + this.wave * 3;
        e.x = e.originX + Math.sin(e.t * 2.2 + e.phase) * 46;
        e.y += e.vy * dt;
      } else if (e.pattern === "dive") {
        e.vy = 160 - Math.min(90, e.t * 80);
        e.x += Math.sin(e.t * 3 + e.phase) * 40 * dt;
        e.y += Math.max(50, e.vy) * dt;
      } else if (e.pattern === "hold") {
        if (e.y < this.h * 0.22) e.y += 70 * dt;
        else e.x = e.originX + Math.sin(e.t * 0.8) * 70;
      } else if (e.pattern === "seek") {
        const dx = px - e.x;
        const dy = py - e.y;
        const m = Math.hypot(dx, dy) || 1;
        const spd = 70 + this.wave * 4;
        e.vx += (dx / m) * spd * dt;
        e.vy += (dy / m) * spd * dt;
        const s = Math.hypot(e.vx, e.vy);
        const max = 140;
        if (s > max) {
          e.vx *= max / s;
          e.vy *= max / s;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else {
        e.y += (88 + this.wave * 2) * dt;
      }

      for (const o of this.enemies) {
        if (!o.alive || o === e) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const d = Math.hypot(dx, dy);
        const min = e.r + o.r + 6;
        if (d > 0 && d < min) {
          const p = ((min - d) / min) * 18 * dt;
          e.x += (dx / d) * p * 20;
          o.x -= (dx / d) * p * 20;
        }
      }

      e.x = clamp(e.x, 20, this.w - 20);

      const fireEvery = KIND[e.kind].fire;
      if (fireEvery > 0 && e.y > 20 && e.y < this.h * 0.72) {
        e.fire -= dt;
        if (e.fire <= 0) {
          e.fire = fireEvery * (0.85 + Math.random() * 0.3);
          this.enemyShoot(e);
        }
      } else if (e.kind === "scout" && this.wave >= 4 && e.y > 40 && e.y < this.h * 0.55) {
        e.fire -= dt;
        if (e.fire <= 0) {
          e.fire = 2.4;
          this.spawnBullet(e.x, e.y + e.r, 0, 240, "enemy", 4.5, 2.2);
        }
      }

      if (e.y > this.h + 40) e.alive = false;
    }
  }

  private enemyShoot(e: Enemy): void {
    const px = this.player.x;
    const py = this.player.y;
    const dx = px - e.x;
    const dy = py - e.y;
    const m = Math.hypot(dx, dy) || 1;
    const spd = 210 + this.wave * 8;
    if (e.kind === "bomber") {
      for (const ang of [-0.28, 0, 0.28]) {
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const vx = (dx / m) * ca * spd - (dy / m) * sa * spd;
        const vy = (dx / m) * sa * spd + (dy / m) * ca * spd;
        this.spawnBullet(e.x, e.y + 12, vx, vy, "enemy", 5.5, 2.6);
      }
    } else {
      this.spawnBullet(e.x, e.y + 10, (dx / m) * spd, (dy / m) * spd, "enemy", 5, 2.4);
    }
  }

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y < -20 || b.y > this.h + 20 || b.x < -20 || b.x > this.w + 20) {
        b.alive = false;
      }
    }
  }

  private updatePickups(dt: number): void {
    for (const p of this.pickups) {
      if (!p.alive) continue;
      p.t += dt;
      p.y += 70 * dt;
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < 80 && !this.player.dead) {
        p.x += (dx / d) * 220 * dt;
        p.y += (dy / d) * 220 * dt;
      }
      if (p.y > this.h + 30 || p.t > 12) p.alive = false;
    }
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 18 * dt;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
    for (const b of this.bursts) {
      if (!b.alive) continue;
      b.t += dt;
      if (b.t >= b.max) b.alive = false;
    }
    for (const m of this.muzzles) {
      if (!m.alive) continue;
      m.t += dt;
      if (m.t >= m.max) m.alive = false;
    }
    for (const s of this.shocks) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t >= s.max) s.alive = false;
    }
    for (const f of this.floaters) {
      if (!f.alive) continue;
      f.y -= 36 * dt;
      f.t -= dt;
      if (f.t <= 0) f.alive = false;
    }
  }

  private collide(): void {
    for (const b of this.bullets) {
      if (!b.alive || b.from !== "player") continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.alive = false;
          this.hurtEnemy(e);
          break;
        }
      }
    }
    const ships = this.livingShips();
    for (const s of ships) {
      if (s.invuln > 0) continue;
      for (const b of this.bullets) {
        if (!b.alive || b.from !== "enemy") continue;
        if (Math.hypot(b.x - s.x, b.y - s.y) < b.r + s.r) {
          b.alive = false;
          this.hurtShip(s);
        }
      }
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r - 4) {
          this.hurtShip(s);
          this.hurtEnemy(e, true);
        }
      }
    }
    for (const p of this.pickups) {
      if (!p.alive) continue;
      for (const s of ships) {
        if (Math.hypot(p.x - s.x, p.y - s.y) < 22) {
          const kind = p.kind;
          p.alive = false;
          this.collectFor(s, kind);
          break;
        }
      }
    }
  }

  private livingShips(): Ship[] {
    const out: Ship[] = [];
    if (!this.player.dead) out.push(this.player);
    if (this.mate && !this.mate.dead) out.push(this.mate);
    return out;
  }

  private hurtEnemy(e: Enemy, ram = false, opts?: { dmg?: number; drop?: boolean; sfx?: boolean }): void {
    e.hp -= opts?.dmg ?? (ram ? 4 : 1);
    e.flash = 0.08;
    if (opts?.sfx !== false) this.audio.hit();
    this.spawnParticle(e.x, e.y, rand(-80, 80), rand(-80, 40), 0.3, 2, "#e8eaef");
    if (e.hp <= 0) {
      e.alive = false;
      const mul = 1 + this.combo * 0.1;
      const pts = Math.round(e.score * mul);
      this.score += pts;
      this.combo += 1;
      this.comboT = 0.7;
      this.spawnFloater(e.x, e.y, `+${pts}`);
      this.explode(e.x, e.y, e.kind === "bomber" ? 1.4 : 1, opts?.sfx !== false);
      if (e.kind === "bomber" && !this.reduced) this.hitstop = Math.max(this.hitstop, 0.06);
      if (opts?.drop !== false) this.maybeDrop(e);
      if (this.score >= this.nextLifeAt) {
        this.player.lives += 1;
        this.nextLifeAt += 15000;
        this.spawnFloater(this.player.x, this.player.y - 30, "1-UP");
        this.audio.extraLife();
      }
    }
  }

  private hurtShip(s: Ship): void {
    if (s.dead || s.invuln > 0) return;
    if (s.shield > 0) {
      s.shield -= 1;
      s.invuln = 0.6;
      this.audio.hit();
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.burstRing(s.x, s.y, "rgba(110,200,224,0.9)");
      return;
    }
    s.dead = true;
    this.player.lives -= 1;
    s.respawn = 1.15;
    s.multi = 1;
    s.speed = 0;
    this.explode(s.x, s.y, 1.6);
    this.audio.dead();
    this.trauma = 1;
    if (!this.reduced) this.hitstop = 0.1;
  }

  private maybeDrop(e: Enemy): void {
    const chance = e.kind === "bomber" ? 0.7 : e.kind === "fighter" ? 0.28 : 0.1;
    if (Math.random() > chance) return;
    const roll = Math.random();
    const kind: PowerKind =
      roll < 0.32 ? "multi" : roll < 0.58 ? "shield" : roll < 0.82 ? "speed" : roll < 0.93 ? "life" : "nuke";
    const p = this.take(this.pickups, () => ({ alive: true, kind, x: 0, y: 0, t: 0 }));
    p.alive = true;
    p.kind = kind;
    p.x = e.x;
    p.y = e.y;
    p.t = 0;
  }

  private collect(kind: PowerKind): void {
    this.collectFor(this.player, kind);
  }

  private collectFor(s: Ship, kind: PowerKind): void {
    this.audio.pickup();
    this.spawnFloater(s.x, s.y - 24, kind.toUpperCase());
    if (kind === "multi") s.multi = s.multi >= 3 ? 5 : 3;
    else if (kind === "shield") s.shield = Math.min(SHIELD_MAX, s.shield + 1);
    else if (kind === "speed") s.speed = Math.min(SPEED_MAX, s.speed + 1);
    else if (kind === "nuke") s.nukes = Math.min(NUKE_MAX, s.nukes + 1);
    else {
      this.player.lives += 1;
      this.audio.extraLife();
    }
    this.clampShip(s);
    this.score += 50;
  }

  private clampStacks(): void {
    this.clampShip(this.player);
    if (this.mate) this.clampShip(this.mate);
  }

  private clampShip(s: Ship): void {
    s.speed = Math.min(SPEED_MAX, Math.max(0, s.speed | 0));
    s.shield = Math.min(SHIELD_MAX, Math.max(0, s.shield | 0));
    s.nukes = Math.min(NUKE_MAX, Math.max(0, s.nukes | 0));
    if (s.multi >= 5) s.multi = 5;
    else if (s.multi >= 3) s.multi = 3;
    else s.multi = 1;
  }

  private explode(x: number, y: number, scale = 1, sfx = true): void {
    const b = this.take(this.bursts, () => ({ alive: true, x, y, t: 0, max: 0.4, scale: 1 }));
    b.alive = true;
    b.x = x;
    b.y = y;
    b.t = 0;
    b.max = 0.42;
    b.scale = scale;
    if (sfx) this.audio.explode();
    this.trauma = Math.min(1, this.trauma + 0.28 * scale);
    for (let i = 0; i < 14 * scale; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = rand(40, 180) * scale;
      this.spawnParticle(
        x,
        y,
        Math.cos(ang) * s,
        Math.sin(ang) * s,
        rand(0.25, 0.55),
        rand(1.5, 3.5),
        "rgba(180,220,235,0.9)",
      );
    }
  }

  private tryNukeFrom(s: Ship): boolean {
    if (this.mode !== "playing") return false;
    if (s.dead || s.nukes <= 0 || s.nukeCd > 0) return false;
    s.nukes -= 1;
    s.nukeCd = 0.42;
    this.audio.nuke();
    this.trauma = 1;
    this.flash = this.reduced ? 0.28 : 0.85;
    if (!this.reduced) this.hitstop = Math.max(this.hitstop, 0.14);
    this.rumble(320, 1, 0.75);

    const ox = s.x;
    const oy = s.y;
    this.pendingBoom = { x: ox, y: oy };
    this.spawnShock(ox, oy, 0.42);
    this.spawnShock(ox, oy, 0.62);
    this.spawnShock(ox, oy, 0.88);

    const n = this.reduced ? 22 : 96;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = rand(70, 560);
      const col =
        i % 3 === 0 ? "rgba(232,234,239,0.95)" : i % 3 === 1 ? "rgba(110,200,224,0.92)" : "rgba(180,230,245,0.88)";
      this.spawnParticle(ox, oy, Math.cos(ang) * s, Math.sin(ang) * s, rand(0.45, 0.95), rand(2, 5.8), col);
    }
    const ring = this.reduced ? 10 : 28;
    for (let i = 0; i < ring; i++) {
      const ang = (i / ring) * Math.PI * 2;
      this.spawnParticle(ox, oy, Math.cos(ang) * 260, Math.sin(ang) * 260, 0.5, 3.4, "rgba(255,255,255,0.92)");
    }

    for (const b of this.bullets) {
      if (b.alive && b.from === "enemy") b.alive = false;
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < -28 || e.x > this.w + 28 || e.y < -28 || e.y > this.h + 28) continue;
      this.hurtEnemy(e, false, { dmg: NUKE_DMG, drop: false, sfx: false });
    }
    this.pushHud();
    return true;
  }

  private spawnShock(x: number, y: number, max: number): void {
    const s = this.take(this.shocks, () => ({ alive: true, x, y, t: 0, max }));
    s.alive = true;
    s.x = x;
    s.y = y;
    s.t = 0;
    s.max = max;
  }

  private rumble(ms: number, strong: number, weak: number): void {
    try {
      const list = navigator.getGamepads?.();
      if (!list) return;
      for (const pad of list) {
        if (!pad) continue;
        const act = pad.vibrationActuator;
        if (!act?.playEffect) continue;
        void act.playEffect("dual-rumble", {
          startDelay: 0,
          duration: ms,
          strongMagnitude: strong,
          weakMagnitude: weak,
        });
      }
    } catch {
      /* no haptics */
    }
  }

  private burstRing(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      this.spawnParticle(x, y, Math.cos(ang) * 140, Math.sin(ang) * 140, 0.35, 2.2, color);
    }
  }

  private spawnBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    from: "player" | "enemy",
    r: number,
    life: number,
  ): void {
    const b = this.take(this.bullets, () => ({
      alive: true,
      x,
      y,
      vx,
      vy,
      r,
      from,
      life,
    }));
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.r = r;
    b.from = from;
    b.life = life;
  }

  private spawnMuzzle(x: number, y: number): void {
    const m = this.take(this.muzzles, () => ({ alive: true, x, y, t: 0, max: 0.08, scale: 1 }));
    m.alive = true;
    m.x = x;
    m.y = y;
    m.t = 0;
    m.max = 0.07;
    m.scale = 1;
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
  ): void {
    let live = 0;
    for (const p of this.particles) if (p.alive) live++;
    if (live > 420) return;
    const p = this.take(this.particles, () => ({
      alive: true,
      x,
      y,
      vx,
      vy,
      life,
      max: life,
      size,
      color,
    }));
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.size = size;
    p.color = color;
  }

  private spawnFloater(x: number, y: number, text: string): void {
    const f = this.take(this.floaters, () => ({ alive: true, x, y, text, t: 0.8 }));
    f.alive = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.t = 0.85;
  }

  private take<T extends { alive: boolean }>(pool: T[], make: () => T): T {
    for (const o of pool) if (!o.alive) return o;
    const n = make();
    pool.push(n);
    return n;
  }

  private draw(a: Actions, frameDt: number): void {
    const ctx = this.ctx;
    const { viewW, viewH } = this;
    if (viewW < 2 || viewH < 2) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, viewW, viewH);

    const shake = this.reduced ? 0 : this.trauma * this.trauma;
    const sx = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
    const sy = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);
    ctx.beginPath();
    ctx.rect(0, 0, this.w, this.h);
    ctx.clip();
    ctx.translate(sx, sy);

    this.drawStars(this.mode === "playing" || this.mode === "lobby" ? 1 : 0.45, frameDt);
    this.drawNebula(frameDt);

    for (const p of this.pickups) if (p.alive) this.drawPickup(p);
    for (const b of this.bullets) if (b.alive && b.from === "enemy") this.drawBullet(b);
    for (const e of this.enemies) if (e.alive) this.drawEnemy(e);
    for (const b of this.bullets) if (b.alive && b.from === "player") this.drawBullet(b);
    if (this.mode === "playing" || this.mode === "paused") {
      if (this.mate && !this.mate.dead) this.drawShip(this.mate, true);
      if (!this.player.dead) this.drawShip(this.player, false);
    }
    for (const m of this.muzzles) if (m.alive) this.drawMuzzle(m);
    for (const b of this.bursts) if (b.alive) this.drawBurst(b);
    for (const s of this.shocks) if (s.alive) this.drawShock(s);
    for (const p of this.particles) if (p.alive) this.drawParticle(p);
    for (const f of this.floaters) if (f.alive) this.drawFloater(f);

    if (
      this.mode === "playing" &&
      a.pointerActive &&
      a.pointerIsTouch &&
      a.pointerX != null &&
      a.pointerY != null
    ) {
      const wpt = this.toWorld(a.pointerX, a.pointerY);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(232,234,239,0.18)";
      ctx.lineWidth = 1.5;
      ctx.arc(wpt.x, wpt.y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(210,236,245,${Math.min(1, this.flash) * 0.52})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  private drawStars(speed: number, dt: number): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      s.y += (22 + s.z * 140) * speed * dt;
      if (s.y > this.h + 4) {
        s.y = -4;
        s.x = Math.random() * this.w;
      }
      const a = 0.25 + s.z * 0.65;
      ctx.fillStyle = `rgba(232,234,239,${a})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
  }

  private drawNebula(dt: number): void {
    const ctx = this.ctx;
    for (const n of this.nebula) {
      n.y += n.v * dt;
      if (n.y > this.h + n.r) n.y = -n.r;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShip(p: Ship, mate: boolean): void {
    const blink = p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0;
    if (blink) return;
    const rot = p.tilt;
    const atlas = this.atlas;
    const ctx = this.ctx;
    ctx.save();
    if (mate) ctx.filter = "hue-rotate(160deg) saturate(1.15)";
    if (!drawSprite(ctx, atlas?.player ?? null, p.x, p.y, 56, rot)) {
      this.drawVectorShip(p.x, p.y, rot, mate ? "#e8c4a0" : "#e8eaef", mate ? "#e08a60" : "#6ec8e0", 18);
    }
    ctx.restore();
    if (p.shield > 0) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(this.time * 1.4);
      ctx.strokeStyle = `rgba(110,200,224,${0.35 + 0.15 * p.shield})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(ang) * 28;
        const y = Math.sin(ang) * 28;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawEnemy(e: Enemy): void {
    const rot = Math.PI + e.vx * 0.002;
    const size = KIND[e.kind].size;
    const img =
      e.kind === "scout"
        ? this.atlas?.scout
        : e.kind === "fighter"
          ? this.atlas?.fighter
          : this.atlas?.bomber;
    const ok = drawSprite(this.ctx, img ?? null, e.x, e.y, size, rot, e.flash > 0 ? 0.85 : 1);
    if (!ok) {
      const col = e.kind === "scout" ? "#c45c4a" : e.kind === "fighter" ? "#c47a4a" : "#8b90a0";
      this.drawVectorShip(e.x, e.y, rot, col, "#e8a060", size * 0.32);
    }
    if (e.flash > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.fillStyle = "rgba(255,255,255,0.35)";
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, size * 0.28, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawVectorShip(x: number, y: number, rot: number, hull: string, glow: string, s: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, s * 0.8);
    ctx.lineTo(0, s * 0.4);
    ctx.lineTo(-s * 0.72, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, s * 0.55, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBullet(b: Bullet): void {
    const img = b.from === "player" ? this.atlas?.playerBolt : this.atlas?.enemyBolt;
    const size = b.from === "player" ? 22 : 18;
    const rot = Math.atan2(b.vx, -b.vy);
    if (!drawSprite(this.ctx, img ?? null, b.x, b.y, size, rot)) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(rot);
      ctx.fillStyle = b.from === "player" ? "#9fe4f2" : "#e8a060";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPickup(p: Pickup): void {
    const bob = Math.sin(p.t * 4) * 3;
    const img = this.atlas?.power[p.kind] ?? null;
    if (!drawSprite(this.ctx, img, p.x, p.y + bob, 32)) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.fillStyle =
        p.kind === "nuke" ? "#9fe4f2" : p.kind === "shield" ? "#6ec8e0" : p.kind === "speed" ? "#7d9e86" : "#e8eaef";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMuzzle(m: Burst): void {
    const frames = this.atlas?.muzzle ?? [];
    const i = Math.min(frames.length - 1, Math.floor((m.t / m.max) * frames.length));
    if (frames[i]) {
      drawSprite(this.ctx, frames[i], m.x, m.y, 34, 0, 1 - m.t / m.max);
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(180,230,245,${1 - m.t / m.max})`;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBurst(b: Burst): void {
    const frames = this.atlas?.explode ?? [];
    const i = Math.min(frames.length - 1, Math.floor((b.t / b.max) * frames.length));
    const size = 70 * b.scale * (0.7 + b.t / b.max);
    if (frames[i]) {
      drawSprite(this.ctx, frames[i], b.x, b.y, size, 0, 1 - (b.t / b.max) * 0.4);
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(180,230,245,${1 - b.t / b.max})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 12 * b.scale + (b.t / b.max) * 28 * b.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawShock(s: Shock): void {
    const k = s.max > 0 ? s.t / s.max : 1;
    const reach = Math.hypot(this.w, this.h) * 0.78;
    const r = Math.max(8, k * reach);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(180,230,245,${(1 - k) * 0.82})`;
    ctx.lineWidth = 7 * (1 - k) + 1.2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(232,234,239,${(1 - k) * 0.45})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const a = p.max > 0 ? p.life / p.max : 0;
    if (!Number.isFinite(a) || a <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  private drawFloater(f: Floater): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t * 2);
    ctx.fillStyle = "#e8eaef";
    ctx.font = "600 12px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  private seedStars(): void {
    this.stars = [];
    for (let i = 0; i < 140; i++) {
      this.stars.push({
        x: Math.random() * Math.max(this.w, 400),
        y: Math.random() * Math.max(this.h, 700),
        z: Math.random(),
        s: Math.random() < 0.7 ? 1 : 1.6,
      });
    }
    this.nebula = [
      { x: this.w * 0.2, y: this.h * 0.3, r: 140, c: "rgba(40,55,80,0.22)", v: 6 },
      { x: this.w * 0.8, y: this.h * 0.6, r: 180, c: "rgba(30,48,70,0.18)", v: 4 },
      { x: this.w * 0.5, y: this.h * 0.1, r: 120, c: "rgba(50,70,90,0.16)", v: 8 },
    ];
  }

  private onResize = (): void => this.resize();
  private onHide = (): void => {
    this.commitPending();
    persistSave(this.save);
  };
  private onVis = (): void => {
    if (document.hidden) {
      this.onHide();
      if (this.mode === "playing") this.pause();
    } else {
      this.refreshScores();
      this.audio.unlock();
      this.pushHud();
    }
  };

  private toWorld(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale };
  }

  private resize(): void {
    const cssW = Math.max(1, Math.round(this.canvas.clientWidth || window.innerWidth || 390));
    const cssH = Math.max(1, Math.round(this.canvas.clientHeight || window.innerHeight || 844));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bufW = Math.max(1, Math.floor(cssW * dpr));
    const bufH = Math.max(1, Math.floor(cssH * dpr));
    const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    const ox = (cssW - WORLD_W * scale) / 2;
    const oy = (cssH - WORLD_H * scale) / 2;
    if (
      cssW === this.viewW &&
      cssH === this.viewH &&
      dpr === this.dpr &&
      this.canvas.width === bufW &&
      scale === this.scale
    ) {
      return;
    }
    this.viewW = cssW;
    this.viewH = cssH;
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.scale = scale;
    this.ox = ox;
    this.oy = oy;
    this.dpr = dpr;
    this.canvas.width = bufW;
    this.canvas.height = bufH;
  }

  private pushHud(): void {
    this.clampStacks();
    const key = [
      this.mode,
      this.score,
      this.player.lives,
      this.wave,
      this.player.shield,
      this.player.multi,
      this.player.speed,
      this.player.nukes,
      this.combo,
      this.bannerT > 0 ? this.banner : "",
      this.save.muted,
      this.hud.isHigh,
      this.save.scores.length,
      this.save.scores[0]?.score ?? 0,
      this.save.scores[0]?.name ?? "",
      this.pendingHigh ? 1 : 0,
      this.netRole,
      this.roomCode ?? "",
      this.peerPhase,
      this.peerReady ? 1 : 0,
    ].join("|");
    if (key === this.hudKey) return;
    this.hudKey = key;
    const next: HudState = {
      mode: this.mode,
      score: this.score,
      lives: Math.max(0, this.player.lives),
      wave: Math.max(1, this.wave),
      shield: this.player.shield,
      multi: this.player.multi,
      speed: this.player.speed,
      nukes: this.player.nukes,
      combo: this.combo,
      banner: this.bannerT > 0 ? this.banner : null,
      overScore: this.hud.overScore,
      overWave: this.hud.overWave,
      isHigh: this.hud.isHigh,
      scores: this.save.scores,
      muted: this.save.muted,
      coop: this.netRole !== "solo",
      netRole: this.netRole,
      roomCode: this.roomCode,
      shareUrl: this.roomCode ? `${window.location.origin}/?r=${this.roomCode}` : null,
      peerPhase: this.peerPhase,
      peerReady: this.peerReady,
    };
    this.hud = next;
    try {
      this.onHud(next);
    } catch {
      /* overlay unmounted */
    }
  }

  private openNet(role: "host" | "guest", code: string): void {
    this.closeNet();
    this.netRole = role;
    this.roomCode = code;
    this.peerPhase = "connecting";
    this.peerReady = false;
    this.connectUntil = performance.now() + CONNECT_MS;
    this.mate = blankShip();
    this.selfId = `${role[0]}-${Math.random().toString(36).slice(2, 8)}`;
    this.mode = "lobby";
    this.onRoomCode?.(code);
    const p2p = new P2PRoom({
      room: p2pRoomId(code),
      selfId: this.selfId,
      name: role,
      onPeersChanged: (peers) => this.onPeers(peers),
      onMessage: (_from, data) => this.onNet(data),
      onConnected: () => this.pushHud(),
    });
    this.p2p = p2p;
    void p2p.join();
    this.pushHud();
  }

  private joinAsGuest(code: string): void {
    this.audio.unlock();
    this.openNet("guest", code);
  }

  private closeNet(): void {
    this.p2p?.close();
    this.p2p = null;
    this.netRole = "solo";
    this.roomCode = null;
    this.peerPhase = "idle";
    this.peerReady = false;
    this.mate = null;
    this.mateIn = null;
    this.onRoomCode?.(null);
  }

  private onPeers(peers: PeerInfo[]): void {
    const others = peers.filter((p) => p.id !== this.selfId);
    if (others.length > 1) {
      this.peerPhase = "full";
      this.peerReady = false;
      this.pushHud();
      return;
    }
    const p = others[0];
    if (!p) {
      if (this.peerReady && this.mode === "playing") {
        this.peerPhase = "left";
        if (this.netRole === "guest") {
          this.mode = "over";
          this.hud.isHigh = false;
          this.pendingHigh = null;
        } else {
          this.banner = "PARTNER LEFT";
          this.bannerT = 2;
        }
      } else if (this.peerPhase === "connected" || this.peerPhase === "connecting") {
        this.peerPhase = this.mode === "lobby" ? "waiting" : this.peerPhase;
        this.peerReady = false;
      }
      this.pushHud();
      return;
    }
    if (p.connectionState === "failed") {
      this.peerPhase = "failed";
      this.peerReady = false;
    } else if (p.connectionState === "connected") {
      this.peerPhase = "connected";
      this.peerReady = true;
    } else {
      this.peerPhase = "connecting";
      this.peerReady = false;
    }
    this.pushHud();
  }

  private watchLobby(now: number): void {
    if (this.peerPhase === "connecting" && now > this.connectUntil && !this.peerReady) {
      this.peerPhase = "failed";
      this.pushHud();
    }
  }

  private pumpNet(now: number): void {
    if (!this.p2p || this.netRole === "solo") return;
    if (now - this.lastNet < NET_HZ * 1000) return;
    this.lastNet = now;
    if (this.netRole === "host" && this.mode === "playing") {
      this.p2p.broadcast(this.buildSnap());
      this.pendingBoom = null;
    }
    if (this.netRole === "guest" && (this.mode === "playing" || this.mode === "paused")) {
      this.p2p.broadcast({ t: "i", x: this.player.x, y: this.player.y });
    }
  }

  private buildSnap(): SnapMsg {
    const pack = (s: Ship): ShipSnap => ({
      x: s.x,
      y: s.y,
      ti: s.tilt,
      d: s.dead ? 1 : 0,
      sh: s.shield,
      mu: s.multi,
      sp: s.speed,
      nk: s.nukes,
      iv: s.invuln,
    });
    const host = this.netRole === "host" ? this.player : this.mate ?? this.player;
    const guest = this.netRole === "guest" ? this.player : this.mate ?? this.player;
    return {
      t: "s",
      sc: this.score,
      lv: this.player.lives,
      wv: this.wave,
      cb: this.combo,
      bn: this.bannerT > 0 ? this.banner : "",
      boom: this.pendingBoom ?? undefined,
      sh: [pack(host), pack(guest)],
      en: this.enemies
        .filter((e) => e.alive)
        .map((e) => ({ k: e.kind, x: e.x, y: e.y, vx: e.vx, hp: e.hp, fl: e.flash })),
      bu: this.bullets
        .filter((b) => b.alive)
        .map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, f: b.from === "player" ? 1 : 0, r: b.r })),
      pk: this.pickups.filter((p) => p.alive).map((p) => ({ k: p.kind, x: p.x, y: p.y })),
    };
  }

  private applySnap(msg: SnapMsg): void {
    this.score = msg.sc;
    this.player.lives = msg.lv;
    this.wave = msg.wv;
    this.combo = msg.cb;
    if (msg.bn) {
      this.banner = msg.bn;
      this.bannerT = 1.2;
    }
    const local = this.netRole === "guest" ? msg.sh[1] : msg.sh[0];
    const remote = this.netRole === "guest" ? msg.sh[0] : msg.sh[1];
    this.player.multi = local.mu;
    this.player.shield = local.sh;
    this.player.speed = local.sp;
    this.player.nukes = local.nk;
    if (!this.mate) this.mate = blankShip();
    const k = 0.45;
    this.mate.x += (remote.x - this.mate.x) * k;
    this.mate.y += (remote.y - this.mate.y) * k;
    this.mate.tilt = remote.ti;
    this.mate.dead = !!remote.d;
    this.mate.shield = remote.sh;
    this.mate.multi = remote.mu;
    this.mate.speed = remote.sp;
    this.mate.nukes = remote.nk;
    this.mate.invuln = remote.iv;

    this.clearPool(this.enemies);
    for (const e of msg.en) {
      const n = this.take(this.enemies, () => ({
        alive: true,
        kind: "scout" as EnemyKind,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 12,
        hp: 1,
        fire: 0,
        pattern: "sine" as Pattern,
        t: 0,
        phase: 0,
        score: 100,
        flash: 0,
        originX: 0,
      }));
      const spec = KIND[(e.k as EnemyKind) in KIND ? (e.k as EnemyKind) : "scout"];
      n.alive = true;
      n.kind = (e.k as EnemyKind) in KIND ? (e.k as EnemyKind) : "scout";
      n.x = e.x;
      n.y = e.y;
      n.vx = e.vx;
      n.r = spec.r;
      n.hp = e.hp;
      n.flash = e.fl;
      n.score = spec.score;
    }
    this.clearPool(this.bullets);
    for (const b of msg.bu) {
      const n = this.take(this.bullets, () => ({
        alive: true,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 4,
        from: "player" as const,
        life: 1,
      }));
      n.alive = true;
      n.x = b.x;
      n.y = b.y;
      n.vx = b.vx;
      n.vy = b.vy;
      n.r = b.r;
      n.from = b.f ? "player" : "enemy";
      n.life = 1;
    }
    this.clearPool(this.pickups);
    for (const p of msg.pk) {
      const n = this.take(this.pickups, () => ({ alive: true, kind: "multi" as PowerKind, x: 0, y: 0, t: 0 }));
      n.alive = true;
      n.kind = (["multi", "shield", "speed", "life", "nuke"] as PowerKind[]).includes(p.k as PowerKind)
        ? (p.k as PowerKind)
        : "multi";
      n.x = p.x;
      n.y = p.y;
    }
  }

  private clearPool<T extends { alive: boolean }>(list: T[]): void {
    for (const o of list) o.alive = false;
  }

  private onNet(data: unknown): void {
    const msg = asNetMsg(data);
    if (!msg) return;
    if (msg.t === "i" && this.netRole === "host") {
      this.mateIn = msg;
      return;
    }
    if (msg.t === "s" && this.netRole === "guest") {
      this.applySnap(msg);
      if (msg.boom) {
        this.audio.nuke();
        this.flash = this.reduced ? 0.28 : 0.85;
        this.spawnShock(msg.boom.x, msg.boom.y, 0.42);
        this.spawnShock(msg.boom.x, msg.boom.y, 0.62);
        this.spawnShock(msg.boom.x, msg.boom.y, 0.88);
      }
      this.pushHud();
      return;
    }
    if (msg.t === "go") {
      if (this.netRole === "host" && (this.mode === "lobby" || this.mode === "over")) this.beginRun();
      if (this.netRole === "guest") this.beginRun();
      return;
    }
    if (msg.t === "p") {
      if (msg.on) {
        if (this.mode === "playing") this.mode = "paused";
      } else if (this.mode === "paused") this.mode = "playing";
      this.pushHud();
      return;
    }
    if (msg.t === "x" && this.netRole === "guest") {
      this.mode = "over";
      this.hud.overScore = msg.sc;
      this.hud.overWave = msg.wv;
      this.hud.isHigh = false;
      this.pendingHigh = null;
      this.pushHud();
    }
  }

  private updateMate(dt: number): void {
    if (!this.mate || this.netRole !== "host") return;
    const s = this.mate;
    s.invuln = Math.max(0, s.invuln - dt);
    s.fireCd = Math.max(0, s.fireCd - dt);
    s.nukeCd = Math.max(0, s.nukeCd - dt);
    if (s.dead) {
      s.respawn -= dt;
      if (s.respawn <= 0 && this.player.lives > 0) this.resetShip(s, false, 1);
      return;
    }
    if (this.mateIn) {
      const k = 18;
      s.x += (this.mateIn.x - s.x) * (1 - Math.exp(-k * dt));
      s.y += (this.mateIn.y - s.y) * (1 - Math.exp(-k * dt));
      if (this.mateIn.n) {
        this.tryNukeFrom(s);
        this.mateIn.n = 0;
      }
    }
    s.x = clamp(s.x, 28, this.w - 28);
    s.y = clamp(s.y, 64, this.h - 36);
    if (s.fireCd <= 0) {
      this.fireFrom(s);
      s.fireCd = s.multi >= 5 ? 0.09 : 0.12;
    }
  }

  private wireControlsTest(): void {
    window.__controlsTest = {
      getX: () => this.player.x,
      getY: () => this.player.y,
      getVx: () => this.player.vx,
      getVy: () => this.player.vy,
      getSpeed: () => Math.hypot(this.player.vx, this.player.vy),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      giveNukes: (n = NUKE_MAX) => {
        this.player.nukes = Math.max(0, Math.min(NUKE_MAX, n | 0));
        this.pushHud();
      },
      collectPower: (kind: "multi" | "shield" | "speed" | "life" | "nuke") => {
        this.collect(kind);
        this.pushHud();
      },
      getSpeedStacks: () => this.player.speed,
      getNukes: () => this.player.nukes,
      fireNuke: () => this.tryNukeFrom(this.player),
      countEnemies: () => this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0),
      countEnemyBullets: () =>
        this.bullets.reduce((n, b) => n + (b.alive && b.from === "enemy" ? 1 : 0), 0),
      forceHighScore: (score = 9999) => {
        this.score = score;
        this.wave = Math.max(this.wave, 1);
        this.player.lives = 0;
        this.player.dead = true;
        this.gameOver();
      },
    };
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getY: () => number;
      getVx: () => number;
      getVy: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      giveNukes?: (n?: number) => void;
      getNukes?: () => number;
      collectPower?: (kind: "multi" | "shield" | "speed" | "life" | "nuke") => void;
      getSpeedStacks?: () => number;
      fireNuke?: () => void;
      countEnemies?: () => number;
      countEnemyBullets?: () => number;
      forceHighScore: (score?: number) => void;
    };
  }
}
