type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
};

function doc(): FullscreenDoc {
  return document as FullscreenDoc;
}

export function getFullscreenElement(): Element | null {
  const d = doc();
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isFullscreen(): boolean {
  return !!getFullscreenElement();
}

export function fullscreenSupported(el: HTMLElement): boolean {
  const node = el as FullscreenEl;
  return (
    typeof node.requestFullscreen === "function" ||
    typeof node.webkitRequestFullscreen === "function" ||
    typeof node.webkitRequestFullScreen === "function"
  );
}

export async function enterFullscreen(el: HTMLElement): Promise<void> {
  const node = el as FullscreenEl;
  if (typeof node.requestFullscreen === "function") {
    await node.requestFullscreen();
    return;
  }
  await node.webkitRequestFullscreen?.();
  await node.webkitRequestFullScreen?.();
}

export async function exitFullscreen(): Promise<void> {
  const d = doc();
  if (typeof d.exitFullscreen === "function" && d.fullscreenElement) {
    await d.exitFullscreen();
    return;
  }
  await d.webkitExitFullscreen?.();
  await d.webkitCancelFullScreen?.();
}

export async function toggleFullscreen(el: HTMLElement): Promise<void> {
  if (isFullscreen()) await exitFullscreen();
  else await enterFullscreen(el);
}

export const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const;
