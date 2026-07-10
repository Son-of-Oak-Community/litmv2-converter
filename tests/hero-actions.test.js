import { describe, expect, it, vi } from "vitest";
import { extractExampleActions } from "../scripts/core/converters/hero-actions.js";
import { deterministicId } from "../scripts/core/util.js";

const CELL_1 =
	'<p class="black-strong">Cast a hex</p>' +
	'<p><mark class="tag">Magic</mark></p><p>+</p>' +
	'<p><mark class="tag">hex</mark></p><p>+</p>' +
	'<p><mark class="tag">Wand</mark></p>' +
	'<p><mark class="tag power">POWER 3</mark></p>' +
	'<p>Give <mark class="tag green">dazzled</mark> or <mark class="tag green">wounded</mark></p>';
const CELL_2 =
	'<p class="black-strong">Ward off evil</p>' +
	'<p><mark class="tag">Magic</mark></p><p>+</p>' +
	'<p><mark class="tag">Unknown Tag</mark></p>' +
	'<p><mark class="tag power">POWER 2</mark></p>' +
	'<p>Quick Outcome</p><p>Lessen <mark class="tag green">scared</mark></p>';
const TABLE =
	'<h3 class="with-line">Example Actions</h3><p></p>' +
	`<table class="example-actions-table"><tbody><tr><td>${CELL_1}</td><td>${CELL_2}</td></tr></tbody></table>`;
const BLURB = "<p>“I am a magician.”</p>";

const items = [
	{ _id: "t1", type: "theme", name: "Magic", effects: [
		{ _id: "EffHex0000000000", name: "hex", type: "power_tag" },
		{ _id: "EffTitle00000000", name: "Magic", type: "power_tag" },
	] },
	{ _id: "bp1", type: "backpack", name: "Backpack", effects: [
		{ _id: "EffWand000000000", name: "Wand", type: "story_tag" },
	] },
];

