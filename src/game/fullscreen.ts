type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: (opts?: unknown) => Promise<void> | void;
  webkitRequestFullScreen?: (opts?: unknown) => Promise<void> | void;
};

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
};

const IMMERSIVE_CLASS = "ion-wake-fs";
const IMMERSIVE_ROOT = "ion-wake-fs-root";
export const IMMERSIVE_CHANGE = "ionwakefullscreenchange";

let immersive = false;
let immersiveEl: HTMLElement | null = null;
let unsubViewport: (() => void) | null = null;

function doc(): FullscreenDoc {
  return document as FullscreenDoc;
}

export function getFullscreenElement(): Element | null {
  const d = doc();
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isFullscreen(): boolean {
  return !!getFullscreenElement() || immersive;
}

/** iPhone reports the method but fullscreenEnabled is false and calls reject. */
function nativeAvailable(): boolean {
  const d = doc();
  if (d.fullscreenEnabled === true || d.webkitFullscreenEnabled === true) return true;
  if (d.fullscreenEnabled === false) return false;
  const el = document.documentElement as FullscreenEl;
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

/** Always true: phones without the API still get an immersive fill. */
export function fullscreenSupported(_el?: HTMLElement): boolean {
  return true;
}

function kickLayout(): void {
  window.dispatchEvent(new Event("resize"));
  window.visualViewport?.dispatchEvent(new Event("resize"));
}

function layoutImmersive(el: HTMLElement): void {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  const top = Math.round(vv?.offsetTop ?? 0);
  const left = Math.round(vv?.offsetLeft ?? 0);
  el.style.position = "fixed";
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

function bindViewport(el: HTMLElement): void {
  unsubViewport?.();
  const sync = () => layoutImmersive(el);
  sync();
  window.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  unsubViewport = () => {
    window.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    unsubViewport = null;
  };
}

function notify(): void {
  document.dispatchEvent(new Event(IMMERSIVE_CHANGE));
  kickLayout();
}

function setImmersive(on: boolean, el: HTMLElement): void {
  immersive = on;
  immersiveEl = on ? el : null;
  document.documentElement.classList.toggle(IMMERSIVE_CLASS, on);
  el.classList.toggle(IMMERSIVE_ROOT, on);
  if (on) {
    bindViewport(el);
    window.scrollTo(0, 0);
  } else {
    unsubViewport?.();
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.width = "";
    el.style.height = "";
  }
  notify();
}

function fullscreenTarget(): FullscreenEl {
  return document.documentElement as FullscreenEl;
}

async function requestNative(): Promise<boolean> {
  if (!nativeAvailable()) return false;
  const target = fullscreenTarget();
  const attempts: Array<() => Promise<void> | void> = [];
  if (typeof target.requestFullscreen === "function") {
    attempts.push(() => target.requestFullscreen({ navigationUI: "hide" }));
    attempts.push(() => target.requestFullscreen());
  }
  const webkitFs = target.webkitRequestFullscreen?.bind(target);
  const webkitFsAlt = target.webkitRequestFullScreen?.bind(target);
  if (webkitFs) attempts.push(() => webkitFs());
  if (webkitFsAlt) attempts.push(() => webkitFsAlt());

  for (const run of attempts) {
    try {
      await run();
      if (getFullscreenElement()) return true;
    } catch {
      /* next attempt — still in the same user-gesture turn if the throw was sync */
    }
    if (getFullscreenElement()) return true;
  }
  return !!getFullscreenElement();
}

export async function enterFullscreen(el: HTMLElement): Promise<void> {
  if (isFullscreen()) return;
  const ok = await requestNative();
  if (ok) {
    notify();
    return;
  }
  setImmersive(true, el);
}

export async function exitFullscreen(el?: HTMLElement): Promise<void> {
  const d = doc();
  if (getFullscreenElement()) {
    try {
      if (typeof d.exitFullscreen === "function") await d.exitFullscreen();
    } catch {
      /* webkit */
    }
    try {
      await d.webkitExitFullscreen?.();
      await d.webkitCancelFullScreen?.();
    } catch {
      /* already out */
    }
  }
  const node = el ?? immersiveEl;
  if (immersive && node) setImmersive(false, node);
  else if (immersive) {
    immersive = false;
    document.documentElement.classList.remove(IMMERSIVE_CLASS);
    notify();
  }
}

export async function toggleFullscreen(el: HTMLElement): Promise<void> {
  if (isFullscreen()) await exitFullscreen(el);
  else await enterFullscreen(el);
}

export const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange", IMMERSIVE_CHANGE] as const;
