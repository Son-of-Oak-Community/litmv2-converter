import { describe, expect, it } from "vitest";
import { bucketSourceDocs } from "../scripts/core/source-reader.js";

describe("bucketSourceDocs", () => {
	it("unwraps an Adventure pack and hoists its metadata (char-pack/HoR shape)", () => {
		const adv = {
			_id: "ADVADVADVADVADVA", name: "The Dale", img: "a.webp", caption: "", description: "<p>d</p>", sort: 7,
			actors: [{ _id: "A1" }], items: [{ _id: "I1" }], journal: [{ _id: "J1" }],
			scenes: [{ _id: "S1" }], folders: [{ _id: "F1", type: "Actor" }],
		};
		const b = bucketSourceDocs([{ type: "Adventure", docs: [adv], folders: [] }]);
		expect(b.hasAdventure).toBe(true);
		expect(b.name).toBe("The Dale");
		expect(b._id).toBe("ADVADVADVADVADVA");
		expect(b.description).toBe("<p>d</p>");
		expect(b.sort).toBe(7);
		expect(b.actors).toEqual([{ _id: "A1" }]);
		expect(b.items).toEqual([{ _id: "I1" }]);
		expect(b.journal).toEqual([{ _id: "J1" }]);
		expect(b.scenes).toEqual([{ _id: "S1" }]);
		expect(b.tables).toEqual([]);
		expect(b.folders).toEqual([{ _id: "F1", type: "Actor" }]);
	});

	it("buckets typed packs and merges per-pack folders (core-book v1.2 shape)", () => {
		const b = bucketSourceDocs([
			{ type: "Actor", docs: [{ _id: "A1" }], folders: [{ _id: "FA", type: "Actor" }] },
			{ type: "Item", docs: [{ _id: "I1" }], folders: [] },
			{ type: "Item", docs: [{ _id: "I2" }], folders: [{ _id: "FI", type: "Item" }] },
			{ type: "JournalEntry", docs: [{ _id: "J1" }], folders: [] },
			{ type: "RollTable", docs: [{ _id: "T1" }], folders: [{ _id: "FT", type: "RollTable" }] },
		]);
		expect(b.hasAdventure).toBe(false);
		expect(b.actors.map((a) => a._id)).toEqual(["A1"]);
		expect(b.items.map((i) => i._id)).toEqual(["I1", "I2"]);
		expect(b.journal.map((j) => j._id)).toEqual(["J1"]);
		expect(b.tables.map((t) => t._id)).toEqual(["T1"]);
		expect(b.folders.map((f) => f._id)).toEqual(["FA", "FI", "FT"]);
	});

	it("throws on a pack type it cannot route (parity: fail loud)", () => {
		expect(() => bucketSourceDocs([{ type: "Macro", docs: [], folders: [] }]))
			.toThrow(/Macro/);
	});

	it("throws on multiple Adventure documents (metadata hoisting is single-adventure)", () => {
		const adv = (id) => ({ _id: id, name: id, actors: [], items: [], journal: [], scenes: [], folders: [] });
		expect(() => bucketSourceDocs([{ type: "Adventure", docs: [adv("A1"), adv("A2")], folders: [] }]))
			.toThrow(/Multiple Adventure/);
		expect(() => bucketSourceDocs([
			{ type: "Adventure", docs: [adv("A1")], folders: [] },
			{ type: "Adventure", docs: [adv("A2")], folders: [] },
		])).toThrow(/Multiple Adventure/);
	});
});
