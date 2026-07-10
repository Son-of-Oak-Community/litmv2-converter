import { describe, expect, it } from "vitest";
import { convertJourney } from "../scripts/core/converters/journey.js";

const source = {
	_id: "jrn1jrn1jrn1jrn1",
	name: "ACROSS THE FELLS",
	type: "litm-journey",
	img: "modules/legend-in-the-mist-core-book/assets/journeys/tokens/fells.webp",
	folder: "fldrfldrfldrfldr",
	sort: 200000,
	prototypeToken: { name: "ACROSS THE FELLS", texture: { src: "modules/legend-in-the-mist-core-book/assets/journeys/tokens/fells.webp" } },
	system: {
		biography: "",
		shortDescription: "Endless windswept expanse.",
		customBackground: "modules/legend-in-the-mist-core-book/assets/journeys/fells.webp",
		customFontColor: "#ffffff",
		floatingTagsAndStatuses: [],
		tags: "[roving clans], [treacherous cliffs]",
		role: "Journey - Landscape",
		generalConsequences: [],
		notes: "",
	},
	items: [
		{
			_id: "gcgcgcgcgcgcgcgc",
			name: "GENERAL CONSEQUENCES",
			type: "shortchallenge",
			system: { shortDescription: "", list: ["You are struck ([/s wounded-3])."], description: "" },
		},
		{
			_id: "vgn1vgn1vgn1vgn1",
			name: "BLISTERING WINDS",
			type: "shortchallenge",
			system: { shortDescription: "Cutting winds.", list: ["Exposed ([/s freezing-2])."], description: "" },
		},
	],
	effects: [],
};

describe("convertJourney", () => {
	const out = convertJourney(source);

	it("maps identity and category from the role suffix", () => {
		expect(out).toMatchObject({ _id: "jrn1jrn1jrn1jrn1", type: "journey", name: "Across the Fells" });
		expect(out.system.category).toBe("Landscape");
		expect(out.img).toBe("modules/legend-in-the-mist-core-book/assets/journeys/tokens/fells.webp");
	});

	it("copies the tag string and materializes matching effects", () => {
		expect(out.system.tags).toBe("[roving clans], [treacherous cliffs]");
		expect(out.effects.map((e) => [e.type, e.name])).toEqual([
			["story_tag", "roving clans"],
			["story_tag", "treacherous cliffs"],
		]);
	});

	it("converts embedded shortchallenges to vignettes, wiring general consequences", () => {
		expect(out.system.generalConsequences).toBe("gcgcgcgcgcgcgcgc");
		const gc = out.items.find((i) => i._id === "gcgcgcgcgcgcgcgc");
		expect(gc.name).toBe("Across the Fells General Consequences");
		expect(gc.system.isConsequenceOnly).toBe(true);
		const wind = out.items.find((i) => i._id === "vgn1vgn1vgn1vgn1");
		expect(wind).toMatchObject({
			name: "Blistering Winds",
			type: "vignette",
			system: { threat: "Cutting winds.", consequences: ["Exposed ([freezing-2])."], isConsequenceOnly: false },
		});
	});

	it("drops mist-engine presentation fields", () => {
		expect(out.system.customBackground).toBeUndefined();
		expect(out.system.customFontColor).toBeUndefined();
	});

	it("translates mist markup in the source tags string before using it for both tags and effects", () => {
		const markedUp = {
			...source,
			system: { ...source.system, tags: "[quiet chill], [/s mysterious-2]" },
		};
		const result = convertJourney(markedUp);
		expect(result.system.tags).toBe("[quiet chill], [mysterious-2]");
		expect(result.effects.map((e) => [e.type, e.name])).toEqual([
			["story_tag", "quiet chill"],
			["status_tag", "mysterious"],
		]);
	});
});
