import { describe, expect, it } from "vitest";
import { convertThemebookItem } from "../scripts/core/converters/themebook.js";

const tag = (name) => ({ name, burned: false, toBurn: false, planned: false, selected: false });

const storyTheme = {
	_id: "sty1sty1sty1sty1",
	name: "A Sturdy Shield",
	type: "themebook",
	folder: "fldrfldrfldrfldr",
	system: {
		options: { isStoryTheme: true },
		powertags: [tag("broad cover"), tag("solid oak")],
		weaknesstags: [tag("heavy")],
		specialImprovements: [{ name: "", active: false, description: "" }],
		quest: "",
		description: "",
	},
};

const themebook = {
	_id: "tbk1tbk1tbk1tbk1",
	name: "Resolve",
	type: "themebook",
	folder: "fldrfldrfldrfldr",
	system: {
		options: {},
		type: "litm-greatness",
		powertags: [],
		weaknesstags: [],
		specialImprovements: [
			{ name: "Iron Will", active: false, description: "Once per session, ignore a [/s afraid-2]." },
		],
		quest: "",
		description: "<p>You cannot be broken.</p><ul><li><p>What steels you?</p></li></ul>",
	},
};

describe("convertThemebookItem — story themes", () => {
	const out = convertThemebookItem(storyTheme);
	it("becomes a story_theme item with enabled concrete tags and a title tag", () => {
		expect(out.type).toBe("story_theme");
		expect(out.system.level).toBe("origin");
		const title = out.effects.find((e) => e.system.isTitleTag);
		expect(title).toMatchObject({ name: "A Sturdy Shield", disabled: false });
		const rest = out.effects.filter((e) => !e.system.isTitleTag);
		expect(rest.map((e) => [e.type, e.name, e.disabled])).toEqual([
			["power_tag", "broad cover", false],
			["power_tag", "solid oak", false],
			["weakness_tag", "heavy", false],
		]);
	});
});

describe("convertThemebookItem — themebooks", () => {
	const out = convertThemebookItem(themebook);
	it("becomes a themebook item with the source tier (incl. variable) and prose questions", () => {
		expect(out.type).toBe("themebook");
		expect(out.system.theme_level).toBe("greatness");
		expect(out.img).toBe("systems/litmv2/assets/media/icons/greatness.svg");
		expect(out.system.description).toBe("<p>You cannot be broken.</p><ul><li><p>What steels you?</p></li></ul>");
		expect(out.system.specialImprovements).toEqual([
			{ name: "Iron Will", description: "Once per session, ignore a [afraid-2]." },
		]);
		expect(out.effects).toEqual([]);
	});
	it("supports the variable tier", () => {
		const v = convertThemebookItem({ ...themebook, system: { ...themebook.system, type: "litm-variable" } });
		expect(v.system.theme_level).toBe("variable");
		expect(v.img).toBe("systems/litmv2/assets/media/icons/variable.svg");
	});
});

describe("convertThemebookItem — questions, envisioning tags & quest ideas", () => {
	const source = {
		_id: "circ1circ1circ1c",
		name: "Circumstance",
		type: "themebook",
		folder: null,
		system: {
			options: {},
			type: "litm-origin",
			description: "<p>prose</p>",
			powertag1: { name: "", question: "What Circumstance?" },
			powertag2: { name: "", question: "What tools?" },
			weaknesstag1: { name: "", question: "Biggest challenge?" },
			specialImprovements: [],
		},
	};

	it("reads power/weakness tag questions from the source (fixed-length arrays)", () => {
		const out = convertThemebookItem(source);
		expect(out.system.powerTagQuestions).toHaveLength(10);
		expect(out.system.powerTagQuestions[0]).toBe("What Circumstance?");
		expect(out.system.powerTagQuestions[1]).toBe("What tools?");
		expect(out.system.weaknessTagQuestions).toHaveLength(4);
		expect(out.system.weaknessTagQuestions[0]).toBe("Biggest challenge?");
	});

	it("reads questions from the array tag shape too", () => {
		const arr = convertThemebookItem({
			...source,
			system: {
				...source.system,
				powertag1: undefined,
				powertags: [{ name: "", question: "Array power Q?" }],
				weaknesstags: [{ name: "", question: "Array weakness Q?" }],
			},
		});
		expect(arr.system.powerTagQuestions[0]).toBe("Array power Q?");
		expect(arr.system.weaknessTagQuestions[0]).toBe("Array weakness Q?");
	});

	it("reads envisioning tags and quest ideas from ctx.themebookFields", () => {
		const ctx = { themebookFields: { circumstance: { envisioningTags: ["Grit"], questIdeas: ["Endure."] } } };
		const out = convertThemebookItem(source, ctx);
		expect(out.system.envisioningTags).toEqual(["Grit"]);
		expect(out.system.questIdeas).toEqual(["Endure."]);
	});

	it("defaults envisioning/quest to empty when ctx omits the type", () => {
		expect(convertThemebookItem(source).system.envisioningTags).toEqual([]);
		expect(convertThemebookItem(source).system.questIdeas).toEqual([]);
	});

	it("marks a regular themebook as not a Fellowship", () => {
		expect(convertThemebookItem(source).system.isFellowship).toBe(false);
	});

	it("defaults envisioning/quest data for an unknown themebook name", () => {
		const unk = convertThemebookItem({ ...source, name: "Nonexistent Book" });
		expect(unk.system.envisioningTags).toEqual([]);
		expect(unk.system.questIdeas).toEqual([]);
	});
});
