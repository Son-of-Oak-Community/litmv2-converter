import { describe, expect, it } from "vitest";
import { convertJournal } from "../scripts/core/converters/journal.js";

const source = {
	_id: "jnl1jnl1jnl1jnl1",
	name: "NARRATOR TIPS",
	folder: "fldrfldrfldrfldr",
	sort: 100000,
	ownership: { default: 0, someUserId12345: 3 },
	pages: [
		{
			_id: "pg1pg1pg1pg1pg1p",
			name: "Intro",
			type: "text",
			sort: 100000,
			title: { show: false, level: 1 },
			image: {},
			text: { format: 1, content: "<p>Give them [/s hope-2] and @UUID[Actor.aaaaaaaaaaaaaaaa]{The Beast}.</p>" },
			video: { controls: true, volume: 0.5 },
			src: null,
			system: {},
			ownership: { default: -1, someUserId12345: 3 },
			flags: {},
		},
	],
	flags: {},
};

describe("convertJournal", () => {
	it("translates page content and strips per-user ownership", () => {
		const convertText = (s) => s.replaceAll("[/s hope-2]", "[hope-2]");
		const out = convertJournal(source, { convertText });
		expect(out._id).toBe("jnl1jnl1jnl1jnl1");
		expect(out.name).toBe("NARRATOR TIPS");
		expect(out.folder).toBe("fldrfldrfldrfldr");
		expect(out.ownership).toEqual({ default: 0 });
		expect(out.pages).toHaveLength(1);
		const page = out.pages[0];
		expect(page._id).toBe("pg1pg1pg1pg1pg1p");
		expect(page.text.content).toBe("<p>Give them [hope-2] and @UUID[Actor.aaaaaaaaaaaaaaaa]{The Beast}.</p>");
		expect(page.ownership).toEqual({ default: -1 });
	});
	it("opts the journal into the litmv2 rulebook sheet via flags.core.sheetClass", () => {
		const out = convertJournal(source, { convertText: (s) => s });
		expect(out.flags).toEqual({ core: { sheetClass: "litmv2.LitmJournalSheet" } });
	});
	it("carries journal categories so page category refs don't dangle (core book ≥1.2)", () => {
		const withCategories = { ...source, categories: [{ _id: "cat1cat1cat1cat1", name: "Chapters" }] };
		expect(convertJournal(withCategories, { convertText: (s) => s }).categories)
			.toEqual([{ _id: "cat1cat1cat1cat1", name: "Chapters" }]);
		expect(convertJournal(source, { convertText: (s) => s }).categories).toEqual([]);
	});
	it("passes non-text pages through untouched apart from ownership", () => {
		const img = { ...source.pages[0], _id: "pg2pg2pg2pg2pg2p", type: "image", text: { format: 1 }, src: "modules/x/img.webp" };
		const out = convertJournal({ ...source, pages: [img] });
		expect(out.pages[0].src).toBe("modules/x/img.webp");
		expect(out.pages[0].type).toBe("image");
	});
});
