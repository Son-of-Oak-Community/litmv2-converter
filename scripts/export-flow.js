// scripts/export-flow.js
import { assembleHandoff, payloadCounts } from "./assemble-handoff.js";
import { normalizeKitName } from "./core/data/themekit-index.js";
import { readSourceBundle } from "./core/source-reader.js";
import { deterministicId } from "./core/util.js";
import { copyPackBanners, ensureHandoffDir, readHandoffJSON, writeHandoffJSON, writeHandoffThumb } from "./handoff-io.js";
import { MODULE_ID, ROUTES, SOURCE_MODULES } from "./registry.js";

const FELLOWSHIP_KIT_NAMES = [
	"Fellowship of the Amulet", "Fortune Hunters", "Itinerant Sellswords",
	"Powerful Household", "Protectors Against the Dark", "Tavern Buddies",
];

/**
 * kitName(normalized) → destination theme UUID, across all installed source modules,
 * plus the 6 synthesized Fellowship kits (core-book themekits pack). Cross-source
 * because a trope on one source can reference a kit shipped by another (e.g. a HoR
 * trope naming a Core Book kit).
 * @returns {Promise<Map<string, string>>}
 */
// Compendium packs are immutable within a session (updating a source module
// forces a reload), so the kit map is built once and shared by every
// exportSource call in a run — Core Book ≥1.2 makes a bundle read ten
// getDocuments calls, and rebuilding per source tripled that for nothing.
let kitUuidMapPromise = null;

function buildKitUuidMap() {
	kitUuidMapPromise ??= buildKitUuidMapUncached().catch((e) => {
		kitUuidMapPromise = null;
		throw e;
	});
	return kitUuidMapPromise;
}

async function buildKitUuidMapUncached() {
	const map = new Map();
	for (const mod of SOURCE_MODULES) {
		const themePack = ROUTES[mod.id]?.itemPacks?.theme;
		if (!themePack || !game.modules.get(mod.id)?.active) continue;
		const bundle = await readSourceBundle(mod.id, mod);
		for (const it of bundle.items) {
			if (it.type !== "themekit") continue;
			map.set(normalizeKitName(it.name), `Compendium.${MODULE_ID}.${themePack}.Item.${it._id}`);
		}
		// Synthesized Fellowship kits live in the core-book themekits pack.
		if (mod.id === "legend-in-the-mist-core-book") {
			for (const name of FELLOWSHIP_KIT_NAMES)
				map.set(normalizeKitName(name), `Compendium.${MODULE_ID}.${themePack}.Item.${deterministicId(`themekit:fellowship:${name}`)}`);
		}
	}
	return map;
}

/**
 * Bake a thumbnail into each converted scene that lacks one. The source ships
 * scenes with `thumb: null`, and core's auto-thumbnail (Scene#_preCreate) only
 * fires when `thumb` is absent from the creation data — our pack imports (and
 * any later world import) always carry the field, so without baking here the
 * scenes render blank in the sidebar. Thumbs are stored as files under the
 * module's handoff dir and referenced by path (see writeHandoffThumb for why
 * not base64). Failures (e.g. the noCanvas setting) skip the scene rather than
 * abort the export.
 * @param {object[]} scenes - converted scene data, mutated in place
 */
async function bakeSceneThumbnails(scenes) {
	for (const data of scenes) {
		if (data.thumb) continue;
		try {
			const scene = new Scene(foundry.utils.deepClone(data));
			if (!scene.initialLevel?.background?.src) continue;
			const { thumb } = await scene.createThumbnail();
			data.thumb = await writeHandoffThumb(`${data._id}-thumb.webp`, thumb);
		} catch (e) {
			console.warn(`${MODULE_ID} | Could not generate a thumbnail for scene "${data.name}"`, e);
		}
	}
}

/**
 * Convert one installed source module and write its handoff JSON + manifest entry.
 * @param {string} sourceModuleId
 */
export async function exportSource(sourceModuleId) {
	const mod = SOURCE_MODULES.find(m => m.id === sourceModuleId);
	if (!mod) throw new Error(`Unknown source module: ${sourceModuleId}`);
	if (!game.modules.get(mod.id)?.active)
		throw new Error(`Source module is not enabled in this world (are you in a mist-engine world?): ${mod.id}`);

	await ensureHandoffDir();
	await copyPackBanners();
	const bundle = await readSourceBundle(mod.id, mod);
	const kitUuidByName = await buildKitUuidMap();
	const payload = assembleHandoff(mod.id, bundle, { kitUuidByName });
	for (const group of Object.values(payload.packs)) {
		if (group.docClass === "Scene") await bakeSceneThumbnails(group.docs);
	}
	const counts = payloadCounts(payload);
	const file = `${mod.id}.json`;
	await writeHandoffJSON(file, payload);

	const manifest = (await readHandoffJSON("manifest.json")) ?? { sources: [] };
	// Unconditional: a stale manifest on disk must not pin an older version.
	manifest.version = 3;
	manifest.sources = manifest.sources.filter(s => s.id !== mod.id);
	manifest.sources.push({ id: mod.id, label: mod.label, exportedAt: new Date().toISOString(), file, counts });
	await writeHandoffJSON("manifest.json", manifest);

	return { sourceId: mod.id, counts, file };
}
