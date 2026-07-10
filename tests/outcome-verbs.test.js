import { describe, expect, it } from "vitest";
import { outcomeVerb, resolveOutcomeVerb } from "../scripts/core/data/outcome-verbs.js";

// Leading-word mapping — covers every leading word in the corpus incl. the
// "Quick Ouctome" source typo (typo is in the SECOND word, so "quick" still leads).
const LEADING_CASES = [
	["Lessen [wounded-]", "lessen"],
	["Lessen the Consequences", "lessen"],
	["Discover new details", "discover"],
	["Discover, or lessen [wounded-]", "discover"],
	["Quick Outcome", "quick"],
	["Quick outcome", "quick"],
	["Quick Ouctome", "quick"],
	["Quick Outcome or lessen [wounded-] (if allowed)", "quick"],
	["Create ingredient tags", "create"],
	["Create \"gift\" tag or give [convinced-]", "create"],
	["Advance find", "advance"],
	["Advance find or catch", "advance"],
	["Remove emotional status, gain focused", "restore"],
	["Remove [despaired-] or gain [invigorated-]", "restore"],
	["Gain heavy-purse or stolen item tags", "enhance"],
	["Totally unknown phrasing", "enhance"],
];

// Give-lines resolve via the first mapped status. Covers every status that
// appears after "Give" in the corpus.
const GIVE_CASES = [
	// harm → attack
	["wounded", "attack"], ["terrified", "attack"], ["paralyzed", "attack"],
	["broken", "attack"], ["stunned", "attack"], ["sticky", "attack"],
	["weak spot", "attack"], ["hobbled", "attack"], ["wet", "attack"],
	["cold", "attack"], ["bolt-stricken", "attack"], ["restrained", "attack"],
	["prone", "attack"], ["tangled", "attack"], ["threatened", "attack"],
	["banished", "attack"], ["laid-to-rest", "attack"],
	// social → influence
	["friendly", "influence"], ["convinced", "influence"], ["happy", "influence"],
	["intoxicated", "influence"], ["inspired", "influence"], ["compliant", "influence"],
	["charmed", "influence"], ["amused", "influence"], ["distracted", "influence"],
	["disheartened", "influence"],
	// buffs → enhance
	["shielded", "enhance"], ["warded", "enhance"], ["heartened", "enhance"],
	["encouraged", "enhance"], ["confident", "enhance"],
];

describe("outcomeVerb", () => {
	it.each(LEADING_CASES)("maps %j → %s", (text, verb) => {
		expect(outcomeVerb(text, [])).toBe(verb);
	});
	it.each(GIVE_CASES)("maps Give %s → %s", (status, verb) => {
		expect(outcomeVerb(`Give [${status}-]`, [status])).toBe(verb);
	});
	it("uses the first MAPPED status on mixed Give lines", () => {
		expect(outcomeVerb("Give [terrified-], [paralyzed-] or [wounded-]", ["terrified", "paralyzed", "wounded"])).toBe("attack");
		expect(outcomeVerb("Give [mystery-status-] or [friendly-]", ["mystery-status", "friendly"])).toBe("influence");
	});
	it("is case-insensitive and falls back to enhance for unmapped Give statuses", () => {
		expect(outcomeVerb("give [WOUNDED-]", ["WOUNDED"])).toBe("attack");
		expect(outcomeVerb("Give [some-new-status-]", ["some-new-status"])).toBe("enhance");
	});
});

describe("resolveOutcomeVerb", () => {
	it("reports matched: false for a totally unknown leading word", () => {
		expect(resolveOutcomeVerb("Totally unknown phrasing", [])).toEqual({ verb: "enhance", matched: false });
	});
	it("reports matched: false for a Give line whose status isn't in GIVE_STATUS_VERBS", () => {
		expect(resolveOutcomeVerb("Give [some-new-status-]", ["some-new-status"])).toEqual({
			verb: "enhance",
			matched: false,
		});
	});
	it("reports matched: true for a legitimate table hit that resolves to enhance (gain)", () => {
		expect(resolveOutcomeVerb("Gain heavy-purse or stolen item tags", [])).toEqual({
			verb: "enhance",
			matched: true,
		});
	});
	it("reports matched: true for an ordinary leading-word hit", () => {
		expect(resolveOutcomeVerb("Lessen [wounded-]", [])).toEqual({ verb: "lessen", matched: true });
	});
});
