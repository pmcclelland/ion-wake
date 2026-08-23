import { n as defaultHud } from "./routes-BNtTTwmr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-B6B_fsDq.js
var AudioBus = class {
	ctx = null;
	master = null;
	sfx = null;
	muted = false;
	voices = 0;
	unlock() {
		try {
			if (!this.ctx) {
				const Ctx = window.AudioContext || window.webkitAudioContext;
				try {
					this.ctx = new Ctx({ latencyHint: "interactive" });
				} catch {
					this.ctx = new Ctx();
				}
				this.master = this.ctx.createGain();
				this.sfx = this.ctx.createGain();
				this.sfx.connect(this.master);
				this.master.connect(this.ctx.destination);
				this.applyMute();
			}
			if (this.ctx.state === "suspended") this.ctx.resume();
		} catch {}
	}
	setMuted(muted) {
		this.muted = muted;
		this.applyMute();
	}
	applyMute() {
		if (!this.master || !this.ctx) return;
		this.master.gain.setTargetAtTime(this.muted ? 0 : .72, this.ctx.currentTime, .02);
	}
	tone(freq, dur, type, gain = .08, slide = 0) {
		if (!this.ctx || !this.sfx || this.muted || this.voices > 18) return;
		try {
			const t = this.ctx.currentTime;
			const osc = this.ctx.createOscillator();
			const g = this.ctx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(Math.max(40, freq), t);
			if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + Math.max(.01, dur));
			g.gain.setValueAtTime(Math.max(1e-4, gain), t);
			g.gain.exponentialRampToValueAtTime(1e-4, t + Math.max(.01, dur));
			osc.connect(g);
			g.connect(this.sfx);
			this.voices++;
			osc.onended = () => {
				this.voices = Math.max(0, this.voices - 1);
				try {
					osc.disconnect();
					g.disconnect();
				} catch {}
			};
			osc.start(t);
			osc.stop(t + dur + .02);
		} catch {}
	}
	noise(dur, cutoff, gain = .1) {
		if (!this.ctx || !this.sfx || this.muted || this.voices > 18) return;
		try {
			const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
			const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
			const src = this.ctx.createBufferSource();
			src.buffer = buf;
			const filter = this.ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = cutoff;
			const g = this.ctx.createGain();
			const t = this.ctx.currentTime;
			g.gain.setValueAtTime(Math.max(1e-4, gain), t);
			g.gain.exponentialRampToValueAtTime(1e-4, t + Math.max(.01, dur));
			src.connect(filter);
			filter.connect(g);
			g.connect(this.sfx);
			this.voices++;
			src.onended = () => {
				this.voices = Math.max(0, this.voices - 1);
				try {
					src.disconnect();
					filter.disconnect();
					g.disconnect();
				} catch {}
			};
			src.start(t);
			src.stop(t + dur + .02);
		} catch {}
	}
	shoot() {
		const r = .94 + Math.random() * .12;
		this.tone(920 * r, .045, "square", .035, .45);
		this.noise(.03, 2400, .04);
	}
	hit() {
		this.noise(.05, 1800, .08);
		this.tone(240, .06, "triangle", .04, .5);
	}
	explode() {
		this.noise(.28, 700, .16);
		this.tone(160, .22, "sawtooth", .05, .3);
	}
	pickup() {
		this.tone(523, .07, "sine", .07);
		this.tone(784, .1, "sine", .06);
	}
	dead() {
		this.noise(.4, 500, .18);
		this.tone(220, .45, "sawtooth", .07, .25);
	}
	wave() {
		this.tone(392, .12, "triangle", .05);
		this.tone(523, .16, "triangle", .05);
	}
	ui() {
		this.tone(660, .05, "sine", .04);
	}
	extraLife() {
		this.tone(523, .08, "sine", .06);
		this.tone(659, .1, "sine", .06);
		this.tone(784, .14, "sine", .07);
	}
};
var GAME_CODES = /* @__PURE__ */ new Set([
	"KeyW",
	"KeyA",
	"KeyS",
	"KeyD",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Space",
	"KeyP",
	"Escape",
	"Enter"
]);
var NON_TEXT_INPUT = /* @__PURE__ */ new Set([
	"button",
	"submit",
	"reset",
	"checkbox",
	"radio",
	"range",
	"file",
	"color",
	"hidden",
	"image"
]);
function radialDeadzone(x, y, dz = .18) {
	const m = Math.hypot(x, y);
	if (m < dz) return {
		x: 0,
		y: 0
	};
	const scale = (m - dz) / (1 - dz) / m;
	return {
		x: x * scale,
		y: y * scale
	};
}
function isEditable(el) {
	if (!el || !(el instanceof HTMLElement)) return false;
	if (el.isContentEditable) return true;
	const tag = el.tagName;
	if (tag === "TEXTAREA" || tag === "SELECT") return true;
	if (tag !== "INPUT") return false;
	return !NON_TEXT_INPUT.has(el.type);
}
function isTyping(e) {
	return isEditable(e.target) || isEditable(document.activeElement);
}
function pollGamepads() {
	try {
		const list = navigator.getGamepads?.();
		if (!list) return [];
		return Array.from(list).filter((p) => !!p && p.mapping === "standard");
	} catch {
		return [];
	}
}
var Input = class {
	keys = /* @__PURE__ */ new Set();
	prevPause = false;
	pointerX = null;
	pointerY = null;
	pointerActive = false;
	pointerIsTouch = false;
	canvas;
	unsubs = [];
	constructor(canvas) {
		this.canvas = canvas;
		const onDown = (e) => {
			if (isTyping(e)) return;
			this.keys.add(e.code);
			if (GAME_CODES.has(e.code)) e.preventDefault();
		};
		const onUp = (e) => {
			this.keys.delete(e.code);
		};
		const clear = () => this.keys.clear();
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) clear();
		});
		this.unsubs.push(() => window.removeEventListener("keydown", onDown), () => window.removeEventListener("keyup", onUp), () => window.removeEventListener("blur", clear));
		const toLocal = (e) => {
			const r = this.canvas.getBoundingClientRect();
			return {
				x: e.clientX - r.left,
				y: e.clientY - r.top
			};
		};
		const onPDown = (e) => {
			if (e.button !== 0 && e.pointerType === "mouse") return;
			const p = toLocal(e);
			this.pointerX = p.x;
			this.pointerY = p.y;
			this.pointerActive = true;
			this.pointerIsTouch = e.pointerType === "touch";
			try {
				this.canvas.setPointerCapture(e.pointerId);
			} catch {}
		};
		const onPMove = (e) => {
			const p = toLocal(e);
			this.pointerX = p.x;
			this.pointerY = p.y;
			if (e.pointerType === "mouse" && !this.pointerActive) {
				this.pointerActive = true;
				this.pointerIsTouch = false;
			}
		};
		const onPUp = (e) => {
			if (e.pointerType === "touch") this.pointerActive = false;
			try {
				this.canvas.releasePointerCapture(e.pointerId);
			} catch {}
		};
		canvas.addEventListener("pointerdown", onPDown);
		canvas.addEventListener("pointermove", onPMove);
		canvas.addEventListener("pointerup", onPUp);
		canvas.addEventListener("pointercancel", onPUp);
		canvas.addEventListener("pointerleave", () => {
			if (!this.pointerIsTouch) this.pointerActive = false;
		});
		this.unsubs.push(() => canvas.removeEventListener("pointerdown", onPDown), () => canvas.removeEventListener("pointermove", onPMove), () => canvas.removeEventListener("pointerup", onPUp), () => canvas.removeEventListener("pointercancel", onPUp));
	}
	setKeys(codes) {
		this.keys.clear();
		for (const c of codes) this.keys.add(c);
	}
	poll() {
		let moveX = 0;
		let moveY = 0;
		if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) moveX -= 1;
		if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) moveX += 1;
		if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) moveY -= 1;
		if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) moveY += 1;
		const pads = pollGamepads();
		for (const pad of pads) {
			const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
			moveX += stick.x;
			moveY += stick.y;
			if (pad.buttons[14]?.pressed) moveX -= 1;
			if (pad.buttons[15]?.pressed) moveX += 1;
			if (pad.buttons[12]?.pressed) moveY -= 1;
			if (pad.buttons[13]?.pressed) moveY += 1;
		}
		const len = Math.hypot(moveX, moveY);
		if (len > 1) {
			moveX /= len;
			moveY /= len;
		}
		const pauseHeld = this.keys.has("Escape") || this.keys.has("KeyP") || pads.some((p) => p.buttons[9]?.pressed);
		const pausePressed = pauseHeld && !this.prevPause;
		this.prevPause = pauseHeld;
		const fire = this.keys.has("Space") || pads.some((p) => p.buttons[0]?.pressed || p.buttons[7]?.pressed);
		return {
			moveX,
			moveY,
			fire,
			pause: pauseHeld,
			pausePressed,
			pointerX: this.pointerX,
			pointerY: this.pointerY,
			pointerActive: this.pointerActive,
			pointerIsTouch: this.pointerIsTouch
		};
	}
	destroy() {
		for (const u of this.unsubs) u();
		this.unsubs = [];
	}
};
var KEY = "ionwake-save-v1";
var MEM = "__ionwakeSaveV1";
var VERSION = 1;
var MAX = 8;
var IDB_NAME = "ionwake";
var IDB_STORE = "kv";
var defaults = () => ({
	version: VERSION,
	scores: [],
	muted: false
});
function parse(raw) {
	if (!raw) return defaults();
	try {
		const parsed = JSON.parse(raw);
		return {
			version: VERSION,
			scores: sortScores(Array.isArray(parsed.scores) ? parsed.scores.filter((s) => !!s && typeof s.name === "string" && typeof s.score === "number" && Number.isFinite(s.score) && typeof s.wave === "number" && Number.isFinite(s.wave)).map((s) => ({
				name: s.name.slice(0, 3).toUpperCase() || "ACE",
				score: Math.max(0, Math.round(s.score)),
				wave: Math.max(1, Math.round(s.wave)),
				at: typeof s.at === "number" && Number.isFinite(s.at) ? s.at : 0
			})) : []),
			muted: Boolean(parsed.muted)
		};
	} catch {
		return defaults();
	}
}
function scoreKey(s) {
	return `${s.at}|${s.name}|${s.score}|${s.wave}`;
}
function sortScores(scores) {
	return [...scores].sort((a, b) => b.score - a.score || b.at - a.at).slice(0, MAX);
}
function mergeScores(a, b) {
	const map = /* @__PURE__ */ new Map();
	for (const s of [...a, ...b]) map.set(scoreKey(s), s);
	return sortScores([...map.values()]);
}
function readLocal() {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}
function readSession() {
	try {
		return sessionStorage.getItem(KEY);
	} catch {
		return null;
	}
}
function readMem() {
	try {
		const v = window[MEM];
		return typeof v === "string" ? v : null;
	} catch {
		return null;
	}
}
function writeAll(raw) {
	try {
		window[MEM] = raw;
	} catch {}
	try {
		localStorage.setItem(KEY, raw);
	} catch {}
	try {
		sessionStorage.setItem(KEY, raw);
	} catch {}
	idbSet(raw);
}
function idbOpen() {
	return new Promise((resolve) => {
		try {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = () => {
				if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}
async function idbGet() {
	const db = await idbOpen();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const g = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(KEY);
			g.onsuccess = () => resolve(typeof g.result === "string" ? g.result : null);
			g.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}
async function idbSet(raw) {
	const db = await idbOpen();
	if (!db) return;
	try {
		db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(raw, KEY);
	} catch {}
}
function loadSave() {
	return parse(readLocal() ?? readSession() ?? readMem());
}
async function hydrateSave() {
	const local = loadSave();
	const fromIdb = parse(await idbGet());
	const merged = {
		version: VERSION,
		muted: local.muted,
		scores: mergeScores(local.scores, fromIdb.scores)
	};
	persistSave(merged);
	return merged;
}
function persistSave(save) {
	const existing = loadSave();
	const merged = {
		version: VERSION,
		muted: save.muted,
		scores: mergeScores(existing.scores, save.scores)
	};
	writeAll(JSON.stringify(merged));
	try {
		navigator.storage?.persist?.();
	} catch {}
}
function isHighScore(scores, score) {
	if (score <= 0) return false;
	if (scores.length < MAX) return true;
	return score > (scores[scores.length - 1]?.score ?? 0);
}
function insertScore(scores, row) {
	return mergeScores(scores, [row]);
}
function formatTag(name) {
	return (name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3) || "ACE").padEnd(3, "·");
}
function load(src) {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}
async function loadAtlas() {
	const [player, scout, fighter, bomber, playerBolt, enemyBolt, e1, e2, e3, e4, m1, m2, m3, m4, pMulti, pShield, pSpeed, pLife] = await Promise.all([
		load("/sprites/player.png"),
		load("/sprites/scout.png"),
		load("/sprites/fighter.png"),
		load("/sprites/bomber.png"),
		load("/sprites/player-bolt.png"),
		load("/sprites/enemy-bolt.png"),
		load("/sprites/explode-1.png"),
		load("/sprites/explode-2.png"),
		load("/sprites/explode-3.png"),
		load("/sprites/explode-4.png"),
		load("/sprites/muzzle-1.png"),
		load("/sprites/muzzle-2.png"),
		load("/sprites/muzzle-3.png"),
		load("/sprites/muzzle-4.png"),
		load("/sprites/power-multi.png"),
		load("/sprites/power-shield.png"),
		load("/sprites/power-speed.png"),
		load("/sprites/power-life.png")
	]);
	return {
		player,
		scout,
		fighter,
		bomber,
		playerBolt,
		enemyBolt,
		explode: [
			e1,
			e2,
			e3,
			e4
		].filter((x) => !!x),
		muzzle: [
			m1,
			m2,
			m3,
			m4
		].filter((x) => !!x),
		power: {
			multi: pMulti,
			shield: pShield,
			speed: pSpeed,
			life: pLife
		},
		ready: true
	};
}
function drawSprite(ctx, img, x, y, size, rot = 0, alpha = 1) {
	if (!img) return false;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.globalAlpha = alpha;
	ctx.drawImage(img, -size / 2, -size / 2, size, size);
	ctx.restore();
	return true;
}
var STEP = 1 / 60;
var TOUCH_LIFT = 72;
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function rand(a, b) {
	return a + Math.random() * (b - a);
}
var KIND = {
	scout: {
		r: 12,
		hp: 1,
		score: 100,
		size: 36,
		fire: 0
	},
	fighter: {
		r: 16,
		hp: 3,
		score: 250,
		size: 48,
		fire: 1.35
	},
	bomber: {
		r: 26,
		hp: 10,
		score: 600,
		size: 76,
		fire: 1.7
	}
};
var Game = class {
	canvas;
	ctx;
	input;
	audio = new AudioBus();
	atlas = null;
	onHud;
	raf = 0;
	running = false;
	acc = 0;
	last = 0;
	w = 390;
	h = 844;
	dpr = 1;
	reduced = false;
	hudKey = "";
	mode = "title";
	save;
	hud = defaultHud();
	bannerT = 0;
	banner = "";
	hitstop = 0;
	trauma = 0;
	time = 0;
	player = {
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		r: 14,
		lives: 3,
		invuln: 0,
		fireCd: 0,
		multi: 1,
		shield: 0,
		speed: 0,
		dead: false,
		respawn: 0,
		tilt: 0
	};
	score = 0;
	wave = 1;
	combo = 0;
	comboT = 0;
	spawnQ = [];
	waveT = 0;
	between = 0;
	nextLifeAt = 1e4;
	pendingHigh = null;
	bullets = [];
	enemies = [];
	pickups = [];
	particles = [];
	bursts = [];
	muzzles = [];
	floaters = [];
	stars = [];
	nebula = [];
	ro = null;
	constructor(canvas, onHud) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas unsupported");
		this.ctx = ctx;
		this.onHud = onHud;
		this.input = new Input(canvas);
		this.save = loadSave();
		this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		this.audio.setMuted(this.save.muted);
		this.resize();
		this.seedStars();
		this.resetPlayer(true);
		this.pushHud();
		loadAtlas().then((a) => {
			this.atlas = a;
		});
		hydrateSave().then((s) => {
			this.save.scores = s.scores;
			if (!this.save.muted) this.save.muted = s.muted;
			this.audio.setMuted(this.save.muted);
			this.pushHud();
		});
		this.wireControlsTest();
		window.addEventListener("resize", this.onResize);
		document.addEventListener("visibilitychange", this.onVis);
		window.addEventListener("pagehide", this.onHide);
		window.visualViewport?.addEventListener("resize", this.onResize);
		if (typeof ResizeObserver !== "undefined") {
			this.ro = new ResizeObserver(() => this.resize());
			this.ro.observe(canvas);
		}
	}
	start() {
		if (this.running) return;
		this.running = true;
		this.last = performance.now();
		const loop = (now) => {
			if (!this.running) return;
			try {
				let dt = (now - this.last) / 1e3;
				this.last = now;
				if (!Number.isFinite(dt) || dt < 0) dt = 0;
				dt = Math.min(dt, .1);
				this.acc += dt;
				const actions = this.input.poll();
				if (this.mode === "playing" && actions.pausePressed) this.pause();
				else if (this.mode === "paused" && actions.pausePressed) this.resume();
				let steps = 0;
				while (this.acc >= STEP && steps < 6) {
					if (this.mode === "playing") {
						if (this.hitstop > 0) this.hitstop -= STEP;
						else this.step(STEP, actions);
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
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.commitPending();
		persistSave(this.save);
		this.input.destroy();
		this.ro?.disconnect();
		this.ro = null;
		window.removeEventListener("resize", this.onResize);
		window.visualViewport?.removeEventListener("resize", this.onResize);
		document.removeEventListener("visibilitychange", this.onVis);
		window.removeEventListener("pagehide", this.onHide);
		if (window.__controlsTest) delete window.__controlsTest;
	}
	unlockAudio() {
		this.audio.unlock();
	}
	play() {
		this.audio.unlock();
		this.audio.ui();
		this.commitPending();
		this.beginRun();
	}
	pause() {
		if (this.mode !== "playing") return;
		this.mode = "paused";
		this.pushHud();
	}
	resume() {
		if (this.mode !== "paused") return;
		this.audio.unlock();
		this.mode = "playing";
		this.pushHud();
	}
	restart() {
		this.audio.unlock();
		this.commitPending();
		this.beginRun();
	}
	toTitle() {
		this.commitPending();
		this.mode = "title";
		this.banner = "";
		this.pushHud();
	}
	showScores() {
		this.commitPending();
		this.refreshScores();
		this.mode = "scores";
		this.pushHud();
	}
	setMuted(muted) {
		this.save.muted = muted;
		persistSave(this.save);
		this.audio.setMuted(muted);
		this.pushHud();
	}
	submitName(name) {
		this.commitPending(name);
		this.mode = "scores";
		this.pushHud();
	}
	commitPending(name = "") {
		if (!this.pendingHigh) return;
		const pending = this.pendingHigh;
		this.pendingHigh = null;
		this.save.scores = insertScore(this.save.scores, {
			name: formatTag(name),
			score: pending.score,
			wave: pending.wave,
			at: Date.now()
		});
		persistSave(this.save);
	}
	refreshScores() {
		const disk = loadSave();
		this.save.scores = mergeScores(disk.scores, this.save.scores);
	}
	beginRun() {
		this.mode = "playing";
		this.score = 0;
		this.wave = 0;
		this.combo = 0;
		this.comboT = 0;
		this.nextLifeAt = 1e4;
		this.hitstop = 0;
		this.trauma = 0;
		this.between = .2;
		this.spawnQ = [];
		this.waveT = 0;
		this.clearWorld();
		this.resetPlayer(true);
		this.player.lives = 3;
		this.player.multi = 1;
		this.player.shield = 0;
		this.player.speed = 0;
		this.pushHud();
	}
	gameOver() {
		this.mode = "over";
		this.hud.overScore = this.score;
		this.hud.overWave = this.wave;
		this.hud.isHigh = isHighScore(this.save.scores, this.score);
		if (this.hud.isHigh) this.pendingHigh = {
			score: this.score,
			wave: Math.max(1, this.wave)
		};
		else this.pendingHigh = null;
		this.pushHud();
	}
	resetPlayer(center) {
		this.player.x = this.w / 2;
		this.player.y = this.h * (center ? .78 : .82);
		this.player.vx = 0;
		this.player.vy = 0;
		this.player.dead = false;
		this.player.invuln = center ? 0 : 2;
		this.player.respawn = 0;
		this.player.fireCd = 0;
		this.player.tilt = 0;
	}
	clearWorld() {
		for (const list of [
			this.bullets,
			this.enemies,
			this.pickups,
			this.particles,
			this.bursts,
			this.muzzles,
			this.floaters
		]) for (const o of list) o.alive = false;
	}
	step(dt, a) {
		this.trauma = Math.max(0, this.trauma - dt * 1.6);
		this.comboT -= dt;
		if (this.comboT <= 0) this.combo = 0;
		if (this.bannerT > 0) {
			this.bannerT -= dt;
			if (this.bannerT <= 0) this.banner = "";
		}
		this.updatePlayer(dt, a);
		this.updateWave(dt);
		this.updateEnemies(dt);
		this.updateBullets(dt);
		this.updatePickups(dt);
		this.updateFx(dt);
		this.collide();
		this.pushHud();
	}
	speedMul() {
		return 1 + this.player.speed * .28;
	}
	updatePlayer(dt, a) {
		if (this.player.dead) {
			this.player.respawn -= dt;
			if (this.player.respawn <= 0) {
				if (this.player.lives <= 0) {
					this.gameOver();
					return;
				}
				this.resetPlayer(false);
			}
			return;
		}
		this.player.invuln = Math.max(0, this.player.invuln - dt);
		this.player.fireCd = Math.max(0, this.player.fireCd - dt);
		const usingPointer = a.pointerActive && a.pointerX != null && a.pointerY != null;
		if (Math.abs(a.moveX) + Math.abs(a.moveY) > .05) {
			const accel = 2200 * this.speedMul();
			const max = 310 * this.speedMul();
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
			const tx = a.pointerX;
			const ty = a.pointerIsTouch ? a.pointerY - TOUCH_LIFT : a.pointerY;
			const nx = this.player.x + (tx - this.player.x) * (1 - Math.exp(-16 * dt));
			const ny = this.player.y + (ty - this.player.y) * (1 - Math.exp(-16 * dt));
			this.player.vx = (nx - this.player.x) / Math.max(dt, 1e-4);
			this.player.vy = (ny - this.player.y) / Math.max(dt, 1e-4);
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
		this.player.y = clamp(this.player.y, 64, this.h - m - 8);
		this.player.tilt += (this.player.vx * .00115 - this.player.tilt) * (1 - Math.exp(-12 * dt));
		if (this.player.fireCd <= 0) {
			this.firePlayer();
			this.player.fireCd = this.player.multi >= 5 ? .09 : .12;
		}
		if (Math.random() < .55) this.spawnParticle(this.player.x + rand(-4, 4), this.player.y + 18, rand(-12, 12), rand(40, 90), rand(.18, .35), rand(1.2, 2.4), "rgba(110,200,224,0.7)");
	}
	firePlayer() {
		const angles = this.player.multi >= 5 ? [
			-.32,
			-.16,
			0,
			.16,
			.32
		] : this.player.multi >= 3 ? [
			-.18,
			0,
			.18
		] : [0];
		const speed = 640;
		for (const ang of angles) this.spawnBullet(this.player.x + Math.sin(ang) * 8, this.player.y - 20, Math.sin(ang) * speed, -Math.cos(ang) * speed, "player", 4.2, 1.4);
		this.spawnMuzzle(this.player.x, this.player.y - 22);
		this.audio.shoot();
		if (!this.reduced) this.trauma = Math.min(1, this.trauma + .05);
	}
	updateWave(dt) {
		this.waveT += dt;
		this.spawnQ = this.spawnQ.filter((s) => {
			if (this.waveT >= s.t) {
				this.spawnEnemy(s.kind, s.x, s.pattern, s.phase);
				return false;
			}
			return true;
		});
		if (!this.enemies.some((e) => e.alive) && this.spawnQ.length === 0) {
			this.between -= dt;
			if (this.between <= 0) this.nextWave();
		}
	}
	nextWave() {
		this.wave += 1;
		this.waveT = 0;
		this.between = 1.5;
		this.banner = `WAVE ${this.wave}`;
		this.bannerT = 1.8;
		this.audio.wave();
		this.queueWave(this.wave);
		if (this.wave > 1) this.score += (this.wave - 1) * 250;
	}
	queueWave(n) {
		const W = this.w;
		const q = this.spawnQ;
		const push = (t, kind, x, pattern, phase = 0) => {
			q.push({
				t,
				kind,
				x,
				pattern,
				phase
			});
		};
		if (n === 1) for (let i = 0; i < 5; i++) push(.3 + i * .08, "scout", W / 2 + (i - 2) * 52, "form", i);
		else if (n === 2) {
			for (let i = 0; i < 6; i++) push(.2, "scout", 50 + i * (W - 100) / 5, "sine", i);
			for (let i = 0; i < 6; i++) push(1.6, "scout", 70 + i * (W - 140) / 5, "sine", i + 3);
		} else if (n === 3) for (let i = 0; i < 4; i++) push(.25 + i * .15, "fighter", 80 + i * ((W - 160) / 3), "dive", i);
		else if (n % 5 === 0) {
			push(.3, "bomber", W / 2, "hold");
			for (let i = 0; i < 4; i++) push(.5, "scout", 60 + i * ((W - 120) / 3), "sine", i);
			if (n >= 10) {
				push(1.2, "fighter", W * .3, "seek");
				push(1.2, "fighter", W * .7, "seek");
			}
		} else {
			const scouts = Math.min(5 + n, 12);
			const fighters = Math.min(1 + Math.floor(n / 2), 6);
			for (let i = 0; i < scouts; i++) {
				const col = i % 6;
				const row = Math.floor(i / 6);
				push(.2 + row * .9, "scout", 48 + col * ((W - 96) / 5), row % 2 ? "dive" : "sine", i);
			}
			for (let i = 0; i < fighters; i++) push(.8 + i * .25, "fighter", 70 + i * (W - 140) / Math.max(1, fighters - 1), "seek", i);
			if (n > 6 && n % 4 === 0) push(1.4, "bomber", W * (.3 + .4 * Math.random()), "hold");
		}
	}
	spawnEnemy(kind, x, pattern, phase) {
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
			pattern: "sine",
			t: 0,
			phase: 0,
			score: 0,
			flash: 0,
			originX: 0
		}));
		e.alive = true;
		e.kind = kind;
		e.x = clamp(x, 36, this.w - 36);
		e.y = -30;
		e.vx = 0;
		e.vy = kind === "bomber" ? 55 : kind === "fighter" ? 80 : 95;
		e.r = spec.r;
		e.hp = hp;
		e.fire = rand(.4, 1.1);
		e.pattern = pattern;
		e.t = 0;
		e.phase = phase;
		e.score = spec.score;
		e.flash = 0;
		e.originX = e.x;
	}
	updateEnemies(dt) {
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
				if (e.y < this.h * .22) e.y += 70 * dt;
				else e.x = e.originX + Math.sin(e.t * .8) * 70;
			} else if (e.pattern === "seek") {
				const dx = px - e.x;
				const dy = py - e.y;
				const m = Math.hypot(dx, dy) || 1;
				const spd = 70 + this.wave * 4;
				e.vx += dx / m * spd * dt;
				e.vy += dy / m * spd * dt;
				const s = Math.hypot(e.vx, e.vy);
				const max = 140;
				if (s > max) {
					e.vx *= max / s;
					e.vy *= max / s;
				}
				e.x += e.vx * dt;
				e.y += e.vy * dt;
			} else e.y += (88 + this.wave * 2) * dt;
			for (const o of this.enemies) {
				if (!o.alive || o === e) continue;
				const dx = e.x - o.x;
				const dy = e.y - o.y;
				const d = Math.hypot(dx, dy);
				const min = e.r + o.r + 6;
				if (d > 0 && d < min) {
					const p = (min - d) / min * 18 * dt;
					e.x += dx / d * p * 20;
					o.x -= dx / d * p * 20;
				}
			}
			e.x = clamp(e.x, 20, this.w - 20);
			const fireEvery = KIND[e.kind].fire;
			if (fireEvery > 0 && e.y > 20 && e.y < this.h * .72) {
				e.fire -= dt;
				if (e.fire <= 0) {
					e.fire = fireEvery * (.85 + Math.random() * .3);
					this.enemyShoot(e);
				}
			} else if (e.kind === "scout" && this.wave >= 4 && e.y > 40 && e.y < this.h * .55) {
				e.fire -= dt;
				if (e.fire <= 0) {
					e.fire = 2.4;
					this.spawnBullet(e.x, e.y + e.r, 0, 240, "enemy", 4.5, 2.2);
				}
			}
			if (e.y > this.h + 40) e.alive = false;
		}
	}
	enemyShoot(e) {
		const px = this.player.x;
		const py = this.player.y;
		const dx = px - e.x;
		const dy = py - e.y;
		const m = Math.hypot(dx, dy) || 1;
		const spd = 210 + this.wave * 8;
		if (e.kind === "bomber") for (const ang of [
			-.28,
			0,
			.28
		]) {
			const ca = Math.cos(ang);
			const sa = Math.sin(ang);
			const vx = dx / m * ca * spd - dy / m * sa * spd;
			const vy = dx / m * sa * spd + dy / m * ca * spd;
			this.spawnBullet(e.x, e.y + 12, vx, vy, "enemy", 5.5, 2.6);
		}
		else this.spawnBullet(e.x, e.y + 10, dx / m * spd, dy / m * spd, "enemy", 5, 2.4);
	}
	updateBullets(dt) {
		for (const b of this.bullets) {
			if (!b.alive) continue;
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.life -= dt;
			if (b.life <= 0 || b.y < -20 || b.y > this.h + 20 || b.x < -20 || b.x > this.w + 20) b.alive = false;
		}
	}
	updatePickups(dt) {
		for (const p of this.pickups) {
			if (!p.alive) continue;
			p.t += dt;
			p.y += 70 * dt;
			const dx = this.player.x - p.x;
			const dy = this.player.y - p.y;
			const d = Math.hypot(dx, dy);
			if (d > 1 && d < 80 && !this.player.dead) {
				p.x += dx / d * 220 * dt;
				p.y += dy / d * 220 * dt;
			}
			if (p.y > this.h + 30 || p.t > 12) p.alive = false;
		}
	}
	updateFx(dt) {
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
		for (const f of this.floaters) {
			if (!f.alive) continue;
			f.y -= 36 * dt;
			f.t -= dt;
			if (f.t <= 0) f.alive = false;
		}
	}
	collide() {
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
		if (!this.player.dead && this.player.invuln <= 0) {
			for (const b of this.bullets) {
				if (!b.alive || b.from !== "enemy") continue;
				if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < b.r + this.player.r) {
					b.alive = false;
					this.hurtPlayer();
				}
			}
			for (const e of this.enemies) {
				if (!e.alive) continue;
				if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.r + this.player.r - 4) {
					this.hurtPlayer();
					this.hurtEnemy(e, true);
				}
			}
		}
		for (const p of this.pickups) {
			if (!p.alive || this.player.dead) continue;
			if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 22) {
				p.alive = false;
				this.collect(p.kind);
			}
		}
	}
	hurtEnemy(e, ram = false) {
		e.hp -= ram ? 4 : 1;
		e.flash = .08;
		this.audio.hit();
		this.spawnParticle(e.x, e.y, rand(-80, 80), rand(-80, 40), .3, 2, "#e8eaef");
		if (e.hp <= 0) {
			e.alive = false;
			const mul = 1 + this.combo * .1;
			const pts = Math.round(e.score * mul);
			this.score += pts;
			this.combo += 1;
			this.comboT = .7;
			this.spawnFloater(e.x, e.y, `+${pts}`);
			this.explode(e.x, e.y, e.kind === "bomber" ? 1.4 : 1);
			if (e.kind === "bomber" && !this.reduced) this.hitstop = .06;
			this.maybeDrop(e);
			if (this.score >= this.nextLifeAt) {
				this.player.lives += 1;
				this.nextLifeAt += 15e3;
				this.spawnFloater(this.player.x, this.player.y - 30, "1-UP");
				this.audio.extraLife();
			}
		}
	}
	hurtPlayer() {
		if (this.player.dead || this.player.invuln > 0) return;
		if (this.player.shield > 0) {
			this.player.shield -= 1;
			this.player.invuln = .6;
			this.audio.hit();
			this.trauma = Math.min(1, this.trauma + .35);
			this.burstRing(this.player.x, this.player.y, "rgba(110,200,224,0.9)");
			return;
		}
		this.player.dead = true;
		this.player.lives -= 1;
		this.player.respawn = 1.15;
		this.player.multi = 1;
		this.player.speed = 0;
		this.explode(this.player.x, this.player.y, 1.6);
		this.audio.dead();
		this.trauma = 1;
		if (!this.reduced) this.hitstop = .1;
	}
	maybeDrop(e) {
		const chance = e.kind === "bomber" ? .7 : e.kind === "fighter" ? .28 : .1;
		if (Math.random() > chance) return;
		const roll = Math.random();
		const kind = roll < .34 ? "multi" : roll < .62 ? "shield" : roll < .88 ? "speed" : "life";
		const p = this.take(this.pickups, () => ({
			alive: true,
			kind,
			x: 0,
			y: 0,
			t: 0
		}));
		p.alive = true;
		p.kind = kind;
		p.x = e.x;
		p.y = e.y;
		p.t = 0;
	}
	collect(kind) {
		this.audio.pickup();
		this.spawnFloater(this.player.x, this.player.y - 24, kind.toUpperCase());
		if (kind === "multi") this.player.multi = this.player.multi >= 3 ? 5 : 3;
		else if (kind === "shield") this.player.shield = Math.min(3, this.player.shield + 1);
		else if (kind === "speed") this.player.speed = Math.min(2, this.player.speed + 1);
		else {
			this.player.lives += 1;
			this.audio.extraLife();
		}
		this.score += 50;
	}
	explode(x, y, scale = 1) {
		const b = this.take(this.bursts, () => ({
			alive: true,
			x,
			y,
			t: 0,
			max: .4,
			scale: 1
		}));
		b.alive = true;
		b.x = x;
		b.y = y;
		b.t = 0;
		b.max = .42;
		b.scale = scale;
		this.audio.explode();
		this.trauma = Math.min(1, this.trauma + .28 * scale);
		for (let i = 0; i < 14 * scale; i++) {
			const ang = Math.random() * Math.PI * 2;
			const s = rand(40, 180) * scale;
			this.spawnParticle(x, y, Math.cos(ang) * s, Math.sin(ang) * s, rand(.25, .55), rand(1.5, 3.5), "rgba(180,220,235,0.9)");
		}
	}
	burstRing(x, y, color) {
		for (let i = 0; i < 16; i++) {
			const ang = i / 16 * Math.PI * 2;
			this.spawnParticle(x, y, Math.cos(ang) * 140, Math.sin(ang) * 140, .35, 2.2, color);
		}
	}
	spawnBullet(x, y, vx, vy, from, r, life) {
		const b = this.take(this.bullets, () => ({
			alive: true,
			x,
			y,
			vx,
			vy,
			r,
			from,
			life
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
	spawnMuzzle(x, y) {
		const m = this.take(this.muzzles, () => ({
			alive: true,
			x,
			y,
			t: 0,
			max: .08,
			scale: 1
		}));
		m.alive = true;
		m.x = x;
		m.y = y;
		m.t = 0;
		m.max = .07;
		m.scale = 1;
	}
	spawnParticle(x, y, vx, vy, life, size, color) {
		let live = 0;
		for (const p of this.particles) if (p.alive) live++;
		if (live > 280) return;
		const p = this.take(this.particles, () => ({
			alive: true,
			x,
			y,
			vx,
			vy,
			life,
			max: life,
			size,
			color
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
	spawnFloater(x, y, text) {
		const f = this.take(this.floaters, () => ({
			alive: true,
			x,
			y,
			text,
			t: .8
		}));
		f.alive = true;
		f.x = x;
		f.y = y;
		f.text = text;
		f.t = .85;
	}
	take(pool, make) {
		for (const o of pool) if (!o.alive) return o;
		const n = make();
		pool.push(n);
		return n;
	}
	draw(a, frameDt) {
		const ctx = this.ctx;
		const { w, h } = this;
		if (w < 2 || h < 2) return;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.fillStyle = "#07080c";
		ctx.fillRect(0, 0, w, h);
		const shake = this.reduced ? 0 : this.trauma * this.trauma;
		const sx = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
		const sy = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
		ctx.save();
		ctx.translate(sx, sy);
		this.drawStars(this.mode === "playing" ? 1 : .45, frameDt);
		this.drawNebula(frameDt);
		for (const p of this.pickups) if (p.alive) this.drawPickup(p);
		for (const b of this.bullets) if (b.alive && b.from === "enemy") this.drawBullet(b);
		for (const e of this.enemies) if (e.alive) this.drawEnemy(e);
		for (const b of this.bullets) if (b.alive && b.from === "player") this.drawBullet(b);
		if (!this.player.dead && (this.mode === "playing" || this.mode === "paused")) this.drawPlayer();
		for (const m of this.muzzles) if (m.alive) this.drawMuzzle(m);
		for (const b of this.bursts) if (b.alive) this.drawBurst(b);
		for (const p of this.particles) if (p.alive) this.drawParticle(p);
		for (const f of this.floaters) if (f.alive) this.drawFloater(f);
		if (this.mode === "playing" && a.pointerActive && a.pointerIsTouch && a.pointerX != null && a.pointerY != null) {
			ctx.beginPath();
			ctx.strokeStyle = "rgba(232,234,239,0.18)";
			ctx.lineWidth = 1.5;
			ctx.arc(a.pointerX, a.pointerY, 22, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
	}
	drawStars(speed, dt) {
		const ctx = this.ctx;
		for (const s of this.stars) {
			s.y += (22 + s.z * 140) * speed * dt;
			if (s.y > this.h + 4) {
				s.y = -4;
				s.x = Math.random() * this.w;
			}
			ctx.fillStyle = `rgba(232,234,239,${.25 + s.z * .65})`;
			ctx.fillRect(s.x, s.y, s.s, s.s);
		}
	}
	drawNebula(dt) {
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
	drawPlayer() {
		const p = this.player;
		if (p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0) return;
		const rot = p.tilt;
		const atlas = this.atlas;
		if (!drawSprite(this.ctx, atlas?.player ?? null, p.x, p.y, 56, rot)) this.drawVectorShip(p.x, p.y, rot, "#e8eaef", "#6ec8e0", 18);
		if (p.shield > 0) {
			const ctx = this.ctx;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(this.time * 1.4);
			ctx.strokeStyle = `rgba(110,200,224,${.35 + .15 * p.shield})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const ang = i / 6 * Math.PI * 2 - Math.PI / 2;
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
	drawEnemy(e) {
		const rot = Math.PI + e.vx * .002;
		const size = KIND[e.kind].size;
		const img = e.kind === "scout" ? this.atlas?.scout : e.kind === "fighter" ? this.atlas?.fighter : this.atlas?.bomber;
		if (!drawSprite(this.ctx, img ?? null, e.x, e.y, size, rot, e.flash > 0 ? .85 : 1)) {
			const col = e.kind === "scout" ? "#c45c4a" : e.kind === "fighter" ? "#c47a4a" : "#8b90a0";
			this.drawVectorShip(e.x, e.y, rot, col, "#e8a060", size * .32);
		}
		if (e.flash > 0) {
			this.ctx.save();
			this.ctx.globalCompositeOperation = "lighter";
			this.ctx.fillStyle = "rgba(255,255,255,0.35)";
			this.ctx.beginPath();
			this.ctx.arc(e.x, e.y, size * .28, 0, Math.PI * 2);
			this.ctx.fill();
			this.ctx.restore();
		}
	}
	drawVectorShip(x, y, rot, hull, glow, s) {
		const ctx = this.ctx;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.fillStyle = hull;
		ctx.beginPath();
		ctx.moveTo(0, -s);
		ctx.lineTo(s * .72, s * .8);
		ctx.lineTo(0, s * .4);
		ctx.lineTo(-s * .72, s * .8);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(0, s * .55, s * .18, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	drawBullet(b) {
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
	drawPickup(p) {
		const bob = Math.sin(p.t * 4) * 3;
		const img = this.atlas?.power[p.kind] ?? null;
		if (!drawSprite(this.ctx, img, p.x, p.y + bob, 32)) {
			const ctx = this.ctx;
			ctx.save();
			ctx.translate(p.x, p.y + bob);
			ctx.fillStyle = p.kind === "shield" ? "#6ec8e0" : p.kind === "speed" ? "#7d9e86" : "#e8eaef";
			ctx.beginPath();
			ctx.arc(0, 0, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}
	drawMuzzle(m) {
		const frames = this.atlas?.muzzle ?? [];
		const i = Math.min(frames.length - 1, Math.floor(m.t / m.max * frames.length));
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
	drawBurst(b) {
		const frames = this.atlas?.explode ?? [];
		const i = Math.min(frames.length - 1, Math.floor(b.t / b.max * frames.length));
		const size = 70 * b.scale * (.7 + b.t / b.max);
		if (frames[i]) {
			drawSprite(this.ctx, frames[i], b.x, b.y, size, 0, 1 - b.t / b.max * .4);
			return;
		}
		const ctx = this.ctx;
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.strokeStyle = `rgba(180,230,245,${1 - b.t / b.max})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(b.x, b.y, 12 * b.scale + b.t / b.max * 28 * b.scale, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
	drawParticle(p) {
		const ctx = this.ctx;
		const a = p.max > 0 ? p.life / p.max : 0;
		if (!Number.isFinite(a) || a <= 0) return;
		ctx.globalAlpha = Math.min(1, a);
		ctx.fillStyle = p.color;
		ctx.fillRect(p.x, p.y, p.size, p.size);
		ctx.globalAlpha = 1;
	}
	drawFloater(f) {
		const ctx = this.ctx;
		ctx.save();
		ctx.globalAlpha = Math.min(1, f.t * 2);
		ctx.fillStyle = "#e8eaef";
		ctx.font = "600 12px Oxanium, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(f.text, f.x, f.y);
		ctx.restore();
	}
	seedStars() {
		this.stars = [];
		for (let i = 0; i < 140; i++) this.stars.push({
			x: Math.random() * Math.max(this.w, 400),
			y: Math.random() * Math.max(this.h, 700),
			z: Math.random(),
			s: Math.random() < .7 ? 1 : 1.6
		});
		this.nebula = [
			{
				x: this.w * .2,
				y: this.h * .3,
				r: 140,
				c: "rgba(40,55,80,0.22)",
				v: 6
			},
			{
				x: this.w * .8,
				y: this.h * .6,
				r: 180,
				c: "rgba(30,48,70,0.18)",
				v: 4
			},
			{
				x: this.w * .5,
				y: this.h * .1,
				r: 120,
				c: "rgba(50,70,90,0.16)",
				v: 8
			}
		];
	}
	onResize = () => this.resize();
	onHide = () => {
		this.commitPending();
		persistSave(this.save);
	};
	onVis = () => {
		if (document.hidden) {
			this.onHide();
			if (this.mode === "playing") this.pause();
		} else {
			this.refreshScores();
			this.audio.unlock();
			this.pushHud();
		}
	};
	resize() {
		const cssW = Math.max(1, Math.round(this.canvas.clientWidth || window.innerWidth || 390));
		const cssH = Math.max(1, Math.round(this.canvas.clientHeight || window.innerHeight || 844));
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const bufW = Math.max(1, Math.floor(cssW * dpr));
		const bufH = Math.max(1, Math.floor(cssH * dpr));
		if (cssW === this.w && cssH === this.h && dpr === this.dpr && this.canvas.width === bufW) return;
		this.w = cssW;
		this.h = cssH;
		this.dpr = dpr;
		this.canvas.width = bufW;
		this.canvas.height = bufH;
	}
	pushHud() {
		const key = [
			this.mode,
			this.score,
			this.player.lives,
			this.wave,
			this.player.shield,
			this.player.multi,
			this.player.speed,
			this.combo,
			this.bannerT > 0 ? this.banner : "",
			this.save.muted,
			this.hud.isHigh,
			this.save.scores.length,
			this.save.scores[0]?.score ?? 0,
			this.save.scores[0]?.name ?? "",
			this.pendingHigh ? 1 : 0
		].join("|");
		if (key === this.hudKey) return;
		this.hudKey = key;
		const next = {
			mode: this.mode,
			score: this.score,
			lives: Math.max(0, this.player.lives),
			wave: Math.max(1, this.wave),
			shield: this.player.shield,
			multi: this.player.multi,
			speed: this.player.speed,
			combo: this.combo,
			banner: this.bannerT > 0 ? this.banner : null,
			overScore: this.hud.overScore,
			overWave: this.hud.overWave,
			isHigh: this.hud.isHigh,
			scores: this.save.scores,
			muted: this.save.muted
		};
		this.hud = next;
		try {
			this.onHud(next);
		} catch {}
	}
	wireControlsTest() {
		window.__controlsTest = {
			getX: () => this.player.x,
			getY: () => this.player.y,
			getVx: () => this.player.vx,
			getVy: () => this.player.vy,
			getSpeed: () => Math.hypot(this.player.vx, this.player.vy),
			setKeys: (codes) => this.input.setKeys(codes),
			forceHighScore: (score = 9999) => {
				this.score = score;
				this.wave = Math.max(this.wave, 1);
				this.player.lives = 0;
				this.player.dead = true;
				this.gameOver();
			}
		};
	}
};
//#endregion
export { Game };
