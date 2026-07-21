// scripts/assemble-handoff.js
import { repairDocLinksByName, rewriteDocLinks, rewriteUuid } from "./core/doc-links.js";
import { findPageHtml } from "./core/journal-source.js";
import { translateMarkup } from "./core/markup.js";
import { convertAddon } from "./core/converters/addon.js";
import { parseFellowshipThemekits } from "./core/converters/fellowship-themekits.js";
import { flattenPackFolders, splitFolders, splitItemFolders } from "./core/converters/folders.js";
import { convertHero } from "./core/converters/hero.js";
import { convertJournal } from "./core/converters/journal.js";
import { convertJourney } from "./core/converters/journey.js";
import { convertNpc } from "./core/converters/npc.js";
import { convertRollTable } from "./core/converters/rolltable.js";
import { convertRote } from "./core/converters/rote.js";
import { convertScene } from "./core/converters/scene.js";
import { convertStoryThemeActor, storyThemesFolder } from "./core/converters/story-theme-actor.js";
import { parseFellowshipThemebook, parseThemebookIndex } from "./core/converters/themebook-fields.js";
import { convertThemebookItem } from "./core/converters/themebook.js";
import { convertThemekit } from "./core/converters/themekit.js";
import { convertTrope, parseTropes } from "./core/converters/trope.js";
import { convertShortChallenge } from "./core/converters/vignette.js";
import { normalizeKitName } from "./core/data/themekit-index.js";
import { normalizeThemebookName } from "./core/util.js";
import { MODULE_ID, ROUTES, SOURCE_MODULES } from "./registry.js";

const ACTOR_CONVERTERS = {
	"litm-character": (a) => ({ ...convertHero(a), folder: a.folder ?? null, sort: a.sort ?? 0 }), // heroes carry no doc links (corpus-verified) — convertHero takes no ctx
	"litm-npc": convertNpc,
	"litm-journey": convertJourney,
};

export const ITEM_CONVERTERS = {
	themekit: convertThemekit,
	themebook: convertThemebookItem,
	shortchallenge: convertShortChallenge,
	"challenge-addon": convertAddon,
	rote: convertRote,
};

// Converted-type prediction without running the converter — the link resolver
// needs every document's destination BEFORE conversion starts (converters call
// convertText, which resolves links). Mirrors each converter's own type
// dispatch; cheap field checks only. Kept in sync with ITEM_CONVERTERS output
// by tests/converted-item-type.test.js — drift here silently misroutes links.
export const CONVERTED_ITEM_TYPE = {
	themekit: () => "theme",
	themebook: (i) => (i.system?.options?.isStoryTheme ? "story_theme" : "themebook"),
	shortchallenge: () => "vignette",
	"challenge-addon": () => "addon",
	rote: () => "action",
};

/**
 * Build the text converter for one source: rewrites world-relative doc links to
 * compendium UUIDs at their converted destination, repairs known dead addon
 * links by label, then translates mist markup. The destination of every source
 * document is captured up front (converters resolve links during conversion, so
 * the map must exist before any converter runs).
 *
 * Story-theme items are promoted to Actors at routing time, so an
 * @UUID[Item.<id>] link to one would rewrite with a mismatched document class
 * (Item link into an Actor pack) — such links are left untouched instead of
 * mapping them to the Actor destination.
 * @param {object} route - the source's ROUTES entry
 * @param {object} adventureData - source bundle (see source-reader.js)
 * @param {string} sourceModuleId - scopes compendium-form link rewriting to this module
 * @returns {{convertText: (s: string) => string, convertUuid: (u: string) => string|null}}
 */
