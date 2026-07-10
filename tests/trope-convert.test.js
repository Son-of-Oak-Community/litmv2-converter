import { describe, expect, it } from "vitest";
import { convertTrope } from "../scripts/core/converters/trope.js";

const parsed = {
	category: "Village Folk", name: "Sweaty Smith", anchor: "sweaty-smith",
	description: "You work the bellows.",
	fixed: ["Blacksmith", "Strong as an Ox", "Hex & Curse"],
	optional: ["Curious"],
	backpack: ["sharpening stone", "goat bell"],
};

describe("convertTrope", () => {
	const resolveKitUuid = (name) =>
		name === "Blacksmith" ? "Compendium.litmv2-converter.litm-core-book-themekits.Item.aaaaaaaaaaaaaaaa" : null;
	const out = convertTrope(parsed, { resolveKitUuid });

	it("produces a trope item with a deterministic id and category/description", () => {
		expect(out.type).toBe("trope");
		expect(out._id).toMatch(/^[A-Za-z0-9]{16}$/);
		expect(out.system.category).toBe("Village Folk");
		expect(out.system.description).toBe("You work the bellows.");
	});
	it("resolves known kits to UUIDs and keeps raw names on a miss, padded to length 3", () => {
		expect(out.system.themeKits.fixed).toEqual([
			"Compendium.litmv2-converter.litm-core-book-themekits.Item.aaaaaaaaaaaaaaaa",
			"Strong as an Ox",
			"Hex & Curse",
		]);
		expect(out.system.themeKits.optional).toEqual(["Curious", "", ""]);
	});
	it("carries backpack choices verbatim", () => {
		expect(out.system.backpackChoices).toEqual(["sharpening stone", "goat bell"]);
	});
});

describe("convertTrope (id-seed includes category)", () => {
	// Two HoR trope pages (Dalish + Uncanny) merge into ONE destination pack
	// (litm-hor-tropes), and anchors are only unique per-page — two tropes
	// across those pages could share a slugified anchor/name. The id seed
	// must include `category` so cross-page collisions don't produce the
	// same `_id` (which would silently overwrite one trope on import via
	// keepId).
	const base = {
		name: "Mist-Touched", anchor: "mist-touched",
		description: "The mist changed you.",
		fixed: ["Uncanny Sense"], optional: ["Eerie"], backpack: ["strange charm"],
	};
	const a = convertTrope({ ...base, category: "Dalish Folk" }, {});
	const b = convertTrope({ ...base, category: "Uncanny Folk" }, {});

	it("produces different _id values for the same name/anchor under different categories", () => {
		expect(a._id).not.toBe(b._id);
	});
});
