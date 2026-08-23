type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
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

function nativeAvailable(): boolean {
  const d = doc();
  if (d.fullscreenEnabled === false && d.webkitFullscreenEnabled === false) return false;
  if (d.fullscreenEnabled || d.webkitFullscreenEnabled) return true;
  const el = document.documentElement as FullscreenEl;
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

/** Always true: iPhone has no element Fullscreen API, but immersive fill still works. */
export function fullscreenSupported(_el?: HTMLElement): boolean {
  return true;
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

async function requestNative(el: HTMLElement): Promise<boolean> {
  if (!nativeAvailable()) return false;
  const node = el as FullscreenEl;
  const root = document.documentElement as FullscreenEl;
  const targets = [node, root];
  for (const target of targets) {
    try {
      if (typeof target.requestFullscreen === "function") {
        await target.requestFullscreen({ navigationUI: "hide" });
        if (getFullscreenElement()) return true;
      }
    } catch {
      /* try webkit / next target */
    }
    try {
      await target.webkitRequestFullscreen?.();
      if (getFullscreenElement()) return true;
      await target.webkitRequestFullScreen?.();
      if (getFullscreenElement()) return true;
    } catch {
      /* next */
    }
  }
  return !!getFullscreenElement();
}

export async function enterFullscreen(el: HTMLElement): Promise<void> {
  if (isFullscreen()) return;
  const ok = await requestNative(el);
  if (ok) return;
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
