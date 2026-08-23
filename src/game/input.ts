const GAME_CODES = new Set([
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
  "KeyF",
  "Escape",
  "Enter",
]);

const NON_TEXT_INPUT = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "range",
  "file",
  "color",
  "hidden",
  "image",
]);

export type Actions = {
  moveX: number;
  moveY: number;
  fire: boolean;
  pause: boolean;
  pausePressed: boolean;
  pointerX: number | null;
  pointerY: number | null;
  pointerActive: boolean;
  pointerIsTouch: boolean;
};

function radialDeadzone(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  return !NON_TEXT_INPUT.has((el as HTMLInputElement).type);
}

function isTyping(e: KeyboardEvent): boolean {
  return isEditable(e.target) || isEditable(document.activeElement);
}

function pollGamepads(): Gamepad[] {
  try {
    const list = navigator.getGamepads?.();
    if (!list) return [];
    return Array.from(list).filter((p): p is Gamepad => !!p && p.mapping === "standard");
  } catch {
    return [];
  }
}

export class Input {
  private keys = new Set<string>();
  private prevPause = false;
  pointerX: number | null = null;
  pointerY: number | null = null;
  pointerActive = false;
  pointerIsTouch = false;
  private canvas: HTMLCanvasElement;
  private unsubs: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      this.keys.add(e.code);
      if (GAME_CODES.has(e.code)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    this.unsubs.push(
      () => window.removeEventListener("keydown", onDown),
      () => window.removeEventListener("keyup", onUp),
      () => window.removeEventListener("blur", clear),
    );

    const toLocal = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onPDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const p = toLocal(e);
      this.pointerX = p.x;
      this.pointerY = p.y;
      this.pointerActive = true;
      this.pointerIsTouch = e.pointerType === "touch";
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
    };
    const onPMove = (e: PointerEvent) => {
      const p = toLocal(e);
      this.pointerX = p.x;
      this.pointerY = p.y;
      if (e.pointerType === "mouse" && !this.pointerActive) {
        this.pointerActive = true;
        this.pointerIsTouch = false;
      }
    };
    const onPUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        this.pointerActive = false;
      }
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    canvas.addEventListener("pointerdown", onPDown);
    canvas.addEventListener("pointermove", onPMove);
    canvas.addEventListener("pointerup", onPUp);
    canvas.addEventListener("pointercancel", onPUp);
    canvas.addEventListener("pointerleave", () => {
      if (!this.pointerIsTouch) this.pointerActive = false;
    });
    this.unsubs.push(
      () => canvas.removeEventListener("pointerdown", onPDown),
      () => canvas.removeEventListener("pointermove", onPMove),
      () => canvas.removeEventListener("pointerup", onPUp),
      () => canvas.removeEventListener("pointercancel", onPUp),
    );
  }

  setKeys(codes: string[]): void {
    this.keys.clear();
    for (const c of codes) this.keys.add(c);
  }

  poll(): Actions {
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

    const pauseHeld =
      this.keys.has("Escape") ||
      this.keys.has("KeyP") ||
      pads.some((p) => p.buttons[9]?.pressed);
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
      pointerIsTouch: this.pointerIsTouch,
    };
  }

  destroy(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}
