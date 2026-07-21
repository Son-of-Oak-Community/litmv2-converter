// scripts/import-flow.js
import { createProgressReporter } from "./core/progress.js";
import { readHandoffJSON } from "./handoff-io.js";
import { MODULE_ID, PACKS } from "./registry.js";

const DOC_CLASS = {
	Actor: () => Actor,
	Item: () => Item,
	JournalEntry: () => JournalEntry,
	Scene: () => Scene,
	RollTable: () => RollTable,
};

async function withUnlockedPack(packName, fn) {
	const pack = game.packs.get(`${MODULE_ID}.${packName}`);
	if (!pack) throw new Error(`Missing destination pack: ${MODULE_ID}.${packName}`);
	await pack.configure({ locked: false });
	try {
		return await fn(pack);
	} finally {
		await pack.configure({ locked: true });
	}
}

async function readManifestPayloads() {
	const manifest = await readHandoffJSON("manifest.json");
	if (!manifest?.sources?.length) {
		throw new Error("No handoff manifest found. Run the export in a mist-engine world first.");
	}
	const payloads = [];
	for (const src of manifest.sources) {
		const payload = await readHandoffJSON(src.file);
		if (payload) {
			if (payload.format !== 3) {
				throw new Error(`Handoff file ${src.file} was produced by an older converter version. Re-run the export in your mist-engine world (Update Content), then import again.`);
			}
			payloads.push(payload);
		} else {
			const message = `${MODULE_ID} | Skipping unreadable handoff file: ${src.file}`;
			console.warn(message);
			ui.notifications.warn(message);
		}
	}
	return { manifest, payloads };
}

/** Merge the payloads' per-pack groups: { packName: { docClass, folders, docs } } */
function groupByPack(payloads) {
	const groups = {};
	for (const payload of payloads) {
		for (const [packName, g] of Object.entries(payload.packs ?? {})) {
			const group = (groups[packName] ??= { docClass: g.docClass, folders: [], docs: [] });
			group.folders.push(...(g.folders ?? []));
			group.docs.push(...(g.docs ?? []));
		}
	}
	return groups;
}

async function createGroups(groups, report = () => {}) {
	const imported = {};
	for (const [packName, group] of Object.entries(groups)) {
		report(`Importing ${packName}…`);
		await withUnlockedPack(packName, async (pack) => {
			if (group.folders.length) {
				// No-op on the reimport path (folders were just deleted above); this
				// dedup exists for the additive importAll path, where re-running
				// against a pack that already has these folders must not re-create them.
				const existing = new Set(pack.folders.keys());
				const fresh = group.folders.filter((f) => !existing.has(f._id));
				if (fresh.length) await Folder.createDocuments(fresh, { pack: pack.collection, keepId: true });
			}
			if (group.docs.length) {
				await DOC_CLASS[group.docClass]().createDocuments(group.docs, { pack: pack.collection, keepId: true });
				imported[group.docClass] = (imported[group.docClass] ?? 0) + group.docs.length;
			}
		});
	}
	return imported;
}

/**
 * Import every exported source's converted documents into the module's own
 * packs (additive; keepId overwrites documents that already exist).
 * @returns {Promise<{imported: Record<string, number>, sources: string[]}>}
 */
export async function importAll({ onProgress } = {}) {
	const { payloads } = await readManifestPayloads();
	const groups = groupByPack(payloads);
	const report = createProgressReporter(Object.keys(groups).length, onProgress);
	const imported = await createGroups(groups, report);
	return { imported, sources: payloads.map((p) => p.sourceId) };
}

/**
 * Delete everything in ALL destination packs, then re-import from the
 * handoff. The update path: removes documents that no longer exist upstream.
 * @returns {Promise<{imported: Record<string, number>, sources: string[]}>}
 */
export async function reimportAll({ onProgress } = {}) {
	const { payloads } = await readManifestPayloads();
	const groups = groupByPack(payloads);
	const report = createProgressReporter(PACKS.length + Object.keys(groups).length, onProgress);
	// Purge the full destination-pack universe, not just packs present in this
	// handoff — a pack that dropped to zero across payloads must still be cleared.
	for (const { name, docClass } of PACKS) {
		report(`Clearing ${name}…`);
		await withUnlockedPack(name, async (pack) => {
			const docIds = pack.index.contents.map((e) => e._id);
			if (docIds.length) await DOC_CLASS[docClass]().deleteDocuments(docIds, { pack: pack.collection });
			const folderIds = [...pack.folders.keys()];
			if (folderIds.length) await Folder.deleteDocuments(folderIds, { pack: pack.collection });
		});
	}
	const imported = await createGroups(groups, report);
	return { imported, sources: payloads.map((p) => p.sourceId) };
}
