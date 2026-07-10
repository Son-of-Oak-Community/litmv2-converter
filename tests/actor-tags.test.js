import { describe, expect, it } from "vitest";
import { actorTagString, tagStringEffects } from "../scripts/core/tags.js";
import { buildActorTagEffects } from "../scripts/core/effect-builders.js";

const story = { name: "flammable", value: 0, isStatus: false, burned: false, markings: [false, false, false, false, false, false] };
const status = { name: "territorial", value: 2, isStatus: true, burned: false, markings: [false, true, false, false, false, false] };

describe("buildActorTagEffects", () => {
	it("builds story_tag and status_tag effects in litmv2 shape", () => {
		expect(buildActorTagEffects([story, status])).toEqual([
			{
				name: "flammable",
				type: "story_tag",
				disabled: false,
				system: { isScratched: false, isSingleUse: false, isHidden: false, limitId: null },
			},
			{
				name: "territorial",
				type: "status_tag",
				disabled: false,
				system: { tiers: [false, true, false, false, false, false], isHidden: false, limitId: null },
			},
		]);
	});
	it("derives tiers from value when markings are empty", () => {
		const s = { ...status, markings: [false, false, false, false, false, false], value: 3 };
		expect(buildActorTagEffects([s])[0].system.tiers).toEqual([false, false, true, false, false, false]);
	});
	it("skips unnamed entries and marks burned story tags scratched", () => {
		const burned = { ...story, name: "used up", burned: true };
		const out = buildActorTagEffects([{ ...story, name: " " }, burned]);
		expect(out).toHaveLength(1);
		expect(out[0].system.isScratched).toBe(true);
	});
	it("markings win over value when both are present", () => {
		const entry = { name: "dazed", value: 3, isStatus: true, burned: false, markings: [false, true, false, false, false, false] };
		expect(buildActorTagEffects([entry])[0].system.tiers).toEqual([false, true, false, false, false, false]);
	});
	it("pads short markings array to exactly 6 entries", () => {
		const entry = { name: "slow", value: 0, isStatus: true, burned: false, markings: [true] };
		expect(buildActorTagEffects([entry])[0].system.tiers).toEqual([true, false, false, false, false, false]);
	});
});

describe("actorTagString", () => {
	it("formats stories and statuses", () => {
		expect(actorTagString([story, status])).toBe("[flammable], [territorial-2]");
	});
	it("formats tierless statuses with a trailing dash", () => {
		expect(actorTagString([{ ...status, value: 0, markings: [false, false, false, false, false, false] }])).toBe(
			"[territorial-]",
		);
	});
	it("returns empty string for no entries", () => {
		expect(actorTagString([])).toBe("");
	});
	it("markings win over value when both are present", () => {
		const entry = { name: "dazed", value: 3, isStatus: true, burned: false, markings: [false, true, false, false, false, false] };
		expect(actorTagString([entry])).toBe("[dazed-2]");
	});
});

describe("tagStringEffects", () => {
	it("parses story tags and statuses from litmv2 bracket markup", () => {
		expect(tagStringEffects("[fire and oil], [chaotic battle], [alert-2]")).toEqual([
			{ name: "fire and oil", type: "story_tag", disabled: false, system: { isScratched: false, isSingleUse: false, isHidden: false, limitId: null } },
			{ name: "chaotic battle", type: "story_tag", disabled: false, system: { isScratched: false, isSingleUse: false, isHidden: false, limitId: null } },
			{ name: "alert", type: "status_tag", disabled: false, system: { tiers: [false, true, false, false, false, false], isHidden: false, limitId: null } },
		]);
	});
	it("parses single-use story tags", () => {
		expect(tagStringEffects("[torch!]")[0]).toMatchObject({ name: "torch", system: { isSingleUse: true } });
	});
	it("produces nothing for weaknesses, limits, and empty input", () => {
		expect(tagStringEffects("[-frail], [harm:3]")).toEqual([]);
		expect(tagStringEffects("")).toEqual([]);
	});
});