function buildLinkResolver(route, adventureData, sourceModuleId) {
	const classDest = (docClass) => route.packs?.[docClass];
	const destOf = new Map();
	for (const a of adventureData.actors ?? []) destOf.set(`Actor.${a._id}`, classDest("Actor"));
	for (const j of adventureData.journal ?? []) destOf.set(`JournalEntry.${j._id}`, classDest("JournalEntry"));
	for (const s of adventureData.scenes ?? []) destOf.set(`Scene.${s._id}`, classDest("Scene"));
	for (const t of adventureData.tables ?? []) destOf.set(`RollTable.${t._id}`, classDest("RollTable"));
	for (const i of adventureData.items ?? []) {
		const converted = CONVERTED_ITEM_TYPE[i.type]?.(i);
		destOf.set(`Item.${i._id}`, converted === "story_theme" ? undefined : route.itemPacks?.[converted]);
	}
	const resolvePack = (docClass, id) => {
		const dest = destOf.get(`${docClass}.${id}`);
		return typeof dest === "string" ? `${MODULE_ID}.${dest}` : null;
	};

	// Known source-data defect (HoR): the journal links its eight addons as
	// @UUID[Actor.<id>] with ids that exist nowhere in the module — the same
	// content ships as challenge-addon ITEMS under different ids, so those
	// links are broken even in the pristine source. Their labels name the
	// addons unambiguously, so repair by label: a dead Actor link whose label
	// (sans "(Add-on)" suffix) matches an addon routes to the converted item.
	const addonLabel = (s) => (s ?? "").toLowerCase().replace(/\s*\(add-?on\)\s*$/, "").trim();
	const addonByLabel = new Map();
	if (route.itemPacks?.addon) {
		for (const i of adventureData.items ?? []) {
			if (CONVERTED_ITEM_TYPE[i.type]?.(i) !== "addon") continue;
			addonByLabel.set(addonLabel(i.name), `Compendium.${MODULE_ID}.${route.itemPacks.addon}.Item.${i._id}`);
		}
	}
	const repairLink = (docClass, id, label) => {
		if (docClass !== "Actor" || destOf.has(`Actor.${id}`)) return null;
		return addonByLabel.get(addonLabel(label)) ?? null;
	};
	const scopes = [sourceModuleId];
	return {
		convertText: (s) =>
			translateMarkup(repairDocLinksByName(rewriteDocLinks(s, resolvePack, { scopes }), repairLink)),
		convertUuid: (u) => rewriteUuid(u, resolvePack, { scopes }),
	};
}

/**
 * Synthesize trope items from every "Tropes"-shaped journal page a source owns
 * (Core ships one; HoR ships two — Dalish + Uncanny — both routing to the single
 * trope pack). Tropes have no source document type of their own. Throws if a
 * page carries the trope marker but nothing parses (source structure changed).
 * @param {string} sourceModuleId
 * @param {object} adventureData
 * @param {Map<string, string>} kitUuidByName - keys are normalizeKitName(name)
 * @returns {object[]} converted trope docs (empty when the source owns none)
 */
function synthesizeTropes(sourceModuleId, adventureData, kitUuidByName) {
	const resolveKitUuid = (name) => kitUuidByName.get(normalizeKitName(name)) ?? null;
	// Filter on the per-trope marker (`trope-title`), NOT `class="trope"` — the HoR
	// "Woodend & Smaller Dales" page has a stray `class="trope"` div with no trope entries.
	const tropePages = (adventureData.journal ?? [])
		.flatMap((j) => j.pages ?? [])
		.filter((p) => p.type === "text" && /class="trope-title"/.test(p.text?.content ?? ""));
	const docs = [];
	for (const page of tropePages)
		for (const parsed of parseTropes(page.text.content)) docs.push(convertTrope(parsed, { resolveKitUuid }));
	// A source known to have trope pages that yields zero parsed tropes = structural break.
	if (tropePages.length && docs.length === 0)
		throw new Error(`Trope pages found for ${sourceModuleId} but none parsed — source structure changed.`);
	return docs;
}

/**
 * Build the litmv2-shaped handoff payload from a source bundle, routed per the
 * source's ROUTES entry into per-type packs.
 * Full parity: every source document must have a converter AND a destination —
 * anything else aborts the export with per-type counts (the parity gate).
 * @param {string} sourceModuleId
 * @param {object} adventureData - source bundle (see source-reader.js)
 * @param {{kitUuidByName?: Map<string, string>}} [options] - kitUuidByName keys are normalizeKitName(name); used to resolve trope theme-kit references to compendium UUIDs.
 * @returns {{format: 3, sourceId: string, packs: Record<string, {docClass: string, folders: object[], docs: object[]}>}}
 */
