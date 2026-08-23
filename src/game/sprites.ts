export type Atlas = {
  player: HTMLImageElement | null;
  scout: HTMLImageElement | null;
  fighter: HTMLImageElement | null;
  bomber: HTMLImageElement | null;
  playerBolt: HTMLImageElement | null;
  enemyBolt: HTMLImageElement | null;
  explode: HTMLImageElement[];
  muzzle: HTMLImageElement[];
  power: Record<"multi" | "shield" | "speed" | "life", HTMLImageElement | null>;
  ready: boolean;
};

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAtlas(): Promise<Atlas> {
  const [
    player,
    scout,
    fighter,
    bomber,
    playerBolt,
    enemyBolt,
    e1,
    e2,
    e3,
    e4,
    m1,
    m2,
    m3,
    m4,
    pMulti,
    pShield,
    pSpeed,
    pLife,
  ] = await Promise.all([
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
    load("/sprites/power-life.png"),
  ]);

  return {
    player,
    scout,
    fighter,
    bomber,
    playerBolt,
    enemyBolt,
    explode: [e1, e2, e3, e4].filter((x): x is HTMLImageElement => !!x),
    muzzle: [m1, m2, m3, m4].filter((x): x is HTMLImageElement => !!x),
    power: { multi: pMulti, shield: pShield, speed: pSpeed, life: pLife },
    ready: true,
  };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  rot = 0,
  alpha = 1,
): boolean {
  if (!img) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}
