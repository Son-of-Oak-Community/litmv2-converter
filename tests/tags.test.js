// tests/content-import-tags.test.js
import { describe, expect, it } from "vitest";
import {
	backpackTagEffectData,
	themeTagEffectData,
} from "../scripts/core/tags.js";
import { deterministicId } from "../scripts/core/util.js";

describe("themeTagEffectData", () => {
	it("builds power_tag + weakness_tag + title tag, dropping empty names", () => {
		const effects = themeTagEffectData({
			powerTags: [{ name: "full quiver" }, { name: "" }],
			weaknessTags: [{ name: "requires strength" }],
			titleTagName: "A Good Longbow",
		});
		const byType = (t) => effects.filter((e) => e.type === t);
		expect(byType("power_tag").length).toBe(2); // "full quiver" + title tag
		expect(byType("weakness_tag").length).toBe(1);
		const title = effects.find((e) => e.system?.isTitleTag);
		expect(title).toBeTruthy();
		expect(title.name).toBe("A Good Longbow");
		expect(title.type).toBe("power_tag");
		expect(effects.some((e) => e.name === "")).toBe(false);
	});

	it("marks named tags active (not disabled)", () => {
		const [tag] = themeTagEffectData({
			powerTags: [{ name: "long range" }],
			weaknessTags: [],
			titleTagName: "Bow",
		});
		expect(tag.disabled).toBe(false);
	});

	it("imports a planned tag as inactive (disabled)", () => {
		const [tag] = themeTagEffectData({
			powerTags: [{ name: "future power", planned: true }],
			weaknessTags: [],
			titleTagName: "Theme",
		});
		expect(tag.name).toBe("future power");
		expect(tag.disabled).toBe(true);
	});

	it("uses fellowship_tag when isFellowship", () => {
		const effects = themeTagEffectData({
			powerTags: [{ name: "loyal" }],
			weaknessTags: [],
			isFellowship: true,
			titleTagName: "The Band",
		});
		expect(effects.every((e) => e.type !== "power_tag")).toBe(true);
		expect(effects.some((e) => e.type === "fellowship_tag")).toBe(true);
	});
});

describe("backpackTagEffectData", () => {
	it("builds story_tag effects from backpack items", () => {
		const effects = backpackTagEffectData([
			{ name: "Steel sword" },
			{ name: "Ring of Vanishing", burned: true },
		]);
		expect(effects).toHaveLength(2);
		expect(effects.every((e) => e.type === "story_tag")).toBe(true);
		expect(effects[1].system.isScratched).toBe(true);
	});

	it("drops empty-named backpack items", () => {
		expect(backpackTagEffectData([{ name: "" }, { name: "x" }])).toHaveLength(1);
	});

	it("activates only the first named item; the rest are disabled", () => {
		const effects = backpackTagEffectData([
			{ name: "Steel sword" },
			{ name: "Ring of Vanishing" },
			{ name: "Potent Spirit" },
		]);
		expect(effects.map((e) => e.disabled)).toEqual([false, true, true]);
	});

	it("counts the first NAMED item as first (empties don't consume the active slot)", () => {
		const effects = backpackTagEffectData([{ name: "" }, { name: "Wand" }, { name: "Rope" }]);
		expect(effects.map((e) => [e.name, e.disabled])).toEqual([
			["Wand", false],
			["Rope", true],
		]);
	});
});

describe("effect idSeed", () => {
	it("assigns deterministic _ids to theme tag effects when idSeed is given", () => {
		const effects = themeTagEffectData({
			powerTags: [{ name: "hex" }],
			weaknessTags: [{ name: "hubris" }],
			titleTagName: "Magic",
			idSeed: "t1",
		});
		expect(effects.map((e) => e._id)).toEqual([
			deterministicId("t1:power_tag:hex:0"),
			deterministicId("t1:weakness_tag:hubris:1"),
			deterministicId("t1:power_tag:Magic:2"),
		]);
	});
	it("assigns deterministic _ids to backpack effects when idSeed is given", () => {
		const [e] = backpackTagEffectData([{ name: "Wand" }], "bp1");
		expect(e._id).toBe(deterministicId("bp1:story_tag:Wand:0"));
	});
	it("emits no _id without an idSeed", () => {
		const [e] = themeTagEffectData({ powerTags: [{ name: "hex" }], weaknessTags: [], titleTagName: "" });
		expect(e).not.toHaveProperty("_id");
	});
});