export function assembleHandoff(sourceModuleId, adventureData, options = {}) {
	const route = ROUTES[sourceModuleId];
	if (!route) throw new Error(`No destination routing for source module: ${sourceModuleId}`);
	const kitUuidByName = options.kitUuidByName ?? new Map();

	// Envisioning tags and quest ideas are printed in the rulebook but absent from the
	// mist-engine source data — synthesized once from the owned "Themebooks" journal
	// page (and, below, the Fellowship from "Fellowship Creation") when this source
	// ships one. A present-but-degenerate page means the source structure changed
	// under the regex-only parser — fail loud rather than silently ship blank fields.
	const themebooksHtml = findPageHtml(adventureData, "Themebooks");
	const themebookFields = themebooksHtml ? parseThemebookIndex(themebooksHtml) : {};
	if (themebooksHtml && Object.keys(themebookFields).length === 0)
		throw new Error("Themebooks page found but no themebook types parsed — source structure changed.");
	const fellowshipHtml = findPageHtml(adventureData, "Fellowship Creation");

	// Link resolution keys on each document's converted destination, so it must
	// be built before any converter runs (converters call convertText, which
	// resolves links).
	const { convertText, convertUuid } = buildLinkResolver(route, adventureData, sourceModuleId);

	// Folder-derived kit hints: Themekits/<Level>/<Themebook> paths.
	const folderById = new Map((adventureData.folders ?? []).map((f) => [f._id, f]));
	const folderChain = (fid) => {
		const names = [];
		for (let f = folderById.get(fid); f; f = folderById.get(f.folder)) names.unshift(f.name);
		return names;
	};
	const LEVELS = new Set(["origin", "adventure", "greatness"]);
	const kitHints = (source) => {
		const chain = folderChain(source.folder).map((n) => n.toLowerCase());
		const level = chain.find((n) => LEVELS.has(n));
		const themebook = folderChain(source.folder).at(-1);
		return { level, themebook: level ? themebook : undefined };
	};
	const ctx = { convertText, convertUuid, kitHints, themebookFields };

	const packs = {};
	const packGroup = (packName, docClass) => (packs[packName] ??= { docClass, folders: [], docs: [] });

	const unknown = {};
	const note = (type) => (unknown[type] = (unknown[type] ?? 0) + 1);
	const routeDoc = (docClass, doc, sourceType) => {
		const packName = route.packs?.[docClass];
		if (packName) packGroup(packName, docClass).docs.push(doc);
		else note(sourceType);
	};

	let storyThemeCount = 0;
	for (const actor of adventureData.actors ?? []) {
		const convert = ACTOR_CONVERTERS[actor.type];
		convert ? routeDoc("Actor", convert(actor, ctx), actor.type) : note(actor.type);
	}
	const itemFolderRefs = [];
	for (const item of adventureData.items ?? []) {
		const predict = CONVERTED_ITEM_TYPE[item.type];
		if (!predict) { note(item.type); continue; }
		if (predict(item) === "story_theme") {
			routeDoc("Actor", convertStoryThemeActor(item, ctx), item.type);
			storyThemeCount++;
			continue;
		}
		const converted = ITEM_CONVERTERS[item.type](item, ctx);
		const packName = route.itemPacks?.[converted.type];
		if (!packName) { note(`${item.type}→${converted.type}`); continue; }
		packGroup(packName, "Item").docs.push(converted);
		itemFolderRefs.push({ folder: item.folder ?? null, pack: packName });
	}
	// The Fellowship themebook: Core Book ≥1.2 ships it as a real doc, but that
	// doc is incomplete where the "Fellowship Creation" page is not — its five
	// specialImprovements have EMPTY names (source data defect; the converter's
	// empty-name filter drops them) and, like all source themebooks, it carries
	// no envisioningTags/questIdeas. Merge the page-parsed fields into the
	// official doc; only when no official doc exists (older module versions) is
	// the fully synthesized themebook pushed instead.
	const themebookPack = route.itemPacks?.themebook;
	const themebookDocs = themebookPack ? (packs[themebookPack]?.docs ?? []) : [];
	const official = themebookDocs.find((d) => normalizeThemebookName(d.name).includes("fellowship"));
	// An official Fellowship doc WITHOUT the page would ship subtly wrong (no
	// envisioning tags/quest ideas, zero improvements after the empty-name
	// filter, isFellowship false) — that's worse than absent, so fail loud.
	if (official && !fellowshipHtml)
		throw new Error("Official Fellowship themebook found but no Fellowship Creation page — source structure changed (the page supplies its envisioning tags, quest ideas, and special improvements).");
	if (themebookPack && themebookDocs.length && fellowshipHtml) {
		const fellowship = parseFellowshipThemebook(fellowshipHtml);
		if (!fellowship) throw new Error("Fellowship Creation page found but the Fellowship themebook block did not parse.");
		if (official) {
			official.system.isFellowship = true;
			official.system.envisioningTags = fellowship.system.envisioningTags;
			official.system.questIdeas = fellowship.system.questIdeas;
			if (!official.system.specialImprovements.length)
				official.system.specialImprovements = fellowship.system.specialImprovements;
		} else {
			const folder = themebookDocs[0].folder ?? null;
			fellowship.folder = folder;
			packs[themebookPack].docs.push(fellowship);
			itemFolderRefs.push({ folder, pack: themebookPack });
		}
	}
	// Fellowship themekits have no source document — synthesize them from the owned page.
	// Unlike the flat themebook pack above, the themekit pack is deeply folder-nested by
	// Themekits/<Level>/<Themebook>, so there is no single "shared folder" among its docs
	// to copy — docs[0].folder would be some arbitrary real kit's tier/themebook folder
	// and would misfile the 6 Fellowship kits (which span origin/adventure tiers). Place
	// them at the pack root instead: folder null, and no itemFolderRefs entry (a null
	// folder has no ancestors for splitItemFolders to walk, so omitting it is equivalent
	// to pushing it — but explicit is clearer here).
	const themekitPack = route.itemPacks?.theme;
	if (themekitPack && packs[themekitPack]?.docs.length && fellowshipHtml) {
		const fellowshipKits = parseFellowshipThemekits(fellowshipHtml);
		for (const kit of fellowshipKits) {
			kit.folder = null;
			packs[themekitPack].docs.push(kit);
		}
	}

	// Tropes route to the source's trope pack (Core: litm-core-book-tropes; HoR: litm-hor-tropes).
	const tropePack = route.itemPacks?.trope;
	if (tropePack)
		for (const trope of synthesizeTropes(sourceModuleId, adventureData, kitUuidByName))
			packGroup(tropePack, "Item").docs.push(trope);

	for (const journal of adventureData.journal ?? []) routeDoc("JournalEntry", convertJournal(journal, ctx), "JournalEntry");
	for (const scene of adventureData.scenes ?? []) routeDoc("Scene", convertScene(scene), "Scene");
	for (const table of adventureData.tables ?? []) routeDoc("RollTable", convertRollTable(table, ctx), "RollTable");

	if (Object.keys(unknown).length) {
		const counts = Object.entries(unknown).map(([k, v]) => `${k} (${v})`).join(", ");
		throw new Error(`No destination for source document type(s): ${counts}. Full parity requires all types to convert and route.`);
	}

	// Folders. Item folders follow their documents (per pack, shared ancestors
	// replicated); Actor/Journal/Scene folders go whole to their class pack.
	const folders = adventureData.folders ?? [];
	const packClasses = ["Actor", "JournalEntry", "Scene", "RollTable"].filter((c) => route.packs?.[c]);
	for (const [docClass, classFolders] of Object.entries(splitFolders(folders, packClasses))) {
		packGroup(route.packs[docClass], docClass).folders.push(...classFolders);
	}
	for (const [packName, packFolders] of Object.entries(splitItemFolders(folders, itemFolderRefs))) {
		packGroup(packName, "Item").folders.push(...packFolders);
	}
	// A story theme without an Actor route would already have tripped the
	// parity gate above, so the Actor pack is guaranteed here.
	if (storyThemeCount) packGroup(route.packs.Actor, "Actor").folders.push(storyThemesFolder());

	// Flatten redundant wrappers per approved trees (see 2026-07-12 spec).
	// Wrapper name = the part of the module label after the em-dash
	// ("Legend In The Mist — Character Pack" → "Character Pack"), compared
	// case-insensitively against folder names.
	const wrapper = SOURCE_MODULES.find((m) => m.id === sourceModuleId)?.label.split("—").pop().trim();
	for (const group of Object.values(packs)) flattenPackFolders(group, wrapper ? [wrapper] : []);

	// Link parity gate: an in-scope compendium link that survives to the payload
	// can never resolve in a litmv2 world (its target was not converted — e.g. a
	// future rulebook link into a skipPacks pack). Only source-module compendium
	// UUIDs are guaranteed-dead. Fail loud rather than ship broken links.
	const residual = JSON.stringify(packs)
		.match(new RegExp(`Compendium\\.${sourceModuleId}\\.`, "g"));
	if (residual)
		throw new Error(`${residual.length} link(s) into ${sourceModuleId} could not be rewritten to converted content (unconverted or skipped target?). Full parity requires every referenced document to convert.`);

	return { format: 3, sourceId: sourceModuleId, packs };
}

/**
 * Per-document-class counts for one handoff payload (manifest + toasts).
 * @param {ReturnType<typeof assembleHandoff>} payload
 * @returns {Record<string, number>}
 */
export function payloadCounts(payload) {
	const counts = {};
	for (const group of Object.values(payload.packs ?? {})) {
		if (group.docs.length) counts[group.docClass] = (counts[group.docClass] ?? 0) + group.docs.length;
	}
	return counts;
}
