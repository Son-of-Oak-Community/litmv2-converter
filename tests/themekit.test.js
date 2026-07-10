import { describe, expect, it } from "vitest";
import { convertThemekit } from "../scripts/core/converters/themekit.js";

const tag = (name) => ({ name, burned: false, toBurn: false, planned: false, selected: false });

const source = {
	_id: "kit1kit1kit1kit1",
	name: "A Light Against  the Dark",
	type: "themekit",
	img: "icons/svg/item-bag.svg",
	folder: "fldrfldrfldrfldr",
	system: {
		specialImprovements: [
			{ name: "Radiance", active: false, description: "Shine ([/s blinded-2])." },
			{ name: "", active: false, description: "" },
		],
		powertags: [tag("A Light Against  the Dark"), tag("a beacon of hope"), tag("abjure evildoers")],
		themekit_type: "DUTY",
		quest: "Hold high the sacred fire.",
		weaknesstags: [tag("betrayal")],
		description: "",
	},
};

describe("convertThemekit", () => {
	// "A Light Against the Dark" is folder-derivable (foldered under an "adventure"
	// level in the real source), so the slimmed THEMEKIT_INDEX no longer carries it —
	// at runtime its tier comes from kitHints (assemble-handoff.js), mocked here.
	const ctx = { kitHints: () => ({ level: "adventure", themebook: "Duty" }) };
	const out = convertThemekit(source, ctx);

	it("resolves tier + themebook from folder hints (index dropped this folder-derivable kit)", () => {
		expect(out.type).toBe("theme");
		expect(out.system.level).toBe("adventure");
		expect(out.system.themebook).toBe("Duty");
		expect(out.img).toBe("systems/litmv2/assets/media/icons/adventure.svg");
	});

	it("builds template-state effects: disabled tags, enabled title tag", () => {
		const title = out.effects.find((e) => e.system.isTitleTag);
		expect(title).toMatchObject({ name: "A Light Against  the Dark", type: "power_tag", disabled: false });
		const rest = out.effects.filter((e) => !e.system.isTitleTag);
		expect(rest.map((e) => [e.type, e.name, e.disabled])).toEqual([
			["power_tag", "a beacon of hope", true],
			["power_tag", "abjure evildoers", true],
			["weakness_tag", "betrayal", true],
		]);
	});

	it("maps quest and non-empty special improvements", () => {
		expect(out.system.quest.description).toBe("Hold high the sacred fire.");
		expect(out.system.specialImprovements).toEqual([
			{ name: "Radiance", description: "Shine ([blinded-2]).", isActive: false },
		]);
	});

	it("uses hints then defaults when the index misses", () => {
		const unknown = { ...source, _id: "kit2kit2kit2kit2", name: "Totally Homebrew Kit", system: { ...source.system, themekit_type: "" } };
		const hinted = convertThemekit(unknown, { kitHints: () => ({ level: "greatness", themebook: "Mastery" }) });
		expect(hinted.system.level).toBe("greatness");
		expect(hinted.system.themebook).toBe("Mastery");
		const bare = convertThemekit(unknown);
		expect(bare.system.level).toBe("origin");
		expect(bare.system.themebook).toBe("");
		const typed = { ...unknown, system: { ...unknown.system, themekit_type: "SKILL OR TRADE" } };
		expect(convertThemekit(typed).system.themebook).toBe("Skill or Trade");
		expect(convertThemekit(typed).system.level).toBe("origin");
	});
});