describe("extractExampleActions", () => {
	it("returns input untouched when there is no example-actions table", () => {
		const out = extractExampleActions(BLURB, { heroId: "h1", items });
		expect(out).toEqual({ description: BLURB, actions: [] });
	});

	it("builds one action per cell and blockquotes the remaining blurb", () => {
		const out = extractExampleActions(BLURB + TABLE, { heroId: "h1", items, log: () => {} });
		expect(out.description).toBe(`<blockquote>${BLURB}</blockquote>`);
		expect(out.actions.map((a) => [a.type, a.name])).toEqual([
			["action", "Cast a hex"],
			["action", "Ward off evil"],
		]);
		expect(out.actions[0]._id).toBe(deterministicId("h1:action:0:Cast a hex"));
		expect(out.actions[0].effects).toEqual([]);
		expect(out.actions[0].img).toBeUndefined();
	});

	it("resolves tag suggestions by effect name, case-insensitively, null for misses", () => {
		const out = extractExampleActions(TABLE, { heroId: "h1", items, log: () => {} });
		expect(out.actions[0].system.power.positiveTags).toEqual([
			{ label: "Magic", tagId: "EffTitle00000000" },
			{ label: "hex", tagId: "EffHex0000000000" },
			{ label: "Wand", tagId: "EffWand000000000" },
		]);
		expect(out.actions[1].system.power.positiveTags[1]).toEqual({ label: "Unknown Tag", tagId: null });
		expect(out.actions[0].system.power.negativeTags).toEqual([]);
	});

	it("builds one success per outcome line with tokenized statuses and mapped verbs", () => {
		const out = extractExampleActions(TABLE, { heroId: "h1", items, log: () => {} });
		expect(out.actions[0].system.successes).toEqual([
			{ id: deterministicId("h1:action:0:success:0"), verb: "attack", text: "Give [dazzled-] or [wounded-]" },
		]);
		expect(out.actions[1].system.successes.map((s) => [s.verb, s.text])).toEqual([
			["quick", "Quick Outcome"],
			["lessen", "Lessen [scared-]"],
		]);
	});

	it("leaves the action description empty — tags, power, and outcomes live in structured fields, not prose", () => {
		const out = extractExampleActions(TABLE, { heroId: "h1", items, log: () => {} });
		expect(out.actions[0].system.description).toBe("");
		expect(out.actions[1].system.description).toBe("");
	});

	it("warns on a power-badge/tag-count mismatch but still converts", () => {
		const bad = TABLE.replace("POWER 3", "POWER 5"); // CELL_1 has 3 tags
		const log = vi.fn();
		const out = extractExampleActions(bad, { heroId: "h1", items, log });
		expect(out.actions).toHaveLength(2);
		expect(log.mock.calls.flat().join("\n")).toContain("badge POWER 5");
	});

	it("does not warn about matching badges", () => {
		const log = vi.fn();
		extractExampleActions(TABLE, { heroId: "h1", items, log });
		// (the "Unknown Tag" suggestion miss still logs — assert only on badge warns)
		expect(log.mock.calls.flat().join("\n")).not.toContain("badge POWER");
	});

	it("logs and defaults to enhance for an outcome with no verb mapping, but still converts", () => {
		const unknownOutcome = TABLE.replace(
			'<p>Give <mark class="tag green">dazzled</mark> or <mark class="tag green">wounded</mark></p>',
			"<p>Zorble the widgets</p>",
		);
		const log = vi.fn();
		const out = extractExampleActions(unknownOutcome, { heroId: "h1", items, log });
		expect(out.actions[0].system.successes).toEqual([
			{ id: deterministicId("h1:action:0:success:0"), verb: "enhance", text: "Zorble the widgets" },
		]);
		expect(log.mock.calls.flat().join("\n")).toContain("no verb mapping");
	});

	it("does not log a verb-mapping warning for outcomes with known verbs", () => {
		const log = vi.fn();
		extractExampleActions(TABLE, { heroId: "h1", items, log });
		expect(log.mock.calls.flat().join("\n")).not.toContain("no verb mapping");
	});

	it("leaves the whole table in place when any cell fails to parse (all-or-nothing)", () => {
		const broken = TABLE.replace('<p class="black-strong">Cast a hex</p>', "");
		const log = vi.fn();
		const out = extractExampleActions(BLURB + broken, { heroId: "h1", items, log });
		expect(out.actions).toEqual([]);
		expect(out.description).toBe(BLURB + broken);
		expect(out.description).not.toContain("<blockquote>");
		expect(log).toHaveBeenCalled();
	});

	it("tolerates irregular power badges (POWER 3 OR 4, POWER32) without warning", () => {
		const irregular = TABLE.replace("POWER 3", "POWER 3 OR 4");
		const log = vi.fn();
		const out = extractExampleActions(irregular, { heroId: "h1", items, log });
		expect(out.actions).toHaveLength(2);
		expect(log.mock.calls.flat().join("\n")).not.toContain("badge POWER");

		const glued = TABLE.replace("POWER 3", "POWER32");
		const log2 = vi.fn();
		const out2 = extractExampleActions(glued, { heroId: "h1", items, log: log2 });
		expect(out2.actions).toHaveLength(2);
		expect(log2.mock.calls.flat().join("\n")).not.toContain("badge POWER");
	});

	it("matches tag labels against effect names with collapsed whitespace", () => {
		const wsItems = [
			{ _id: "t9", type: "theme", name: "Magic", effects: [
				{ _id: "EffProj000000000", name: "Art of  Projection", type: "power_tag" },
			] },
		];
		const table =
			'<h3 class="with-line">Example Actions</h3>' +
			'<table class="example-actions-table"><tbody><tr><td>' +
			'<p class="black-strong">Project force</p>' +
			'<p><mark class="tag">Art of Projection</mark></p>' +
			'<p><mark class="tag power">POWER 1</mark></p>' +
			"<p>Quick Outcome</p>" +
			"</td></tr></tbody></table>";
		const out = extractExampleActions(table, { heroId: "h1", items: wsItems, log: () => {} });
		expect(out.actions[0].system.power.positiveTags).toEqual([
			{ label: "Art of Projection", tagId: "EffProj000000000" },
		]);
	});

	it("leaves the table in place and logs when the table has no <td> cells", () => {
		const noCells = TABLE.replace(
			`<table class="example-actions-table"><tbody><tr><td>${CELL_1}</td><td>${CELL_2}</td></tr></tbody></table>`,
			`<table class="example-actions-table"><tbody><tr><td class="x">${CELL_1}</td><td class="x">${CELL_2}</td></tr></tbody></table>`,
		);
		const log = vi.fn();
		const out = extractExampleActions(BLURB + noCells, { heroId: "h1", items, log });
		expect(out).toEqual({ description: BLURB + noCells, actions: [] });
		expect(log).toHaveBeenCalled();
	});
});
