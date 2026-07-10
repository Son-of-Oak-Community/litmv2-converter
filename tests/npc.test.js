import { describe, expect, it } from "vitest";
import { convertNpc } from "../scripts/core/converters/npc.js";

const source = {
	_id: "npc1npc1npc1npc1",
	name: "WICKER SENTINEL",
	type: "litm-npc",
	img: "systems/mist-engine-fvtt/assets/icons/icon-challenge.svg",
	folder: "fldrfldrfldrfldr",
	sort: 100000,
	prototypeToken: {
		name: "WICKER SENTINEL",
		disposition: -1,
		texture: { src: "systems/mist-engine-fvtt/assets/icons/icon-challenge.svg", fit: "contain" },
	},
	system: {
		biography: "",
		shortDescription: "A towering effigy of woven branches.",
		floatingTagsAndStatuses: [
			{ name: "flammable", value: 0, isStatus: false, burned: false, markings: [false, false, false, false, false, false] },
		],
		mightyAspects: [{ level: "adventure", aspect: "Guardian construct", mightIcon: "adventure" }],
		difficulty: 2,
		roles: ["Aggressor"],
		threatsAndConsequences: [
			{ name: "IGNITE", description: "Catch fire and spread it", list: ["Burn a bystander ([/s burned-2])"] },
		],
		limits: [{ name: "DESTROY", value: "2", consequence: "" }],
		secrets: [{ name: "True Nature", description: "It is [/s bound-2] to the glen." }],
		specialFeatures: [{ name: "Twisted (++)", description: "Increase [/n bind-or-banish] by 1." }],
		appliedAddons: [],
	},
	items: [],
	effects: [],
};

describe("convertNpc", () => {
	const out = convertNpc(source);

	it("maps identity, category, rating, and normalized name", () => {
		expect(out._id).toBe("npc1npc1npc1npc1");
		expect(out.type).toBe("challenge");
		expect(out.name).toBe("Wicker Sentinel");
		expect(out.folder).toBe("fldrfldrfldrfldr");
		expect(out.system.category).toBe("Aggressor");
		expect(out.system.rating).toBe(2);
	});

	it("remaps mist-engine system icons on actor and prototype token", () => {
		expect(out.img).toBe("icons/svg/mystery-man.svg");
		expect(out.prototypeToken.texture.src).toBe("icons/svg/mystery-man.svg");
		expect(out.prototypeToken.disposition).toBe(-1);
	});

	it("builds description with secrets as revealable sections, features, might, limits", () => {
		expect(out.system.description).toBe(
			'<p>A towering effigy of woven branches.</p><section class="secret" id="secret-npc1npc1npc1npc10"><h4>True Nature</h4><p>It is [bound-2] to the glen.</p></section>',
		);
		expect(out.system.specialFeatures).toBe("<h4>Twisted (++)</h4><p>Increase [bind-or-banish:] by 1.</p>");
		expect(out.system.might).toEqual([{ level: "adventure", description: "Guardian construct" }]);
		expect(out.system.limits).toEqual([{ label: "Destroy", outcome: "", max: 2, value: 0 }]);
	});

	it("ships tags string and effects consistently", () => {
		expect(out.system.tags).toBe("[flammable]");
		expect(out.effects).toEqual([
			{
				name: "flammable",
				type: "story_tag",
				disabled: false,
				system: { isScratched: false, isSingleUse: false, isHidden: false, limitId: null },
			},
		]);
	});

	it("converts threats to embedded vignettes", () => {
		expect(out.items).toEqual([
			{
				name: "Ignite",
				type: "vignette",
				img: "systems/litmv2/assets/media/icons/consequences.svg",
				system: { threat: "Catch fire and spread it", consequences: ["Burn a bystander ([burned-2])"], isConsequenceOnly: false },
			},
		]);
	});

	it("clamps rating into 1..5 and maps origin might to adventure", () => {
		const weird = convertNpc({
			...source,
			system: { ...source.system, difficulty: 0, mightyAspects: [{ level: "origin", aspect: "Old" }] },
		});
		expect(weird.system.rating).toBe(1);
		expect(weird.system.might).toEqual([{ level: "adventure", description: "Old" }]);
	});

	it("builds category from an array of roles (joined)", () => {
		const arrayRoles = convertNpc({ ...source, system: { ...source.system, roles: ["Aggressor", "Pursuer"] } });
		expect(arrayRoles.system.category).toBe("Aggressor, Pursuer");
	});

	it("builds category from a string roles value (real official data shape)", () => {
		const stringRoles = convertNpc({ ...source, system: { ...source.system, roles: "Aggressor, Pursuer" } });
		expect(stringRoles.system.category).toBe("Aggressor, Pursuer");
	});

	it("builds an empty category when roles is missing", () => {
		const missingRoles = convertNpc({ ...source, system: { ...source.system, roles: undefined } });
		expect(missingRoles.system.category).toBe("");
	});
});
