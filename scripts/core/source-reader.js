// scripts/core/source-reader.js
// Normalizes a source module's packs into ONE bundle regardless of packaging:
// the original modules ship a single Adventure document with everything
// embedded; Core Book ≥1.2.0 ships typed packs instead. Both collapse to the
// same shape here so assemble-handoff never has to care. Adventure metadata is
// hoisted to the top level (bundle.name/_id/… + hasAdventure) because that is
// the shape assembleHandoff's HoR adventure block already reads.

const BUCKET = { Actor: "actors", Item: "items", JournalEntry: "journal", Scene: "scenes", RollTable: "tables" };

/**
 * Pure bundle assembly from pre-read pack entries.
 * @param {Array<{type: string, docs: object[], folders: object[]}>} packEntries
 * @returns {{hasAdventure: boolean, _id?: string, name?: string, img?: string, caption?: string, description?: string, sort?: number, actors: object[], items: object[], journal: object[], scenes: object[], tables: object[], folders: object[]}}
 */
export function bucketSourceDocs(packEntries) {
	const bundle = {
		hasAdventure: false,
		actors: [], items: [], journal: [], scenes: [], tables: [], folders: [],
	};
	for (const entry of packEntries) {
		bundle.folders.push(...(entry.folders ?? []));
		if (entry.type === "Adventure") {
			for (const adv of entry.docs ?? []) {
				// Metadata hoisting is single-adventure by design; a second doc
				// would silently overwrite the first's identity.
				if (bundle.hasAdventure)
					throw new Error("Multiple Adventure documents in one source module — unsupported source shape.");
				bundle.hasAdventure = true;
				bundle._id = adv._id;
				bundle.name = adv.name;
				bundle.img = adv.img;
				bundle.caption = adv.caption;
				bundle.description = adv.description;
				bundle.sort = adv.sort;
				bundle.actors.push(...(adv.actors ?? []));
				bundle.items.push(...(adv.items ?? []));
				bundle.journal.push(...(adv.journal ?? []));
				bundle.scenes.push(...(adv.scenes ?? []));
				bundle.tables.push(...(adv.tables ?? []));
				bundle.folders.push(...(adv.folders ?? []));
			}
			continue;
		}
		const key = BUCKET[entry.type];
		// Full parity: an unroutable pack type must abort, not silently vanish.
		if (!key) throw new Error(`Unsupported source pack document type: ${entry.type}`);
		bundle[key].push(...(entry.docs ?? []));
	}
	return bundle;
}

/**
 * Read every compendium pack a source module ships (minus skipPacks) and
 * bundle the contents. Runs in a Foundry world (uses `game`).
 * @param {string} sourceModuleId
 * @param {{skipPacks?: string[]}} [options]
 */
export async function readSourceBundle(sourceModuleId, { skipPacks = [] } = {}) {
	const packs = game.packs.filter(
		(p) => p.metadata.packageName === sourceModuleId && !skipPacks.includes(p.metadata.name),
	);
	if (!packs.length)
		throw new Error(`No compendium packs found for ${sourceModuleId} (is the module enabled in this world?)`);
	const entries = [];
	for (const pack of packs) {
		const docs = (await pack.getDocuments()).map((d) => d.toObject());
		const folders = pack.folders.contents.map((f) => f.toObject());
		entries.push({ type: pack.metadata.type, docs, folders });
	}
	return bucketSourceDocs(entries);
}
