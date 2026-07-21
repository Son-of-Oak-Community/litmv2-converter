// scripts/handoff-io.js
// Shared handoff-file I/O for the export and import flows: one directory
// constant plus read/write/ensure helpers over the module's handoff dir.
import { MODULE_ID } from "./registry.js";

export const HANDOFF_DIR = `modules/${MODULE_ID}/handoff`;
const THUMBS_DIR = `${HANDOFF_DIR}/thumbs`;

const FP = () => foundry.applications.apps.FilePicker.implementation;

async function ensureDir(path, ensured = { done: false }) {
	if (ensured.done) return;
	try { await FP().createDirectory("data", path); }
	catch (err) { if (!/EEXIST/.test(err?.message ?? "")) throw err; }
	ensured.done = true;
}

const handoffEnsured = { done: false };
const thumbsEnsured = { done: false };
export async function ensureHandoffDir() {
	return ensureDir(HANDOFF_DIR, handoffEnsured);
}

const BANNERS_DIR = `${HANDOFF_DIR}/banners`;
const BANNER_SOURCE_DIR = "modules/legend-in-the-mist-core-book/assets/art/banners";

/**
 * Destination pack → Core Book banner slice. The ten official banners are
 * consecutive horizontal slices of ONE tall landscape painting; the official
 * module assigns them to its packs in sidebar display order (alphabetical by
 * label) so adjacent rows stitch into a continuous scene. Mirror that: within
 * each of our sidebar folders, packs get banner_01..N in alphabetical-label
 * order (enforced by tests/banners.test.js). Files are COPIED from the user's
 * installed (owned) Core Book module into the handoff dir at export time —
 * module.json's static banner paths point at the copies, and nothing official
 * is committed to this repo.
 */
export const BANNER_SOURCES = {
	// Character Pack folder
	"litm-character-pack": "banner_01.webp",
	// Core Book folder: Actors, Oracle Tables, Rotes, Rulebooks, Themebooks,
	// Themekits, Tropes, Vignettes & Add-ons
	"litm-core-book-actors": "banner_01.webp",
	"litm-core-book-tables": "banner_02.webp",
	"litm-core-book-rotes": "banner_03.webp",
	"litm-core-book-journals": "banner_04.webp",
	"litm-core-book-themebooks": "banner_05.webp",
	"litm-core-book-themekits": "banner_06.webp",
	"litm-core-book-tropes": "banner_07.webp",
	"litm-core-book-items": "banner_08.webp",
	// Hearts of Ravendale folder: Challenge Add-ons, The Dale, Themekits, Tropes
	"litm-hor-items": "banner_01.webp",
	"litm-hor-the-dales": "banner_02.webp",
	"litm-hor-themekits": "banner_03.webp",
	"litm-hor-tropes": "banner_04.webp",
};

const bannersEnsured = { done: false };
const bannersCopied = { done: false };

/**
 * Copy pack banner art from the installed Core Book module into
 * handoff/banners/<destPack>.webp. Silent no-op per file when the Core Book
 * module (the only official module shipping banner slices) is not installed —
 * packs then render without a banner, which is cosmetic. Runs once per session.
 */
export async function copyPackBanners() {
	if (bannersCopied.done) return;
	await ensureHandoffDir();
	await ensureDir(BANNERS_DIR, bannersEnsured);
	for (const [packName, file] of Object.entries(BANNER_SOURCES)) {
		try {
			const res = await fetch(`/${BANNER_SOURCE_DIR}/${file}`);
			if (!res.ok) continue;
			const blob = await res.blob();
			const upload = new File([blob], `${packName}.webp`, { type: blob.type || "image/webp" });
			await FP().upload("data", BANNERS_DIR, upload, {}, { notify: false });
		} catch (err) {
			console.warn(`${MODULE_ID} | Could not copy banner for ${packName}`, err);
		}
	}
	bannersCopied.done = true;
}

/**
 * Write a data-URL image into the handoff thumbs dir and return its path.
 * Stored as a real file (not base64 in the document) so the pack content stays
 * world-independent — the server extracts base64 document data into the
 * IMPORTING world's assets dir, which breaks in every other world once that
 * world is deleted.
 * @param {string} name - file name, e.g. `<sceneId>-thumb.webp`
 * @param {string} dataUrl - base64 data URL
 * @returns {Promise<string>} the stored file's path
 */
export async function writeHandoffThumb(name, dataUrl) {
	await ensureHandoffDir();
	await ensureDir(THUMBS_DIR, thumbsEnsured);
	const blob = await (await fetch(dataUrl)).blob();
	const file = new File([blob], name, { type: blob.type });
	const result = await FP().upload("data", THUMBS_DIR, file, {}, { notify: false });
	if (!result?.path) throw new Error(`Upload failed for ${name} to ${THUMBS_DIR}`);
	return result.path;
}

export async function writeHandoffJSON(name, data) {
	const file = new File([JSON.stringify(data, null, "\t")], name, { type: "application/json" });
	const result = await FP().upload("data", HANDOFF_DIR, file, {}, { notify: false });
	if (!result?.path) throw new Error(`Upload failed for ${name} to ${HANDOFF_DIR}`);
}

/** Read+parse a handoff JSON file, or null if missing/unreadable. Cache-busted per read. */
export async function readHandoffJSON(name) {
	try { return await fetch(`/${HANDOFF_DIR}/${name}?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)); }
	catch { return null; }
}
