import { describe, expect, it } from "vitest";
import { convertBackpack } from "../scripts/core/converters/backpack.js";

const source = {
	_id: "bp1",
	name: "Backpack",
	type: "backpack",
	img: "icons/svg/chest.svg",
	system: {
		items: [
			{ name: "Steel sword" },
			{ name: "Ring of Vanishing" },
			{ name: "" },
		],
	},
};

describe("convertBackpack", () => {
	it("produces a backpack with one story_tag effect per named item", () => {
		const bp = convertBackpack(source);
		expect(bp.type).toBe("backpack");
		expect(bp._id).toBe("bp1");
		expect(bp.effects).toHaveLength(2);
		expect(bp.effects.every((e) => e.type === "story_tag")).toBe(true);
		expect(bp.effects.map((e) => e.name)).toEqual([
			"Steel sword",
			"Ring of Vanishing",
		]);
	});

	it("activates only the first backpack tag", () => {
		const bp = convertBackpack(source);
		expect(bp.effects.map((e) => e.disabled)).toEqual([false, true]);
	});

	it("has an empty system object (backpack has no scalar fields)", () => {
		expect(convertBackpack(source).system).toEqual({});
	});
});
