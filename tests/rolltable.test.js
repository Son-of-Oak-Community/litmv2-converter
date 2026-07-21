import { describe, expect, it } from "vitest";
import { convertRollTable } from "../scripts/core/converters/rolltable.js";

const ctx = {
	convertText: (s) => (s ?? "").replace('<mark class="tag">brave</mark>', "[brave]"),
	convertUuid: (u) => u.replace("legend-in-the-mist-core-book.litm-core-rolltables", "litmv2-converter.litm-core-book-tables"),
};

const source = {
	_id: "TBL0000000000001",
	name: "Oracle: Test Omens",
	img: "icons/svg/d20-grey.svg",
	description: "<p>Roll <strong>d6</strong>.</p>",
	formula: "1d6",
	replacement: true,
	displayRoll: true,
	folder: "FLD0000000000001",
	sort: 100,
	ownership: { default: 0 },
	flags: { "some-module": { x: 1 } },
	_stats: { systemId: "mist-engine-fvtt" },
	results: [
		{
			_id: "RES0000000000001", type: "text", name: "", weight: 1, range: [1, 3], drawn: true,
			description: 'A <mark class="tag">brave</mark> omen', flags: {}, _stats: {},
		},
		{
			_id: "RES0000000000002", type: "document", name: "Other Table", weight: 1, range: [4, 6], drawn: false,
			description: "", documentUuid: "Compendium.legend-in-the-mist-core-book.litm-core-rolltables.RollTable.TBL0000000000002",
		},
	],
};

describe("convertRollTable", () => {
	it("keeps table mechanics, converts text, and strips source-world noise", () => {
		const out = convertRollTable(source, ctx);
		expect(out._id).toBe("TBL0000000000001");
		expect(out.formula).toBe("1d6");
		expect(out.folder).toBe("FLD0000000000001");
		expect(out.flags).toBeUndefined();
		expect(out._stats).toBeUndefined();
		expect(out.ownership).toBeUndefined();
		expect(out.results[0].description).toBe("A [brave] omen");
		expect(out.results[0].drawn).toBe(false);
		expect(out.results[0].range).toEqual([1, 3]);
	});

	it("rewrites document results' UUIDs and omits documentUuid on text results", () => {
		const out = convertRollTable(source, ctx);
		expect(out.results[1].documentUuid)
			.toBe("Compendium.litmv2-converter.litm-core-book-tables.RollTable.TBL0000000000002");
		expect(out.results[0].documentUuid).toBeUndefined();
	});

	it("remaps source-system icons and defaults missing mechanics", () => {
		const out = convertRollTable({
			_id: "TBL0000000000003", name: "Bare", img: "systems/mist-engine-fvtt/assets/icons/x.svg",
		}, ctx);
		expect(out.img).toBe("icons/svg/d20-grey.svg");
		expect(out.replacement).toBe(true);
		expect(out.displayRoll).toBe(true);
		expect(out.results).toEqual([]);
	});
});
