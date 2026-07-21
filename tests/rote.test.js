import { describe, expect, it } from "vitest";
import { convertRote } from "../scripts/core/converters/rote.js";
import { STRONG_VERBS } from "../scripts/core/data/outcome-verbs.js";

// Synthetic fixture mirroring the corpus grammar (no rulebook prose).
const source = {
	_id: "ROTE000000000001",
	name: "Test the winds for omens.",
	type: "rote",
	img: "icons/svg/daze.svg",
	folder: null,
	system: {
		description: "<p>You read the sky.</p>",
		practitioners: "weather-witches, sailors",
		actionType: "detailed",
		powertags: [{ name: "keen eyes" }, { name: "" }, { name: "a weathervane" }],
		weaknesstags: [{ name: "fog" }],
		success: "<p><strong>DISCOVER</strong> what the weather will do.</p>" +
			'<p><strong>ENHANCE</strong> your <mark class="tag green">prepared</mark> stance.</p>' +
			"<p><strong>EXTRA FEATS</strong></p><ul><li><p>Do it quickly.</p></li><li><p>Warn an ally too.</p></li></ul>",
		consequences: '<ul><li><p><i class="skull-icon"></i> The omens mislead you.</p></li>' +
			'<li><p><i class="skull-icon"></i> You gain <mark class="tag green">distracted</mark>.</p></li></ul>',
		selected: false,
	},
};

describe("convertRote", () => {
	const out = convertRote(source, {});

	it("produces a litmv2 rote-category action with preserved id and tag suggestions", () => {
		expect(out.type).toBe("action");
		expect(out._id).toBe("ROTE000000000001");
		expect(out.system.category).toBe("rote");
		expect(out.system.practitioners).toBe("weather-witches, sailors");
		expect(out.system.power.positiveTags).toEqual([
			{ label: "keen eyes", tagId: null },
			{ label: "a weathervane", tagId: null },
		]);
		expect(out.system.power.negativeTags).toEqual([{ label: "fog", tagId: null }]);
	});

	it("parses successes with explicit verbs and token-converted text", () => {
		expect(out.system.successes.map((s) => s.verb)).toEqual(["discover", "enhance"]);
		expect(out.system.successes[0].text).toBe("what the weather will do.");
		expect(out.system.successes[1].text).toBe("your [prepared-] stance.");
		expect(out.system.successes.every((s) => /^[A-Za-z0-9]{16}$/.test(s.id))).toBe(true);
	});

	it("splits extra feats out and cleans consequences", () => {
		expect(out.system.extraFeats).toEqual(["Do it quickly.", "Warn an ally too."]);
		expect(out.system.consequences).toEqual(["The omens mislead you.", "You gain [distracted-]."]);
	});

	it("maps every observed source verb", () => {
		for (const v of ["create", "discover", "enhance", "weaken", "influence", "advance", "restore", "attack", "disrupt", "quick"])
			expect(STRONG_VERBS[v]).toBeTruthy();
		expect(STRONG_VERBS["set back"]).toBe("setBack");
	});

	it("tolerates attributes on list items", () => {
		const attrs = {
			...source,
			system: {
				...source.system,
				success: '<p><strong>CREATE</strong> a thing.</p><p><strong>EXTRA FEATS</strong></p><ul><li class="fancy"><p>Feat one.</p></li></ul>',
				consequences: '<ul><li data-x="1"><p>Bad thing.</p></li></ul>',
			},
		};
		const converted = convertRote(attrs, {});
		expect(converted.system.extraFeats).toEqual(["Feat one."]);
		expect(converted.system.consequences).toEqual(["Bad thing."]);
	});

	it("fails loud when a non-empty success block parses to nothing (source structure changed)", () => {
		const drifted = { ...source, system: { ...source.system, success: "<p>No verb header prose here.</p>" } };
		expect(() => convertRote(drifted, {})).toThrow(/no verb-headed paragraphs/);
	});

	it("fails loud when the EXTRA FEATS header has no parseable list", () => {
		const drifted = { ...source, system: { ...source.system, success: "<p><strong>CREATE</strong> x.</p><p><strong>EXTRA FEATS</strong></p><div>not a list</div>" } };
		expect(() => convertRote(drifted, {})).toThrow(/EXTRA FEATS header present/);
	});

	it("fails loud when non-empty consequences parse to nothing", () => {
		const drifted = { ...source, system: { ...source.system, consequences: "<p>Prose, not a list.</p>" } };
		expect(() => convertRote(drifted, {})).toThrow(/consequences present/);
	});

	it("still converts a rote with genuinely empty success/consequences", () => {
		const empty = { ...source, system: { ...source.system, success: "", consequences: "" } };
		const converted = convertRote(empty, {});
		expect(converted.system.successes).toEqual([]);
		expect(converted.system.consequences).toEqual([]);
	});
});
