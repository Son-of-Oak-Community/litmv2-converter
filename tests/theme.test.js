import { describe, expect, it } from "vitest";
import { convertEmbeddedTheme } from "../scripts/core/converters/theme.js";
import { resolveThemeLevel } from "../scripts/core/theme-levels.js";

// Synthetic fixture in the INDEXED shape (as embedded on characters),
// including empty trailing slots that must be dropped.
const indexedTheme = {
	_id: "themeMagic0",
	name: "Magic",
	type: "themebook",
	img: "icons/svg/item-bag.svg",
	system: {
		description: "Channel the [/s arcane-2] arts.",
		story: "A [/b brave] wanderer.",
		quest: "Never stop learning.",
		improve: 1,
		abandon: 0,
		milestone: 2,
		type: "litm-origin",
		powertag1: { name: "Art of Projection", question: "" },
		powertag2: { name: "Emanate aegis", question: "" },
		powertag3: { name: "", question: "" },
		powertag4: { name: "Planned Power", planned: true },
		weaknesstag1: { name: "hubris", question: "" },
		weaknesstag2: { name: "", question: "" },
		specialImprovements: [
			{ name: "Overchannel", description: "[/s parrying-2]", active: true },
			{ name: "", description: "", active: false },
		],
	},
};

describe("convertEmbeddedTheme", () => {
	it("produces a theme item with title tag + power/weakness effects", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.type).toBe("theme");
		expect(theme._id).toBe("themeMagic0");
		// The first named power tag ("Art of Projection") is the theme TITLE;
		// "Magic" (the source item name) is the themebook/category.
		expect(theme.name).toBe("Art of Projection");
		expect(theme.system.themebook).toBe("Magic");
		const power = theme.effects.filter((e) => e.type === "power_tag");
		// 1 remaining active power tag + 1 planned power tag + 1 title tag
		// ("Art of Projection" is promoted to the title, not a body power tag)
		expect(power).toHaveLength(3);
		expect(theme.effects.filter((e) => e.type === "weakness_tag")).toHaveLength(1);
		const title = theme.effects.find((e) => e.system?.isTitleTag);
		expect(title.name).toBe("Art of Projection");
		// the promoted title is not duplicated among the body power tags
		expect(theme.effects.filter((e) => e.name === "Art of Projection")).toHaveLength(1);
		const planned = theme.effects.find((e) => e.name === "Planned Power");
		expect(planned.disabled).toBe(true);
		const active = theme.effects.find((e) => e.name === "Emanate aegis");
		expect(active.disabled).toBe(false);
	});

	it("falls back to source.name for title/themebook when there are no named power tags", () => {
		const theme = convertEmbeddedTheme({
			_id: "themeNoTags0",
			name: "Empty Theme",
			type: "themebook",
			system: {
				powertag1: { name: "" },
				powertag2: { name: "  " },
				weaknesstag1: { name: "hubris" },
			},
		});
		expect(theme.name).toBe("Empty Theme");
		expect(theme.system.themebook).toBe("Empty Theme");
		const title = theme.effects.find((e) => e.system?.isTitleTag);
		expect(title.name).toBe("Empty Theme");
		expect(theme.effects.filter((e) => e.type === "power_tag")).toHaveLength(1);
	});

	it("skips blank-named power tags when picking the title", () => {
		const theme = convertEmbeddedTheme({
			_id: "themeBlank0",
			name: "Magic",
			type: "themebook",
			system: {
				powertag1: { name: " " },
				powertag2: { name: "Real Title" },
			},
		});
		expect(theme.name).toBe("Real Title");
		expect(theme.system.themebook).toBe("Magic");
		const title = theme.effects.find((e) => e.system?.isTitleTag);
		expect(title.name).toBe("Real Title");
		expect(theme.effects.filter((e) => e.type === "power_tag")).toHaveLength(1);
	});

	it("maps tracks and improve, clamping improve to 0-3", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.improve.value).toBe(1);
		expect(theme.system.quest.tracks.abandon.value).toBe(0);
		expect(theme.system.quest.tracks.milestone.value).toBe(2);
	});

	it("translates markup in the description, preferring story over description", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.description).toBe("A **brave** wanderer.");
	});

	it("translates markup in the quest description", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.quest.description).toBe("Never stop learning.");
	});

	it("resolves the theme level from the source type", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.level).toBe("origin");
	});

	it("uses the might-level icon for the theme image, not the source img", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.img).toBe("systems/litmv2/assets/media/icons/origin.svg");
	});

	it("derives the icon from the resolved level (adventure)", () => {
		const t = convertEmbeddedTheme({
			_id: "adv1",
			name: "Duty",
			type: "themebook",
			system: { type: "litm-adventure", powertags: [{ name: "a" }] },
		});
		expect(t.system.level).toBe("adventure");
		expect(t.img).toBe("systems/litmv2/assets/media/icons/adventure.svg");
	});

	it("maps specialImprovements, dropping empty and mapping active->isActive", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.specialImprovements).toHaveLength(1);
		expect(theme.system.specialImprovements[0]).toMatchObject({
			name: "Overchannel",
			isActive: true,
		});
	});

	it("translates markup in specialImprovements descriptions", () => {
		const theme = convertEmbeddedTheme(indexedTheme);
		expect(theme.system.specialImprovements[0].description).toBe("[parrying-2]");
	});

	it("also handles the array tag shape (system.powertags[])", () => {
		const arrayTheme = {
			_id: "t1",
			name: "A Good Longbow",
			type: "themebook",
			system: {
				powertags: [{ name: "full quiver" }, { name: "long range" }],
				weaknesstags: [{ name: "requires strength" }],
			},
		};
		const theme = convertEmbeddedTheme(arrayTheme);
		// "full quiver" (first named power tag) is promoted to the title;
		// "long range" remains as the one body power tag.
		expect(theme.name).toBe("full quiver");
		expect(theme.system.themebook).toBe("A Good Longbow");
		expect(theme.effects.filter((e) => e.type === "power_tag")).toHaveLength(2);
		expect(theme.effects.filter((e) => e.type === "weakness_tag")).toHaveLength(1);
		expect(["origin", "adventure", "greatness"]).toContain(theme.system.level);
	});

	it("clamps out-of-range improve to 0-3", () => {
		const t = convertEmbeddedTheme({
			_id: "c1",
			name: "X",
			type: "themebook",
			system: { improve: 9, powertags: [{ name: "a" }], weaknesstags: [] },
		});
		expect(t.system.improve.value).toBe(3);
	});
});

describe("resolveThemeLevel", () => {
	it("maps a bare category to its level (case-insensitive)", () => {
		expect(resolveThemeLevel("duty")).toBe("adventure");
		expect(resolveThemeLevel("DUTY")).toBe("adventure");
	});
	it("strips the litm- prefix and matches a level name directly", () => {
		expect(resolveThemeLevel("litm-origin")).toBe("origin");
	});
	it("falls back to a valid level for an unknown hint", () => {
		expect(["origin", "adventure", "greatness"]).toContain(
			resolveThemeLevel("nonsense-xyz"),
		);
	});
});
