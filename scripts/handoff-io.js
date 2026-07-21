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
const CORE_BOOK = "legend-in-the-mist-core-book";
const HOR = "legend-in-the-mist-hearts-of-ravendale";

/**
 * Destination pack → official banner slice. Each official module's banners are
 * consecutive horizontal slices of ONE tall painting; the official modules
 * assign them to their packs in sidebar display order so adjacent rows stitch
 * into a continuous scene. Mirror that: within each of our sidebar folders,
 * packs get banner_01..N in alphabetical-label order — our folders sort "a" —
 * (enforced by tests/banners.test.js). Files are COPIED from the user's
 * installed (owned) source module into the handoff dir at export time —
 * module.json's static banner paths point at the copies, and nothing official
 * is committed to this repo. The Character Pack module ships no banners, so
 * its pack borrows the Core Book's first slice.
 */
export const BANNER_SOURCES = {
	// Character Pack folder
	"litm-character-pack": { module: CORE_BOOK, file: "banner_01.webp" },
	// Core Book folder: Actors, Oracle Tables, Rotes, Rulebooks, Themebooks,
	// Themekits, Tropes, Vignettes & Add-ons
	"litm-core-book-actors": { module: CORE_BOOK, file: "banner_01.webp" },
	"litm-core-book-tables": { module: CORE_BOOK, file: "banner_02.webp" },
	"litm-core-book-rotes": { module: CORE_BOOK, file: "banner_03.webp" },
	"litm-core-book-journals": { module: CORE_BOOK, file: "banner_04.webp" },
	"litm-core-book-themebooks": { module: CORE_BOOK, file: "banner_05.webp" },
	"litm-core-book-themekits": { module: CORE_BOOK, file: "banner_06.webp" },
	"litm-core-book-tropes": { module: CORE_BOOK, file: "banner_07.webp" },
	"litm-core-book-items": { module: CORE_BOOK, file: "banner_08.webp" },
	// Hearts of Ravendale folder: Actors, Challenge Add-ons, Maps & Scenes,
	// The Dale, Themekits, Tropes (HoR ≥1.1.2 ships 7 slices; the 7th is unused)
	"litm-hor-actors": { module: HOR, file: "banner_01.webp" },
	"litm-hor-items": { module: HOR, file: "banner_02.webp" },
	"litm-hor-scenes": { module: HOR, file: "banner_03.webp" },
	"litm-hor-journals": { module: HOR, file: "banner_04.webp" },
	"litm-hor-themekits": { module: HOR, file: "banner_05.webp" },
	"litm-hor-tropes": { module: HOR, file: "banner_06.webp" },
};

const bannersEnsured = { done: false };
const bannersCopied = { done: false };

/**
 * Copy pack banner art from the installed source modules into
 * handoff/banners/<destPack>.webp. Silent no-op per file when the owning
 * module is not installed — packs then render without a banner, which is
 * cosmetic. Runs once per session.
 */
export async function copyPackBanners() {
	if (bannersCopied.done) return;
	await ensureHandoffDir();
	await ensureDir(BANNERS_DIR, bannersEnsured);
	for (const [packName, { module, file }] of Object.entries(BANNER_SOURCES)) {
		try {
			const res = await fetch(`/modules/${module}/assets/art/banners/${file}`);
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
