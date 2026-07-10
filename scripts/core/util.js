import { SYSTEM } from "../registry.js";

const SMALL_WORDS = new Set(["a", "an", "and", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

/**
 * Capitalize the first alphabetic character of a token and the first
 * alphabetic character after any hyphen, skipping leading quote/apostrophe
 * (or other non-letter) characters at each of those positions.
 * @param {string} w
 * @returns {string}
 */
function capitalizeToken(w) {
	return w.replace(/(^|-)([^a-zA-Z]*)([a-zA-Z])/g, (_, sep, lead, ch) => sep + lead + ch.toUpperCase());
}

/**
 * Title-case a name the way the reference port does: only rewrites words that
 * are ALL-CAPS (mixed-case input passes through untouched); small words stay
 * lowercase except in first position.
 * @param {string} s
 * @returns {string}
 */
export function titleCase(s) {
	const str = s ?? "";
	if (!/[A-Z]{2}/.test(str) || /[a-z]/.test(str)) return str;
	const words = str.toLowerCase().split(/(\s+)/);
	let firstWord = true;
	return words
		.map((w) => {
			if (/^\s+$/.test(w) || !w) return w;
			const out = firstWord || !SMALL_WORDS.has(w) ? capitalizeToken(w) : w;
			firstWord = false;
			return out;
		})
		.join("");
}

export const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n || 0)));

/** Keep only entries carrying a non-empty trimmed `name`. */
export const named = (tags) => (tags ?? []).filter((t) => (t?.name ?? "").trim());

/** A litmv2 built-in media icon by filename (single source of the target-system asset base). */
export const litmIcon = (file) => `systems/${SYSTEM.target}/assets/media/icons/${file}`;

/** litmv2 theme/kit icon for a might level (the system's own per-level glyph convention). */
export const levelIcon = (level) => litmIcon(`${level}.svg`);

/**
 * Join description parts into HTML: wrap plain-text parts in <p>, keep parts
 * that already look like HTML, drop empties.
 * @param {Array<string|undefined>} parts
 * @returns {string}
 */
export function paragraphs(parts) {
	return (parts ?? [])
		.map((p) => (p ?? "").trim())
		.filter(Boolean)
		.map((p) => (p.startsWith("<") ? p : `<p>${p}</p>`))
		.join("");
}

/**
 * Source images under systems/mist-engine-fvtt/ don't exist in a litmv2
 * world; swap them (and empties) for a litmv2-appropriate fallback.
 * @param {string|null|undefined} src
 * @param {string} fallback
 * @returns {string}
 */
export function remapSystemAsset(src, fallback) {
	if (!src) return fallback;
	return src.startsWith(`systems/${SYSTEM.source}/`) ? fallback : src;
}

/** Remap a prototype token's texture if it points at a source-system asset. */
export function retoken(prototypeToken, fallbackIcon) {
	const token = prototypeToken ?? {};
	const texture = { ...(token.texture ?? {}), src: remapSystemAsset(token.texture?.src, fallbackIcon) };
	return { ...token, texture };
}

/** Normalize a themebook name for keying: lowercase, non-alphanumerics → single spaces. */
export function normalizeThemebookName(s) {
	return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function fnv1a(str) {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

/**
 * Deterministic 16-char Foundry-shaped id ([A-Za-z0-9]{16}) from a seed.
 * Same seed → same id within one export, so embedded tag effects can be
 * referenced by action tag suggestions in the same handoff payload.
 * @param {string} seed
 * @returns {string}
 */
export function deterministicId(seed) {
	let out = "";
	for (let n = 0; out.length < 16; n++) {
		let h = fnv1a(`${seed}:${n}`);
		for (let k = 0; k < 4 && out.length < 16; k++) {
			out += ID_CHARS[h % 62];
			h = (h / 62) | 0;
		}
	}
	return out;
}
