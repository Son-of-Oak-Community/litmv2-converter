import { describe, expect, it } from "vitest";
import { clamp, deterministicId, paragraphs, remapSystemAsset, titleCase } from "../scripts/core/util.js";

describe("titleCase", () => {
	it("normalizes ALL-CAPS names like the reference port", () => {
		expect(titleCase("ANIMATED EFFIGY")).toBe("Animated Effigy");
		expect(titleCase("IGNITE ITSELF")).toBe("Ignite Itself");
	});
	it("keeps small words lowercase mid-phrase but capitalizes the first word", () => {
		expect(titleCase("BATTLE AT THE GATES")).toBe("Battle at the Gates");
		expect(titleCase("THE WANDERER")).toBe("The Wanderer");
	});
	it("passes through mixed-case names unchanged", () => {
		expect(titleCase("Angry Locals")).toBe("Angry Locals");
		expect(titleCase("A Light Against  the Dark")).toBe("A Light Against  the Dark");
	});
	it("capitalizes after a hyphen within a token", () => {
		expect(titleCase("WORLD-CHANGING INGENUITY")).toBe("World-Changing Ingenuity");
	});
	it("capitalizes the first letter even when preceded by a quote", () => {
		expect(titleCase('PERSONAL "AURA" OR STYLE')).toBe('Personal "Aura" or Style');
	});
	it("still lowercases small words (regression)", () => {
		expect(titleCase("WALK OF LIFE")).toBe("Walk of Life");
		expect(titleCase("FOUND FAMILY OR LOCAL COMMUNITY")).toBe("Found Family or Local Community");
	});
	it("still passes through mixed-case input unchanged (regression)", () => {
		expect(titleCase("Already Cased")).toBe("Already Cased");
	});
});

describe("clamp", () => {
	it("clamps and truncates", () => {
		expect(clamp(7, 1, 5)).toBe(5);
		expect(clamp(0, 1, 5)).toBe(1);
		expect(clamp(2.9, 1, 5)).toBe(2);
		expect(clamp(undefined, 0, 5)).toBe(0);
	});
});

describe("paragraphs", () => {
	it("wraps plain parts and skips empties", () => {
		expect(paragraphs(["one", "", "two"])).toBe("<p>one</p><p>two</p>");
	});
	it("leaves parts that are already HTML alone", () => {
		expect(paragraphs(["<p>done</p>"])).toBe("<p>done</p>");
	});
	it("returns empty string for nothing", () => {
		expect(paragraphs(["", undefined])).toBe("");
	});
});

describe("remapSystemAsset", () => {
	it("remaps mist-engine system paths to the fallback", () => {
		expect(
			remapSystemAsset("systems/mist-engine-fvtt/assets/icons/icon-challenge.svg", "icons/svg/mystery-man.svg"),
		).toBe("icons/svg/mystery-man.svg");
	});
	it("keeps module asset paths", () => {
		const src = "modules/legend-in-the-mist-core-book/assets/journeys/tokens/x.webp";
		expect(remapSystemAsset(src, "icons/svg/mystery-man.svg")).toBe(src);
	});
	it("falls back on empty", () => {
		expect(remapSystemAsset(null, "icons/svg/item-bag.svg")).toBe("icons/svg/item-bag.svg");
	});
});

describe("deterministicId", () => {
	it("returns a stable 16-char Foundry-shaped id for the same seed", () => {
		const a = deterministicId("t1:power_tag:hex:0");
		expect(a).toMatch(/^[A-Za-z0-9]{16}$/);
		expect(deterministicId("t1:power_tag:hex:0")).toBe(a);
	});
	it("returns different ids for different seeds", () => {
		expect(deterministicId("a")).not.toBe(deterministicId("b"));
		expect(deterministicId("t1:power_tag:hex:0")).not.toBe(deterministicId("t1:power_tag:hex:1"));
	});
});
