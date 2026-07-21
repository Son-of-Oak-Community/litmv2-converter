export const MODULE_ID = "litmv2-converter";

/** The two systems this converter bridges: `source` is read from, `target` is written to. */
export const SYSTEM = { source: "mist-engine-fvtt", target: "litmv2" };

/**
 * The three official modules this converter reads. Their packaging is NOT
 * assumed here — the source reader normalizes whatever packs a module ships
 * (one embedded Adventure, or typed packs as of Core Book 1.2.0 and Hearts
 * of Ravendale 1.1.2) into one bundle. `skipPacks` names source packs
 * deliberately left unconverted.
 */
export const SOURCE_MODULES = [
	{
		id: "legend-in-the-mist-character-pack",
		label: "Legend In The Mist — Character Pack",
	},
	{
		id: "legend-in-the-mist-core-book",
		label: "Legend In The Mist — Core Book",
		// Quintessences have no litmv2 item type (maintainer decision 2026-07-21).
		skipPacks: ["litm-core-quintessences"],
	},
	{
		id: "legend-in-the-mist-hearts-of-ravendale",
		label: "Legend In The Mist — Hearts of Ravendale",
	},
];

export function detectInstalledSources() {
	return SOURCE_MODULES.filter(m => game.modules?.get(m.id)?.active);
}

/**
 * Destination layout. Each source routes documents to typed packs (browsable
 * reference / character-creation compendia). `itemPacks` sub-routes by
 * CONVERTED item type; story_theme items are wrapped into story_theme vessel
 * actors and follow the Actor route.
 */
export const ROUTES = {
	"legend-in-the-mist-character-pack": {
		packs: { Actor: "litm-character-pack" },
		itemPacks: {},
	},
	"legend-in-the-mist-core-book": {
		packs: {
			Actor: "litm-core-book-actors",
			JournalEntry: "litm-core-book-journals",
			RollTable: "litm-core-book-tables",
		},
		itemPacks: {
			themebook: "litm-core-book-themebooks",
			theme: "litm-core-book-themekits",
			vignette: "litm-core-book-items",
			addon: "litm-core-book-items",
			trope: "litm-core-book-tropes",
			action: "litm-core-book-rotes",
		},
	},
	"legend-in-the-mist-hearts-of-ravendale": {
		packs: {
			Actor: "litm-hor-actors",
			JournalEntry: "litm-hor-journals",
			Scene: "litm-hor-scenes",
		},
		itemPacks: { theme: "litm-hor-themekits", addon: "litm-hor-items", trope: "litm-hor-tropes" },
	},
};

/** Every destination pack (module.json must declare the same set — enforced by test). */
export const PACKS = [
	{ name: "litm-character-pack", docClass: "Actor" },
	{ name: "litm-core-book-actors", docClass: "Actor" },
	{ name: "litm-core-book-journals", docClass: "JournalEntry" },
	{ name: "litm-core-book-themebooks", docClass: "Item" },
	{ name: "litm-core-book-themekits", docClass: "Item" },
	{ name: "litm-core-book-items", docClass: "Item" },
	{ name: "litm-core-book-tropes", docClass: "Item" },
	{ name: "litm-core-book-tables", docClass: "RollTable" },
	{ name: "litm-core-book-rotes", docClass: "Item" },
	{ name: "litm-hor-actors", docClass: "Actor" },
	{ name: "litm-hor-journals", docClass: "JournalEntry" },
	{ name: "litm-hor-scenes", docClass: "Scene" },
	{ name: "litm-hor-themekits", docClass: "Item" },
	{ name: "litm-hor-items", docClass: "Item" },
	{ name: "litm-hor-tropes", docClass: "Item" },
];
