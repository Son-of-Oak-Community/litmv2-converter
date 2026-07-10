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
