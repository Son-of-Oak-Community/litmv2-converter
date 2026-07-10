const FOLDER_FIELDS = ["_id", "type", "name", "folder", "color", "sorting", "sort", "description", "flags"];

/**
 * Folder creation data with non-nullable fields defaulted
 * (description is a non-nullable HTMLField on Folder — default "" not null).
 * @param {object} folder
 * @returns {object}
 */
export function normalizeFolder(folder) {
	const data = {};
	for (const f of FOLDER_FIELDS)
		data[f] = folder[f] ?? (f === "flags" ? {} : f === "sort" ? 0 : f === "description" ? "" : null);
	return data;
}

/**
 * Split adventure folders by document class for per-pack import.
 * @param {object[]} folders - adventure `folders` array
 * @param {string[]} classes - document classes to include
 * @returns {Record<string, object[]>} class → folder creation data
 */
export function splitFolders(folders, classes) {
	const out = {};
	for (const folder of folders ?? []) {
		if (!classes.includes(folder.type)) continue;
		(out[folder.type] ??= []).push(normalizeFolder(folder));
	}
	return out;
}

/**
 * Assign Item folders to destination packs: a folder lands in every pack that
 * received a document from it or from any descendant folder. Shared ancestor
 * folders are replicated per pack (compendium folder collections are
 * per-pack, so the same _id in two packs cannot collide). Source array order
 * is preserved so parents precede children at creation time.
 * @param {object[]} folders - all source adventure folders
 * @param {Array<{folder: string|null, pack: string}>} refs - one per routed item doc
 * @returns {Record<string, object[]>} pack → folder creation data
 */
export function splitItemFolders(folders, refs) {
	const byId = new Map((folders ?? []).filter((f) => f.type === "Item").map((f) => [f._id, f]));
	const packsByFolder = new Map();
	for (const { folder, pack } of refs ?? []) {
		for (let f = byId.get(folder); f; f = byId.get(f.folder)) {
			if (!packsByFolder.has(f._id)) packsByFolder.set(f._id, new Set());
			packsByFolder.get(f._id).add(pack);
		}
	}
	const out = {};
	for (const folder of folders ?? []) {
		for (const pack of packsByFolder.get(folder._id) ?? []) {
			(out[pack] ??= []).push(normalizeFolder(folder));
		}
	}
	return out;
}

/**
 * Flatten redundant pack folder structure in place.
 * Rule 1: folders named after the source module (wrapperNames,
 * case-insensitive) are removed — the pack is already scoped to the module —
 * and their children/docs reparent one level up (wrapper chains collapse).
 * Rule 2: afterwards, while the root level holds exactly one folder with no
 * direct docs (a pure type wrapper like "Themekits"), promote its children.
 * Only ever promotes; never drops a document.
 * @param {{folders: object[], docs: object[]}} group - one handoff pack group
 * @param {string[]} wrapperNames
 */
export function flattenPackFolders(group, wrapperNames) {
	const wrappers = new Set(wrapperNames.map((n) => n.toLowerCase()));
	const removedParent = new Map();
	for (const folder of group.folders)
		if (wrappers.has((folder.name ?? "").toLowerCase())) removedParent.set(folder._id, folder.folder ?? null);
	const resolve = (id) => {
		let parent = id ?? null;
		while (parent !== null && removedParent.has(parent)) parent = removedParent.get(parent);
		return parent;
	};
	group.folders = group.folders.filter((folder) => !removedParent.has(folder._id));
	for (const folder of group.folders) folder.folder = resolve(folder.folder);
	for (const doc of group.docs) doc.folder = resolve(doc.folder);

	for (;;) {
		const roots = group.folders.filter((folder) => !folder.folder);
		if (roots.length !== 1) break;
		const [root] = roots;
		if (group.docs.some((doc) => doc.folder === root._id)) break;
		group.folders = group.folders.filter((folder) => folder !== root);
		for (const folder of group.folders) if (folder.folder === root._id) folder.folder = null;
	}
}
