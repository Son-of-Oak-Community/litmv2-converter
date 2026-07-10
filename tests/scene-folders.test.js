import { describe, expect, it } from "vitest";
import { convertScene } from "../scripts/core/converters/scene.js";
import { splitFolders, normalizeFolder, splitItemFolders } from "../scripts/core/converters/folders.js";

describe("convertScene", () => {
	it("passes scenes through, stripping per-user ownership and _stats", () => {
		const source = {
			_id: "scn1scn1scn1scn1",
			name: "A Map",
			folder: "fldrfldrfldrfldr",
			active: true,
			ownership: { default: 0, someUser1234567: 3 },
			_stats: { systemId: "mist-engine-fvtt" },
			levels: [{ _id: "defaultLevel0000", background: { src: "modules/legend-in-the-mist-hearts-of-ravendale/assets/scenes/map.webp" } }],
			tokens: [{ _id: "tok1tok1tok1tok1", actorId: "npc1npc1npc1npc1" }],
		};
		const out = convertScene(source);
		expect(out.ownership).toEqual({ default: 0 });
		expect(out.active).toBe(false);
		expect(out._stats).toBeUndefined();
		expect(out.levels[0].background.src).toBe("modules/legend-in-the-mist-hearts-of-ravendale/assets/scenes/map.webp");
		expect(out.tokens[0].actorId).toBe("npc1npc1npc1npc1");
	});
});

describe("splitFolders", () => {
	it("groups by type, keeps hierarchy fields, drops unrequested classes", () => {
		const folders = [
			{ _id: "af1af1af1af1af1a", type: "Actor", name: "Challenges", folder: null, color: null, sorting: "a", sort: 1, description: "", flags: {}, _stats: {} },
			{ _id: "af2af2af2af2af2a", type: "Actor", name: "Beasts", folder: "af1af1af1af1af1a", color: "#112233", sorting: "a", sort: 2, description: "", flags: {} },
			{ _id: "if1if1if1if1if1i", type: "Item", name: "Kits", folder: null, color: null, sorting: "a", sort: 1, description: "", flags: {} },
			{ _id: "rf1rf1rf1rf1rf1r", type: "RollTable", name: "Oracle", folder: null, color: null, sorting: "a", sort: 1, description: "", flags: {} },
		];
		const out = splitFolders(folders, ["Actor", "Item", "JournalEntry", "Scene"]);
		expect(Object.keys(out).sort()).toEqual(["Actor", "Item"]);
		expect(out.Actor).toHaveLength(2);
		const bare = splitFolders([{ _id: "bf1bf1bf1bf1bf1b", type: "Actor", name: "Bare" }], ["Actor"]);
		expect(bare.Actor[0].description).toBe("");
		expect(bare.Actor[0].folder).toBe(null);
		expect(out.Actor[1]).toEqual({
			_id: "af2af2af2af2af2a", type: "Actor", name: "Beasts", folder: "af1af1af1af1af1a",
			color: "#112233", sorting: "a", sort: 2, description: "", flags: {},
		});
	});
});

describe("splitItemFolders", () => {
	const folders = [
		{ _id: "if0if0if0if0if0i", type: "Item", name: "All Items", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} },
		{ _id: "if1if1if1if1if1i", type: "Item", name: "Misc", folder: "if0if0if0if0if0i", color: null, sorting: "a", sort: 1, description: "", flags: {} },
		{ _id: "if2if2if2if2if2i", type: "Item", name: "Themekits", folder: "if0if0if0if0if0i", color: null, sorting: "a", sort: 2, description: "", flags: {} },
		{ _id: "af1af1af1af1af1a", type: "Actor", name: "Challenges", folder: null, color: null, sorting: "a", sort: 0, description: "", flags: {} },
	];

	it("assigns each folder chain to the packs that received its documents, replicating shared ancestors", () => {
		const out = splitItemFolders(folders, [
			{ folder: "if2if2if2if2if2i", pack: "litm-core-book-themekits" },
			{ folder: "if1if1if1if1if1i", pack: "litm-core-book-items" },
		]);
		expect(out["litm-core-book-themekits"].map((f) => f._id)).toEqual(["if0if0if0if0if0i", "if2if2if2if2if2i"]);
		expect(out["litm-core-book-items"].map((f) => f._id)).toEqual(["if0if0if0if0if0i", "if1if1if1if1if1i"]);
	});

	it("ignores refs to unknown/absent folders and non-Item folders", () => {
		const out = splitItemFolders(folders, [
			{ folder: null, pack: "litm-hor-items" },
			{ folder: "af1af1af1af1af1a", pack: "litm-hor-items" },
		]);
		expect(out).toEqual({});
	});

	it("preserves source array order so parents precede children", () => {
		const out = splitItemFolders(folders, [{ folder: "if2if2if2if2if2i", pack: "p" }]);
		expect(out.p.map((f) => f.name)).toEqual(["All Items", "Themekits"]);
	});
});

describe("normalizeFolder", () => {
	it("defaults non-nullable fields", () => {
		expect(normalizeFolder({ _id: "bf1bf1bf1bf1bf1b", type: "Actor", name: "Bare" })).toEqual({
			_id: "bf1bf1bf1bf1bf1b", type: "Actor", name: "Bare", folder: null,
			color: null, sorting: null, sort: 0, description: "", flags: {},
		});
	});
});
