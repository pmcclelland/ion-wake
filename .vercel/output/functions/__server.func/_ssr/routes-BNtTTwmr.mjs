import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Shield, n as VolumeX, o as Pause, r as Volume2, s as ChevronsUp, t as Zap } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BNtTTwmr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var defaultHud = () => ({
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
	muted: false
});
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-display text-sm font-medium tracking-wide transition-[opacity,transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]", {
	variants: {
		variant: {
			default: "bg-fg text-accent-fg hover:opacity-90",
			secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-2",
			ghost: "text-fg hover:bg-surface-2",
			outline: "border border-border bg-transparent text-fg hover:bg-surface"
		},
		size: {
			default: "h-11 rounded-md px-5",
			sm: "h-9 rounded-sm px-3 text-xs",
			lg: "h-12 rounded-lg px-8 text-base",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const gameRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(defaultHud);
	const [name, setName] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let alive = true;
		let instance = null;
		import("./engine-B6B_fsDq.mjs").then(({ Game }) => {
			if (!alive || !canvas) return;
			instance = new Game(canvas, setHud);
			gameRef.current = instance;
			instance.start();
		});
		return () => {
			alive = false;
			instance?.destroy();
			gameRef.current = null;
		};
	}, []);
	const g = () => gameRef.current;
	const playing = hud.mode === "playing";
	const paused = hud.mode === "paused";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				style: { touchAction: "none" }
			}),
			(playing || paused) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-xs font-medium uppercase tracking-widest text-muted",
								children: "Score"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-xl font-semibold tabular-nums leading-none tracking-tight",
								children: hud.score.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex items-center gap-2 text-xs text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums",
									children: ["Wave ", hud.wave]
								}), hud.combo > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-fg",
									children: ["x", hud.combo.toFixed(0)]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center gap-1.5 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1.5",
							"aria-label": `${hud.lives} lives`,
							children: Array.from({ length: Math.min(8, Math.max(0, hud.lives | 0)) }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block size-2.5 rotate-45 bg-fg",
								"aria-hidden": true
							}, i))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-muted",
							children: [
								hud.multi > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-0.5 text-xs uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsUp, {
										className: "size-3.5",
										strokeWidth: 2
									}), hud.multi]
								}),
								hud.shield > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-0.5 text-xs uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
										className: "size-3.5",
										strokeWidth: 2
									}), hud.shield]
								}),
								hud.speed > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-0.5 text-xs uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
										className: "size-3.5",
										strokeWidth: 2
									}), hud.speed]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "icon",
						className: "pointer-events-auto size-11 shrink-0",
						"aria-label": "Pause",
						type: "button",
						onClick: () => g()?.pause(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
							className: "size-4",
							strokeWidth: 2
						})
					})
				]
			}),
			playing && hud.banner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 top-1/4 z-10 text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-3xl font-semibold tracking-widest text-fg",
					children: hud.banner
				})
			}),
			hud.mode === "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xs font-medium uppercase tracking-widest text-muted",
					children: "Arcade"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-semibold tracking-widest sm:text-5xl",
					children: "IONWAKE"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-sm text-pretty text-sm leading-relaxed text-muted",
					children: "Break the incoming fleet. Grab multi-shot, shield, and speed. Three lives. Auto-fire is always on."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex w-full max-w-xs flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "w-full",
						type: "button",
						onClick: () => g()?.play(),
						children: "Play"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "w-full",
						type: "button",
						onClick: () => g()?.showScores(),
						children: "High scores"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-4 grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-left text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "font-medium text-fg",
							children: "Move"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "WASD, arrows, or drag" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "font-medium text-fg",
							children: "Fire"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Automatic" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "font-medium text-fg",
							children: "Pause"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Esc or P" })
					]
				})
			] }),
			paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-semibold tracking-widest",
				children: "Paused"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex w-full max-w-xs flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "w-full",
						type: "button",
						onClick: () => g()?.resume(),
						children: "Resume"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						className: "w-full",
						type: "button",
						onClick: () => g()?.setMuted(!hud.muted),
						children: [hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, {
							className: "size-4",
							strokeWidth: 2
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, {
							className: "size-4",
							strokeWidth: 2
						}), hud.muted ? "Sound off" : "Sound on"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "w-full",
						type: "button",
						onClick: () => g()?.restart(),
						children: "Restart"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						className: "w-full",
						type: "button",
						onClick: () => g()?.toTitle(),
						children: "Title"
					})
				]
			})] }),
			hud.mode === "over" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xs font-medium uppercase tracking-widest text-muted",
					children: "Run ended"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-semibold tracking-widest",
					children: "Ionwake"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-4xl font-semibold tabular-nums tracking-tight",
					children: hud.overScore.toLocaleString()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: ["Wave ", hud.overWave]
				}),
				hud.isHigh && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-2 flex w-full max-w-xs flex-col gap-2",
					onSubmit: (e) => {
						e.preventDefault();
						g()?.submitName(name);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-xs uppercase tracking-widest text-muted",
							htmlFor: "tag",
							children: "Initials"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "tag",
							value: name,
							onChange: (e) => setName(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3)),
							onKeyDown: (e) => e.stopPropagation(),
							onKeyUp: (e) => e.stopPropagation(),
							maxLength: 3,
							autoComplete: "off",
							autoCorrect: "off",
							autoCapitalize: "characters",
							spellCheck: false,
							enterKeyHint: "done",
							autoFocus: true,
							placeholder: "ACE",
							className: "h-12 select-text rounded-lg border border-border-strong bg-surface px-3 text-center font-display text-xl tracking-widest text-fg outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/70"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							size: "lg",
							className: "w-full",
							children: "Save score"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex w-full max-w-xs flex-col gap-2",
					children: [
						!hud.isHigh && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							className: "w-full",
							type: "button",
							onClick: () => g()?.restart(),
							children: "Play again"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							className: "w-full",
							type: "button",
							onClick: () => hud.isHigh ? g()?.submitName(name) : g()?.showScores(),
							children: "High scores"
						}),
						!hud.isHigh && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							className: "w-full",
							type: "button",
							onClick: () => g()?.toTitle(),
							children: "Title"
						})
					]
				})
			] }),
			hud.mode === "scores" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-semibold tracking-widest",
					children: "High scores"
				}),
				hud.scores.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No scores yet. Fly a run."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "w-full max-w-sm divide-y divide-border",
					children: hud.scores.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "grid grid-cols-4 items-baseline gap-2 py-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display tabular-nums text-muted",
								children: i + 1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display tracking-widest",
								children: row.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display tabular-nums text-right",
								children: row.score.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-right text-xs text-muted",
								children: ["W", row.wave]
							})
						]
					}, `${row.at}-${row.name}`))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex w-full max-w-xs flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "w-full",
						type: "button",
						onClick: () => g()?.play(),
						children: "Play"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						className: "w-full",
						type: "button",
						onClick: () => g()?.toTitle(),
						children: "Title"
					})]
				})
			] })
		]
	});
}
function Panel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/60 px-5 py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-surface/95 px-6 py-8 text-center",
			children
		})
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { defaultHud as n, routes_exports as t };
