import { describe, expect, it } from "vitest";
import { convertShortChallenge, vignetteData } from "../scripts/core/converters/vignette.js";

const source = {
	_id: "sc1sc1sc1sc1sc1s",
	name: "ANGRY MOB",
	type: "shortchallenge",
	folder: "fldrfldrfldrfldr",
	system: {
		description: "",
		shortDescription: "A mob of [/s angry-3] locals gathers.",
		list: ["You are singled out ([/s marked-1]).", "They drive you away ([/b Blocked])."],
	},
};

describe("convertShortChallenge", () => {
	it("converts to a litmv2 vignette with translated markup", () => {
		const out = convertShortChallenge(source);
		expect(out).toEqual({
			_id: "sc1sc1sc1sc1sc1s",
			name: "Angry Mob",
			type: "vignette",
			img: "systems/litmv2/assets/media/icons/consequences.svg",
			folder: "fldrfldrfldrfldr",
			system: {
				threat: "A mob of [angry-3] locals gathers.",
				consequences: ["You are singled out ([marked-1]).", "They drive you away (**Blocked**)."],
				isConsequenceOnly: false,
			},
		});
	});
	it("honors general-consequence overrides", () => {
		const out = convertShortChallenge(source, {}, { isConsequenceOnly: true, name: "My Journey General Consequences" });
		expect(out.name).toBe("My Journey General Consequences");
		expect(out.system.isConsequenceOnly).toBe(true);
	});
	it("falls back to description when shortDescription is empty", () => {
		const src = { ...source, system: { ...source.system, shortDescription: "", description: "fallback" } };
		expect(convertShortChallenge(src).system.threat).toBe("fallback");
	});
});

describe("vignetteData", () => {
	it("builds embedded vignette data without an id", () => {
		const out = vignetteData({ name: "IGNITE ITSELF", threat: "Shamble toward the fire", consequences: ["c1"] });
		expect(out).toEqual({
			name: "Ignite Itself",
			type: "vignette",
			img: "systems/litmv2/assets/media/icons/consequences.svg",
			system: { threat: "Shamble toward the fire", consequences: ["c1"], isConsequenceOnly: false },
		});
	});
});
