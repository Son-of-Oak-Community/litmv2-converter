import { describe, expect, it } from "vitest";
import { normalizeKitName, THEMEKIT_INDEX } from "../scripts/core/data/themekit-index.js";

describe("themekit index", () => {
	it("has one entry per non-folder-derivable kit (slimmed: Core Variable/* + all HoR)", () => {
		expect(Object.keys(THEMEKIT_INDEX).length).toBe(175);
	});
	it("resolves known non-folder-derivable kits with printed tier and themebook", () => {
		expect(THEMEKIT_INDEX[normalizeKitName("Acute Nose")]).toEqual({
			level: "origin",
			themebook: "Trait",
		});
	});
	it("omits folder-derivable kits (their tier now comes from kitHints at runtime)", () => {
		expect(THEMEKIT_INDEX[normalizeKitName("A Light Against  the Dark")]).toBeUndefined();
	});
	it("only contains valid levels", () => {
		const levels = new Set(Object.values(THEMEKIT_INDEX).map((e) => e.level));
		expect([...levels].sort()).toEqual(["adventure", "greatness", "origin"]);
	});
});
