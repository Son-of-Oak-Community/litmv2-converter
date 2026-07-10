export const MODULE_ID = "litmv2-converter";

/** The two systems this converter bridges: `source` is read from, `target` is written to. */
export const SYSTEM = { source: "mist-engine-fvtt", target: "litmv2" };

export const SOURCE_MODULES = [
	{
		id: "legend-in-the-mist-character-pack",
		packId: "legend-in-the-mist-character-pack.character-pack-adventure",
		label: "Legend In The Mist — Character Pack",
	},
	{
		id: "legend-in-the-mist-core-book",
		packId: "legend-in-the-mist-core-book.litm-core-adventure",
		label: "Legend In The Mist — Core Book",
	},
	{
		id: "legend-in-the-mist-hearts-of-ravendale",
		packId: "legend-in-the-mist-hearts-of-ravendale.hor-dale-adventure",
		label: "Legend In The Mist — Hearts of Ravendale",
	},
];

export function detectInstalledSources() {
	return SOURCE_MODULES.filter(m => game.modules?.get(m.id)?.active);
}

/**
 * Destination layout. Each source routes documents either to typed packs
 * (browsable reference / character-creation compendia) or into one Adventure
 * document. `itemPacks` sub-routes by CONVERTED item type; story_theme items
 * are wrapped into story_theme vessel actors and follow the Actor route.
 */
export const ROUTES = {
	"legend-in-the-mist-character-pack": {
		packs: { Actor: "litm-character-pack" },
		itemPacks: {},
	},
	"legend-in-the-mist-core-book": {
		packs: { Actor: "litm-core-book-actors", JournalEntry: "litm-core-book-journals" },
		itemPacks: {
			themebook: "litm-core-book-themebooks",
			theme: "litm-core-book-themekits",
			vignette: "litm-core-book-items",
			addon: "litm-core-book-items",
			trope: "litm-core-book-tropes",
		},
	},
	"legend-in-the-mist-hearts-of-ravendale": {
		adventure: "litm-hor-the-dales",
		packs: {},
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
	{ name: "litm-hor-the-dales", docClass: "Adventure" },
	{ name: "litm-hor-themekits", docClass: "Item" },
	{ name: "litm-hor-items", docClass: "Item" },
	{ name: "litm-hor-tropes", docClass: "Item" },
];
